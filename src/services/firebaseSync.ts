// Đồng bộ bằng Firebase: Auth ẩn danh + Firestore + Cloud Functions (đổi mã kết nối).
//
// Cấu trúc trên máy chủ (xem firestore.rules):
//   families/{familyId}                 { ownerUid, uids[], settings, createdAt }
//   families/{familyId}/members|caregivers|medications|appointments/{id}
//   families/{familyId}/doseLogs|checkins|bpReadings|sosEvents/{id}
//   families/{familyId}/heartbeats/{memberId}   { at, battery }
//   families/{familyId}/devices/{uid}           { role, memberId, pushToken, platform }
//   pairingCodes/{code}                 { familyId, memberId, expiresAt, createdBy }
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  updateDoc,
  connectFirestoreEmulator,
  doc,
  type Firestore,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { connectFunctionsEmulator, type Functions, getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';
import { createPairing } from '../domain/pairing';
import {
  COLLECTIONS,
  CONFIG_COLLECTIONS,
  EVENT_COLLECTIONS,
  EVENT_DAYS,
  type RemoteSnapshot,
  type SyncWrite,
} from '../domain/syncdiff';
import type { Pairing, Role } from '../domain/types';
import { SyncError, type DeviceInfo, type FamilyDevice, type FamilySync, type JoinRequest, type RedeemError } from './sync';

/** Cấu hình lấy từ biến môi trường EXPO_PUBLIC_FIREBASE_* (file .env, xem .env.example). */
export function firebaseConfig(): FirebaseOptions | undefined {
  // Phải viết đầy đủ process.env.EXPO_PUBLIC_... thì Expo mới nhúng giá trị vào app lúc đóng gói.
  const cfg: FirebaseOptions = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  return cfg.apiKey && cfg.projectId && cfg.appId ? cfg : undefined;
}

const REGION = process.env.EXPO_PUBLIC_FIREBASE_REGION || 'asia-southeast1';
/** Ví dụ "192.168.1.10" để chạy với Firebase Emulator trên máy tính. */
const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;

// getReactNativePersistence chỉ có trong bản React Native của firebase/auth (kiểu TS mặc định không có).
type RNAuth = typeof FirebaseAuth & {
  getReactNativePersistence?: (s: typeof AsyncStorage) => FirebaseAuth.Persistence;
};

/** Firestore chỉ nhận ghi tối đa 500 thao tác mỗi lần. */
const BATCH_LIMIT = 450;

export class FirebaseSync implements FamilySync {
  private auth: FirebaseAuth.Auth;
  private db: Firestore;
  private fns: Functions;

  constructor(options: FirebaseOptions) {
    const first = getApps().length === 0;
    const app = first ? initializeApp(options) : getApp();
    const A = FirebaseAuth as RNAuth;
    if (first && Platform.OS !== 'web' && A.getReactNativePersistence) {
      this.auth = A.initializeAuth(app, { persistence: A.getReactNativePersistence(AsyncStorage) });
    } else {
      this.auth = A.getAuth(app);
    }
    this.db = first
      ? initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true })
      : getFirestore(app);
    this.fns = getFunctions(app, REGION);
    if (first && EMULATOR_HOST) {
      A.connectAuthEmulator(this.auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(this.db, EMULATOR_HOST, 8080);
      connectFunctionsEmulator(this.fns, EMULATOR_HOST, 5001);
    }
  }

  async signIn(): Promise<string> {
    await this.auth.authStateReady();
    const user = this.auth.currentUser ?? (await FirebaseAuth.signInAnonymously(this.auth)).user;
    return user.uid;
  }

  async createFamily(): Promise<string> {
    const uid = await this.signIn();
    const ref = doc(collection(this.db, 'families'));
    await setDoc(ref, { ownerUid: uid, uids: [uid], createdAt: serverTimestamp() });
    return ref.id;
  }

  async createPairingCode(familyId: string, memberId: string, role: Role = 'parent'): Promise<Pairing> {
    const uid = await this.signIn();
    // Mã trùng với mã đang có thì máy chủ từ chối (luật chỉ cho tạo mới) → thử mã khác.
    for (let i = 0; i < 5; i++) {
      const p = createPairing(memberId, new Date());
      try {
        await setDoc(doc(this.db, 'pairingCodes', p.code), {
          familyId,
          memberId,
          role,
          expiresAt: p.expiresAt,
          expiresAtMs: new Date(p.expiresAt).getTime(),
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
        return p;
      } catch (e) {
        if ((e as { code?: string }).code !== 'permission-denied' || i === 4) throw e;
      }
    }
    throw new Error('Không tạo được mã kết nối');
  }

  async requestJoin(code: string): Promise<{ familyId: string; memberId: string; role: Role }> {
    const c = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(c)) throw new SyncError('format');
    const uid = await this.signIn();
    let info: { familyId: string; memberId: string; expiresAtMs: number; role?: Role } | undefined;
    try {
      const snap = await getDoc(doc(this.db, 'pairingCodes', c));
      info = snap.data() as typeof info;
    } catch (e) {
      // Mã hết hạn thì luật không cho đọc → báo như mã sai/hết hạn, không phải lỗi mạng.
      if ((e as { code?: string }).code === 'permission-denied') throw new SyncError('wrong');
      throw new SyncError('network', (e as Error).message);
    }
    if (!info) throw new SyncError('wrong');
    if (info.expiresAtMs < Date.now()) throw new SyncError('expired');
    try {
      await setDoc(doc(this.db, 'families', info.familyId, 'joinRequests', uid), {
        uid,
        code: c,
        memberId: info.memberId,
        role: info.role ?? 'parent',
        status: 'pending',
        device: Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Điện thoại Android' : 'Trình duyệt',
        at: new Date().toISOString(),
      });
    } catch (e) {
      throw new SyncError((e as { code?: string }).code === 'permission-denied' ? 'expired' : 'network', (e as Error).message);
    }
    return { familyId: info.familyId, memberId: info.memberId, role: info.role ?? 'parent' };
  }

  async linkedEmail(): Promise<string | undefined> {
    await this.signIn();
    return this.auth.currentUser?.email ?? undefined;
  }

  async linkEmail(email: string, password: string): Promise<void> {
    await this.signIn();
    const user = this.auth.currentUser!;
    await FirebaseAuth.linkWithCredential(user, FirebaseAuth.EmailAuthProvider.credential(email.trim(), password));
  }

  async restoreWithEmail(email: string, password: string) {
    // Đăng nhập lại đúng tài khoản cũ (cùng mã người dùng) nên vẫn còn trong gia đình.
    await this.auth.authStateReady();
    const cred = await FirebaseAuth.signInWithEmailAndPassword(this.auth, email.trim(), password);
    const uid = cred.user.uid;
    const qs = await getDocs(query(collection(this.db, 'families'), where('uids', 'array-contains', uid), limit(1)));
    const fam = qs.docs[0];
    if (!fam) return undefined;
    const dev = (await getDoc(doc(this.db, 'families', fam.id, 'devices', uid))).data() as { role?: Role; memberId?: string } | undefined;
    return { familyId: fam.id, role: dev?.role ?? 'child', memberId: dev?.memberId };
  }

  watchJoinRequest(familyId: string, onStatus: (s: JoinRequest['status'] | 'gone') => void): () => void {
    let unsub = () => undefined as void;
    let stopped = false;
    void this.signIn().then((uid) => {
      if (stopped) return;
      unsub = onSnapshot(
        doc(this.db, 'families', familyId, 'joinRequests', uid),
        (s) => onStatus(s.exists() ? (s.data() as JoinRequest).status : 'gone'),
        (e) => console.warn('[An Tâm] Không theo dõi được yêu cầu kết nối:', e.message),
      );
    });
    return () => {
      stopped = true;
      unsub();
    };
  }

  subscribeJoinRequests(familyId: string, onList: (list: JoinRequest[]) => void): () => void {
    return onSnapshot(
      query(collection(this.db, 'families', familyId, 'joinRequests'), where('status', '==', 'pending')),
      (qs) => onList(qs.docs.map((d) => d.data() as JoinRequest)),
      (e) => console.warn('[An Tâm] Không nghe được yêu cầu kết nối:', e.message),
    );
  }

  async decideJoin(familyId: string, req: JoinRequest, approve: boolean): Promise<void> {
    const uid = await this.signIn();
    const fam = doc(this.db, 'families', familyId);
    // Thêm vào gia đình trước (luật kiểm tra máy đó đã gửi yêu cầu), rồi mới ghi kết quả.
    if (approve) await updateDoc(fam, { uids: arrayUnion(req.uid) });
    await updateDoc(doc(fam, 'joinRequests', req.uid), { status: approve ? 'approved' : 'denied', decidedBy: uid, decidedAt: new Date().toISOString() });
    if (approve) await deleteDoc(doc(this.db, 'pairingCodes', req.code)).catch(() => undefined);
  }

  async deleteFamily(familyId: string): Promise<void> {
    await this.signIn();
    const fam = doc(this.db, 'families', familyId);
    const refs = [];
    for (const coll of [...COLLECTIONS, 'heartbeats', 'joinRequests', 'devices']) {
      const qs = await getDocs(collection(fam, coll));
      refs.push(...qs.docs.map((d) => d.ref));
    }
    const codes = await getDocs(query(collection(this.db, 'pairingCodes'), where('familyId', '==', familyId)));
    refs.push(...codes.docs.map((d) => d.ref));
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      for (const r of refs.slice(i, i + BATCH_LIMIT)) batch.delete(r);
      await batch.commit();
    }
    // Xóa hồ sơ gia đình sau cùng (cần còn là thành viên để xóa các phần trên).
    await deleteDoc(fam);
  }

  async listDevices(familyId: string): Promise<FamilyDevice[]> {
    const me = await this.signIn();
    const fam = (await getDoc(doc(this.db, 'families', familyId))).data() as { uids: string[]; ownerUid: string };
    const devs = await getDocs(collection(this.db, 'families', familyId, 'devices'));
    const info = new Map(devs.docs.map((d) => [d.id, d.data() as DeviceInfo]));
    return fam.uids.map((uid) => ({
      uid,
      role: info.get(uid)?.role,
      memberId: info.get(uid)?.memberId,
      platform: info.get(uid)?.platform,
      owner: uid === fam.ownerUid,
      me: uid === me,
    }));
  }

  async removeDevice(familyId: string, uid: string): Promise<void> {
    await this.signIn();
    await deleteDoc(doc(this.db, 'families', familyId, 'devices', uid)).catch(() => undefined);
    await updateDoc(doc(this.db, 'families', familyId), { uids: arrayRemove(uid) });
  }

  async transferOwner(familyId: string, uid: string): Promise<void> {
    await this.signIn();
    await updateDoc(doc(this.db, 'families', familyId), { ownerUid: uid });
  }

  async childPushTokens(familyId: string): Promise<string[]> {
    const qs = await getDocs(query(collection(this.db, 'families', familyId, 'devices'), where('role', '==', 'child')));
    return qs.docs.map((d) => d.get('pushToken') as string | undefined).filter((t): t is string => !!t);
  }

  async apply(familyId: string, writes: SyncWrite[]): Promise<void> {
    if (!writes.length) return;
    const fam = doc(this.db, 'families', familyId);
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      for (const w of writes.slice(i, i + BATCH_LIMIT)) {
        if (w.op === 'settings') batch.set(fam, { settings: w.data }, { merge: true });
        else if (w.op === 'set') batch.set(doc(fam, w.coll, w.id), w.data);
        else batch.delete(doc(fam, w.coll, w.id));
      }
      await batch.commit();
    }
  }

  async heartbeat(familyId: string, memberId: string, battery?: number): Promise<void> {
    const uid = await this.signIn();
    await setDoc(doc(this.db, 'families', familyId, 'heartbeats', memberId), {
      at: new Date().toISOString(),
      battery,
      uid,
    });
  }

  async registerDevice(familyId: string, info: DeviceInfo): Promise<void> {
    const uid = await this.signIn();
    await setDoc(
      doc(this.db, 'families', familyId, 'devices', uid),
      { ...info, platform: info.platform ?? Platform.OS, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  subscribe(
    familyId: string,
    onData: (snap: RemoteSnapshot, pending: boolean) => void,
    onError?: (e: Error) => void,
  ): () => void {
    const fam = doc(this.db, 'families', familyId);
    const err = (e: Error) => onError?.(e);
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        fam,
        (s) => {
          const settings = s.data()?.settings;
          if (settings) onData({ settings }, s.metadata.hasPendingWrites);
        },
        err,
      ),
    );
    for (const coll of CONFIG_COLLECTIONS) {
      unsubs.push(
        onSnapshot(
          collection(fam, coll),
          (qs) => onData({ [coll]: qs.docs.map((d) => d.data()) } as RemoteSnapshot, qs.metadata.hasPendingWrites),
          err,
        ),
      );
    }
    const since = new Date(Date.now() - EVENT_DAYS * 86400_000).toISOString();
    for (const coll of EVENT_COLLECTIONS) {
      unsubs.push(
        onSnapshot(
          query(collection(fam, coll), where('at', '>=', since)),
          (qs) => onData({ [coll]: qs.docs.map((d) => d.data()) } as RemoteSnapshot, qs.metadata.hasPendingWrites),
          err,
        ),
      );
    }
    unsubs.push(
      onSnapshot(
        collection(fam, 'heartbeats'),
        (qs) => {
          const heartbeats: NonNullable<RemoteSnapshot['heartbeats']> = {};
          for (const d of qs.docs) {
            const v = d.data() as { at: string; battery?: number };
            heartbeats[d.id] = { at: v.at, battery: v.battery };
          }
          onData({ heartbeats }, qs.metadata.hasPendingWrites);
        },
        err,
      ),
    );
    return () => unsubs.forEach((u) => u());
  }
}

/** Đổi mã lỗi của Cloud Functions sang lý do hiển thị cho bố mẹ. */
export function redeemReason(code: string | undefined): RedeemError {
  switch (code) {
    case 'functions/invalid-argument':
      return 'format';
    case 'functions/not-found':
      return 'wrong';
    case 'functions/failed-precondition':
      return 'expired';
    case 'functions/resource-exhausted':
      return 'too-many';
    default:
      return 'network';
  }
}

let instance: FirebaseSync | undefined;

/** Bản đồng bộ dùng trong app, hoặc undefined khi chưa cấu hình Firebase (chạy một máy). */
export function getFamilySync(): FamilySync | undefined {
  if (instance) return instance;
  const cfg = firebaseConfig();
  if (!cfg) return undefined;
  instance = new FirebaseSync(cfg);
  return instance;
}
