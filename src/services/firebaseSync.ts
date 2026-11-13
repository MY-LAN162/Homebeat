// Đồng bộ bằng Firebase: Auth (ẩn danh, email) + Firestore. Gọi Firebase qua lớp chuyển đổi ./fbsdk:
// web dùng thư viện JavaScript, điện thoại dùng React Native Firebase (có App Check).
//
// Cấu trúc trên máy chủ (xem firestore.rules):
//   families/{familyId}                 { ownerUid, uids[], settings, createdAt }
//   families/{familyId}/members|caregivers|medications|appointments/{id}
//   families/{familyId}/doseLogs|checkins|bpReadings|sosEvents/{id}
//   families/{familyId}/heartbeats/{memberId}   { at, battery }
//   families/{familyId}/devices/{uid}           { role, memberId, pushToken, platform }
//   pairingCodes/{code}                 { familyId, memberId, expiresAt, createdBy }
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { CHILD_PAIRING_HOURS, createPairing, PAIRING_HOURS } from '../domain/pairing';
import {
  COLLECTIONS,
  CONFIG_COLLECTIONS,
  EVENT_COLLECTIONS,
  EVENT_DAYS,
  type RemoteSnapshot,
  type SyncWrite,
} from '../domain/syncdiff';
import { makeRefCode, type Billing, type ReferralUse } from '../domain/billing';
import type { AlertSettings, AppData, Pairing, Role } from '../domain/types';
import * as fb from './fbsdk';
import { SyncError, type DeviceInfo, type FamilyDevice, type FamilySync, type JoinRequest } from './sync';

/** Firestore chỉ nhận ghi tối đa 500 thao tác mỗi lần. */
const BATCH_LIMIT = 450;

export class FirebaseSync implements FamilySync {
  private auth: fb.FbAuth;
  private db: fb.FbDb;

  constructor(core: { auth: fb.FbAuth; db: fb.FbDb }) {
    this.auth = core.auth;
    this.db = core.db;
  }

  async signIn(): Promise<string> {
    await this.auth.authStateReady();
    const user = this.auth.currentUser ?? (await fb.signInAnonymously(this.auth)).user;
    return user.uid;
  }

  async createFamily(): Promise<string> {
    const uid = await this.signIn();
    const ref = fb.doc(fb.collection(this.db, 'families'));
    await fb.setDoc(ref, { ownerUid: uid, uids: [uid], createdAt: fb.serverTimestamp() });
    return ref.id;
  }

  async createPairingCode(familyId: string, memberId: string, role: Role = 'parent'): Promise<Pairing> {
    const uid = await this.signIn();
    // Mã trùng với mã đang có thì máy chủ từ chối (luật chỉ cho tạo mới) → thử mã khác.
    for (let i = 0; i < 5; i++) {
      const p = createPairing(memberId, new Date(), secureRandom, role === 'child' ? CHILD_PAIRING_HOURS : PAIRING_HOURS);
      try {
        await fb.setDoc(fb.doc(this.db, 'pairingCodes', p.code), {
          familyId,
          memberId,
          role,
          expiresAt: p.expiresAt,
          expiresAtMs: new Date(p.expiresAt).getTime(),
          createdBy: uid,
          createdAt: fb.serverTimestamp(),
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
      const snap = await fb.getDoc(fb.doc(this.db, 'pairingCodes', c));
      info = snap.data() as typeof info;
    } catch (e) {
      console.warn('[An Tâm] Không đọc được mã kết nối:', (e as { code?: string }).code, (e as Error).message);
      // Mã hết hạn thì luật không cho đọc → báo như mã sai/hết hạn, không phải lỗi mạng.
      if ((e as { code?: string }).code === 'permission-denied') throw new SyncError('wrong');
      throw new SyncError('network', (e as Error).message);
    }
    if (!info) {
      console.warn('[An Tâm] Không có mã kết nối này trên máy chủ:', c);
      throw new SyncError('wrong');
    }
    if (info.expiresAtMs < Date.now()) throw new SyncError('expired');
    try {
      await fb.setDoc(fb.doc(this.db, 'families', info.familyId, 'joinRequests', uid), {
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
    await fb.linkWithCredential(user, fb.EmailAuthProvider.credential(email.trim(), password));
  }

  async restoreWithEmail(email: string, password: string) {
    // Đăng nhập lại đúng tài khoản cũ (cùng mã người dùng) nên vẫn còn trong gia đình.
    await this.auth.authStateReady();
    const cred = await fb.signInWithEmailAndPassword(this.auth, email.trim(), password);
    const uid = cred.user.uid;
    const qs = await fb.getDocs(fb.query(fb.collection(this.db, 'families'), fb.where('uids', 'array-contains', uid), fb.limit(1)));
    const fam = qs.docs[0];
    if (!fam) return undefined;
    const dev = (await fb.getDoc(fb.doc(this.db, 'families', fam.id, 'devices', uid))).data() as { role?: Role; memberId?: string } | undefined;
    return { familyId: fam.id, role: dev?.role ?? 'child', memberId: dev?.memberId };
  }

  watchJoinRequest(familyId: string, onStatus: (s: JoinRequest['status'] | 'gone') => void): () => void {
    let unsub = () => undefined as void;
    let stopped = false;
    void this.signIn().then((uid) => {
      if (stopped) return;
      unsub = fb.onSnapshot(
        fb.doc(this.db, 'families', familyId, 'joinRequests', uid),
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
    return fb.onSnapshot(
      fb.query(fb.collection(this.db, 'families', familyId, 'joinRequests'), fb.where('status', '==', 'pending')),
      (qs) => onList(qs.docs.map((d) => d.data() as JoinRequest)),
      (e) => console.warn('[An Tâm] Không nghe được yêu cầu kết nối:', e.message),
    );
  }

  async decideJoin(familyId: string, req: JoinRequest, approve: boolean): Promise<void> {
    const uid = await this.signIn();
    const fam = fb.doc(this.db, 'families', familyId);
    // Ghi "Đồng ý" và thêm vào gia đình trong CÙNG một lần ghi: máy mới thấy "đã đồng ý" là đã vào được ngay
    // (luật chỉ cho thêm máy có yêu cầu đã được Đồng ý).
    const batch = fb.writeBatch(this.db);
    batch.update(fb.doc(fam, 'joinRequests', req.uid), { status: approve ? 'approved' : 'denied', decidedBy: uid, decidedAt: new Date().toISOString() });
    if (approve) batch.update(fam, { uids: fb.arrayUnion(req.uid) });
    await batch.commit();
    // Mã đã dùng (dù Đồng ý hay Từ chối) thì xóa, không ai dùng lại được.
    await fb.deleteDoc(fb.doc(this.db, 'pairingCodes', req.code)).catch(() => undefined);
  }

  async deleteFamily(familyId: string): Promise<void> {
    await this.signIn();
    const fam = fb.doc(this.db, 'families', familyId);
    const refs = [];
    for (const coll of [...COLLECTIONS, 'heartbeats', 'joinRequests', 'devices']) {
      const qs = await fb.getDocs(fb.collection(fam, coll));
      refs.push(...qs.docs.map((d) => d.ref));
    }
    const codes = await fb.getDocs(fb.query(fb.collection(this.db, 'pairingCodes'), fb.where('familyId', '==', familyId)));
    refs.push(...codes.docs.map((d) => d.ref));
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = fb.writeBatch(this.db);
      for (const r of refs.slice(i, i + BATCH_LIMIT)) batch.delete(r);
      await batch.commit();
    }
    // Xóa hồ sơ gia đình sau cùng (cần còn là thành viên để xóa các phần trên).
    await fb.deleteDoc(fam);
  }

  async listDevices(familyId: string): Promise<FamilyDevice[]> {
    const me = await this.signIn();
    const fam = (await fb.getDoc(fb.doc(this.db, 'families', familyId))).data() as { uids: string[]; ownerUid: string };
    const devs = await fb.getDocs(fb.collection(this.db, 'families', familyId, 'devices'));
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
    await fb.deleteDoc(fb.doc(this.db, 'families', familyId, 'devices', uid)).catch(() => undefined);
    await fb.updateDoc(fb.doc(this.db, 'families', familyId), { uids: fb.arrayRemove(uid) });
    // Xóa yêu cầu cũ để máy đó (nếu là máy đổi chủ, cài lại) xin vào lại được bằng mã mới.
    await fb.deleteDoc(fb.doc(this.db, 'families', familyId, 'joinRequests', uid)).catch(() => undefined);
  }

  async transferOwner(familyId: string, uid: string): Promise<void> {
    await this.signIn();
    await fb.updateDoc(fb.doc(this.db, 'families', familyId), { ownerUid: uid });
  }

  async childPushTokens(familyId: string): Promise<string[]> {
    const qs = await fb.getDocs(fb.query(fb.collection(this.db, 'families', familyId, 'devices'), fb.where('role', '==', 'child')));
    return qs.docs.map((d) => d.get('pushToken') as string | undefined).filter((t): t is string => !!t);
  }

  async parentPushTokens(familyId: string, memberId: string): Promise<string[]> {
    const qs = await fb.getDocs(
      fb.query(fb.collection(this.db, 'families', familyId, 'devices'), fb.where('role', '==', 'parent'), fb.where('memberId', '==', memberId)),
    );
    return qs.docs.map((d) => d.get('pushToken') as string | undefined).filter((t): t is string => !!t);
  }

  async apply(familyId: string, writes: SyncWrite[]): Promise<void> {
    if (!writes.length) return;
    const fam = fb.doc(this.db, 'families', familyId);
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const part = writes.slice(i, i + BATCH_LIMIT);
      const batch = fb.writeBatch(this.db);
      for (const w of part) {
        if (w.op === 'settings') batch.update(fam, settingsPatch(w.data, w.removed));
        else if (w.op === 'set') batch.set(fb.doc(fam, w.coll, w.id), w.data);
        else if (w.op === 'update') batch.update(fb.doc(fam, w.coll, w.id), fieldPatch(w.data, w.removed));
        else batch.delete(fb.doc(fam, w.coll, w.id));
      }
      try {
        await batch.commit();
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== 'permission-denied' && code !== 'not-found') throw e;
        // Một tài liệu bị máy chủ từ chối thì cả lượt bị từ chối. Gửi lại từng cái một, bỏ qua cái bị từ chối,
        // để SOS, uống thuốc... vẫn lên được. Cái bị từ chối sẽ được máy chủ trả về bản đúng.
        let rejected = 0;
        for (const w of part) {
          try {
            if (w.op === 'settings') await fb.updateDoc(fam, settingsPatch(w.data, w.removed));
            else if (w.op === 'set') await fb.setDoc(fb.doc(fam, w.coll, w.id), w.data);
            else if (w.op === 'update') await fb.updateDoc(fb.doc(fam, w.coll, w.id), fieldPatch(w.data, w.removed));
            else await fb.deleteDoc(fb.doc(fam, w.coll, w.id));
          } catch (err) {
            // not-found: tài liệu đã bị máy khác xóa → không tạo lại.
            const c = (err as { code?: string }).code;
            if (c !== 'permission-denied' && c !== 'not-found') throw err;
            rejected++;
            console.warn(`[An Tâm] Máy chủ không nhận ${w.op === 'settings' ? 'cài đặt' : `${w.coll}/${w.id}`}`);
          }
        }
        if (rejected === part.length) throw e;
      }
    }
  }

  async heartbeat(familyId: string, memberId: string, battery?: number, notifOff?: boolean): Promise<void> {
    const uid = await this.signIn();
    await fb.setDoc(fb.doc(this.db, 'families', familyId, 'heartbeats', memberId), {
      at: new Date().toISOString(),
      battery,
      uid,
      ...(notifOff !== undefined ? { notifOff } : {}),
    });
  }

  async readHeartbeats(familyId: string): Promise<Record<string, { at: string; battery?: number; notifOff?: boolean }>> {
    await this.signIn();
    const qs = await fb.getDocs(fb.collection(this.db, 'families', familyId, 'heartbeats'));
    const out: Record<string, { at: string; battery?: number; notifOff?: boolean }> = {};
    for (const d of qs.docs) {
      const v = d.data() as { at: string; battery?: number; notifOff?: boolean };
      out[d.id] = { at: v.at, battery: v.battery, notifOff: v.notifOff };
    }
    return out;
  }

  async readSchedule(familyId: string) {
    await this.signIn();
    const fam = fb.doc(this.db, 'families', familyId);
    const [f, qs, ap] = await Promise.all([fb.getDoc(fam), fb.getDocs(fb.collection(fam, 'medications')), fb.getDocs(fb.collection(fam, 'appointments'))]);
    return {
      medications: qs.docs.map((d) => d.data()) as AppData['medications'],
      appointments: ap.docs.map((d) => d.data()) as AppData['appointments'],
      settings: f.data()?.settings as AlertSettings | undefined,
    };
  }

  async readEvents(familyId: string, sinceIso: string) {
    await this.signIn();
    const fam = fb.doc(this.db, 'families', familyId);
    const read = async (c: string) => (await fb.getDocs(fb.query(fb.collection(fam, c), fb.where('at', '>=', sinceIso)))).docs.map((d) => d.data());
    const [doseLogs, checkins, bpReadings] = await Promise.all([read('doseLogs'), read('checkins'), read('bpReadings')]);
    return {
      doseLogs: doseLogs as AppData['doseLogs'],
      checkins: checkins as AppData['checkins'],
      bpReadings: bpReadings as AppData['bpReadings'],
    };
  }

  watchBilling(familyId: string, onData: (b: Billing | undefined, uses: ReferralUse[]) => void): () => void {
    let billing: Billing | undefined;
    let uses: ReferralUse[] = [];
    let unUses: (() => void) | undefined;
    const un = fb.onSnapshot(
      fb.doc(this.db, 'families', familyId, 'meta', 'billing'),
      (s) => {
        billing = s.exists() ? (s.data() as Billing) : undefined;
        onData(billing, uses);
        if (billing?.refCode && !unUses) {
          unUses = fb.onSnapshot(
            fb.collection(this.db, 'referralCodes', billing.refCode, 'uses'),
            (qs) => {
              uses = qs.docs.map((d) => d.data() as ReferralUse);
              onData(billing, uses);
            },
            () => undefined,
          );
        }
      },
      () => undefined,
    );
    return () => {
      un();
      unUses?.();
    };
  }

  async initBilling(familyId: string, trialStart: string): Promise<Billing> {
    const uid = await this.signIn();
    const ref = fb.doc(this.db, 'families', familyId, 'meta', 'billing');
    const cur = await fb.getDoc(ref);
    if (cur.exists()) return cur.data() as Billing;
    // Mã đã có người dùng thì máy chủ từ chối (luật chỉ cho tạo mới) → thử mã khác.
    for (let i = 0; i < 5; i++) {
      const refCode = makeRefCode();
      try {
        await fb.setDoc(fb.doc(this.db, 'referralCodes', refCode), { familyId, createdBy: uid });
      } catch (e) {
        if ((e as { code?: string }).code !== 'permission-denied' || i === 4) throw e;
        continue;
      }
      const b: Billing = { trialStart, refCode };
      await fb.setDoc(ref, b);
      return b;
    }
    throw new Error('không tạo được mã giới thiệu');
  }

  async updateBilling(familyId: string, patch: Partial<Billing>): Promise<void> {
    await this.signIn();
    await fb.setDoc(fb.doc(this.db, 'families', familyId, 'meta', 'billing'), patch, { merge: true });
  }

  async refCodeExists(code: string): Promise<boolean> {
    await this.signIn();
    try {
      return (await fb.getDoc(fb.doc(this.db, 'referralCodes', code))).exists();
    } catch {
      return false;
    }
  }

  async recordReferralPaid(referrerCode: string, myCode: string, paidAt: string): Promise<void> {
    await this.signIn();
    await fb.setDoc(fb.doc(this.db, 'referralCodes', referrerCode, 'uses', myCode), { code: myCode, paidAt });
  }

  async registerDevice(familyId: string, info: DeviceInfo): Promise<void> {
    const uid = await this.signIn();
    await fb.setDoc(
      fb.doc(this.db, 'families', familyId, 'devices', uid),
      { ...info, platform: info.platform ?? Platform.OS, updatedAt: fb.serverTimestamp() },
      { merge: true },
    );
  }

  subscribe(
    familyId: string,
    onData: (snap: RemoteSnapshot, pending: boolean) => void,
    onError?: (e: Error) => void,
  ): () => void {
    const fam = fb.doc(this.db, 'families', familyId);
    const err = (e: Error) => onError?.(e);
    const unsubs: (() => void)[] = [];

    unsubs.push(
      fb.onSnapshot(
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
        fb.onSnapshot(
          fb.collection(fam, coll),
          (qs) => onData({ [coll]: qs.docs.map((d) => d.data()) } as RemoteSnapshot, qs.metadata.hasPendingWrites),
          err,
        ),
      );
    }
    const since = new Date(Date.now() - EVENT_DAYS * 86400_000).toISOString();
    for (const coll of EVENT_COLLECTIONS) {
      unsubs.push(
        fb.onSnapshot(
          fb.query(fb.collection(fam, coll), fb.where('at', '>=', since)),
          (qs) => onData({ [coll]: qs.docs.map((d) => d.data()) } as RemoteSnapshot, qs.metadata.hasPendingWrites),
          err,
        ),
      );
    }
    unsubs.push(
      fb.onSnapshot(
        fb.collection(fam, 'heartbeats'),
        (qs) => {
          const heartbeats: NonNullable<RemoteSnapshot['heartbeats']> = {};
          for (const d of qs.docs) {
            const v = d.data() as { at: string; battery?: number; notifOff?: boolean };
            heartbeats[d.id] = { at: v.at, battery: v.battery, notifOff: v.notifOff };
          }
          onData({ heartbeats }, qs.metadata.hasPendingWrites);
        },
        err,
      ),
    );
    return () => unsubs.forEach((u) => u());
  }
}

let instance: FirebaseSync | undefined;

/** Bản đồng bộ dùng trong app, hoặc undefined khi chưa cấu hình Firebase (chạy một máy). */
export function getFamilySync(): FamilySync | undefined {
  if (instance) return instance;
  const core = fb.initFirebase();
  if (!core) return undefined;
  instance = new FirebaseSync(core);
  return instance;
}

/** Số ngẫu nhiên an toàn (0 ≤ x < 1) cho mã kết nối, không dùng Math.random (đoán được). */
function secureRandom(): number {
  const b = Crypto.getRandomBytes(4);
  return (((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0) / 0x1_0000_0000;
}

/** Ghi các trường đổi, gỡ các trường bị bỏ. */
function fieldPatch(data: Record<string, unknown>, removed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const k of removed) out[k] = fb.deleteField();
  return out;
}

/** Cài đặt gia đình: chỉ ghi từng mục (settings.x), không ghi đè cả cài đặt. */
function settingsPatch(data: Record<string, unknown>, removed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) out[`settings.${k}`] = v;
  for (const k of removed) out[`settings.${k}`] = fb.deleteField();
  return out;
}
