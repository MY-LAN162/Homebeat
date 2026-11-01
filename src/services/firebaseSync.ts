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
  collection,
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
import { connectFunctionsEmulator, type Functions, getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { createPairing } from '../domain/pairing';
import {
  CONFIG_COLLECTIONS,
  EVENT_COLLECTIONS,
  EVENT_DAYS,
  type RemoteSnapshot,
  type SyncWrite,
} from '../domain/syncdiff';
import type { Pairing } from '../domain/types';
import { SyncError, type DeviceInfo, type FamilySync, type RedeemError } from './sync';

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

  async createPairingCode(familyId: string, memberId: string): Promise<Pairing> {
    const uid = await this.signIn();
    // Mã trùng với mã đang có thì máy chủ từ chối (luật chỉ cho tạo mới) → thử mã khác.
    for (let i = 0; i < 5; i++) {
      const p = createPairing(memberId, new Date());
      try {
        await setDoc(doc(this.db, 'pairingCodes', p.code), {
          familyId,
          memberId,
          expiresAt: p.expiresAt,
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

  async redeemPairingCode(code: string): Promise<{ familyId: string; memberId: string }> {
    await this.signIn();
    try {
      const fn = httpsCallable<{ code: string }, { familyId: string; memberId: string }>(this.fns, 'redeemPairingCode');
      return (await fn({ code })).data;
    } catch (e) {
      throw new SyncError(redeemReason((e as { code?: string }).code), (e as Error).message);
    }
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
