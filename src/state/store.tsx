// Kho dữ liệu của app. Luôn lưu trên máy (AsyncStorage) để chạy được khi mất mạng.
// Khi đã cấu hình Firebase (.env) và gia đình đã có mã trên máy chủ (familyId),
// mọi thay đổi được gửi lên máy chủ và nhận về qua SyncEngine (src/services/syncEngine.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { checkCode, createPairing, type PairResult } from '../domain/pairing';
import { consumeStock, logSlot, type DoseSlot } from '../domain/schedule';
import { demoData } from '../domain/seed';
import type {
  AlertSettings,
  AppData,
  Appointment,
  Caregiver,
  Member,
  Medication,
  Mood,
  Role,
} from '../domain/types';
import { emptyData } from '../domain/types';
import { emptyShared, mergeRemote, shared, type SharedData } from '../domain/syncdiff';
import { PRIVACY_VERSION } from '../domain/privacy';
import { bpPush, checkinPush, messagePush, skipPush, sosAckPush, sosPush, type PushMessage } from '../domain/pushRules';
import { getFamilySync } from '../services/firebaseSync';
import { setBackgroundEnabled } from '../services/background';
import { checkAndAlert } from '../services/checkAndAlert';
import { readSecure, writeSecure } from '../services/vault';
import { sendPush } from '../services/push';
import { scheduleKey } from '../domain/background';
import { BASE_KEY, BG_SCHED_KEY, DATA_KEY } from './keys';
import { getPushToken, rescheduleMedReminders } from '../services/notifications';
import { SyncError, type FamilyDevice, type FamilySync, type JoinRequest } from '../services/sync';
import { SyncEngine } from '../services/syncEngine';

const KEY = DATA_KEY;
/** Máy bố mẹ báo "còn sống" mỗi 15 phút khi đang mở app. */
const HEARTBEAT_MS = 15 * 60_000;

/** Mốc cho gia đình mới tạo: chưa có gì trên máy chủ, cài đặt cảnh báo luôn được gửi lên. */
const freshBase = (): SharedData => emptyShared({} as AppData['settings']);

/** Ghi nhớ thứ người dùng bấm xóa (giữ 200 mục gần nhất). */
const markDeleted = (d: AppData, key: string) => [...(d.deleted ?? []).slice(-199), key];

let counter = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

interface Store {
  ready: boolean;
  data: AppData;
  now: Date;
  /** Đã cấu hình máy chủ đồng bộ (Firebase) chưa. */
  syncEnabled: boolean;
  /** Lỗi đồng bộ gần nhất (để hiện cho người dùng). */
  syncError?: string;
  /** Gửi lại mã nhận thông báo của máy này lên máy chủ (gọi sau khi người dùng vừa cho phép thông báo). */
  refreshDevice: () => void;
  setRole: (role: Role | undefined) => void;
  /** Con tạo gia đình: thêm bố/mẹ đầu tiên và tạo mã kết nối. */
  addMember: (m: Omit<Member, 'id'>) => Member;
  updateMember: (id: string, patch: Partial<Member>) => void;
  /** Tạo mã kết nối. Có máy chủ: tạo gia đình (nếu chưa có) và mã trên máy chủ. Lỗi thì ném lỗi. */
  newPairing: (memberId: string) => Promise<void>;
  /** Bố mẹ nhập mã. Chưa có máy chủ: kiểm tra với mã đã tạo trên chính máy này. */
  pair: (code: string) => Promise<PairResult>;
  /** Tạo mã cho máy mới của con (đổi điện thoại, thêm người nhà). Cần đã kết nối máy chủ. */
  newChildPairing: () => Promise<void>;
  /** Email đã liên kết để khôi phục khi đổi máy. */
  linkedEmail: () => Promise<string | undefined>;
  linkEmail: (email: string, password: string) => Promise<void>;
  /** Máy mới: đăng nhập email đã liên kết, lấy lại gia đình. Trả về false nếu không thấy gia đình. */
  restoreWithEmail: (email: string, password: string) => Promise<boolean>;
  listDevices: () => Promise<FamilyDevice[]>;
  removeDevice: (uid: string) => Promise<void>;
  transferOwner: (uid: string) => Promise<void>;
  /** Người dùng đồng ý chính sách quyền riêng tư. */
  acceptPrivacy: () => void;
  /** Máy quản lý: xóa toàn bộ dữ liệu gia đình trên máy chủ và trên máy này. */
  deleteFamilyData: () => Promise<void>;
  /** Máy khác: rời khỏi gia đình và xóa dữ liệu trên máy này. */
  leaveFamily: () => Promise<void>;
  /** Bố mẹ hủy yêu cầu đang chờ (để nhập lại mã). */
  cancelJoin: () => void;
  /** Yêu cầu vào gia đình đang chờ con đồng ý (máy con). */
  joinRequests: JoinRequest[];
  decideJoin: (req: JoinRequest, approve: boolean) => Promise<void>;
  setCurrentMember: (id: string) => void;
  upsertCaregiver: (c: Omit<Caregiver, 'id'> & { id?: string }) => void;
  removeCaregiver: (id: string) => void;
  upsertMedication: (m: Omit<Medication, 'id'> & { id?: string }) => void;
  removeMedication: (id: string) => void;
  /** Đã mua thêm thuốc: cộng thêm số viên còn lại. */
  restock: (medId: string, pills: number) => void;
  markSlot: (slot: DoseSlot, status: 'taken' | 'skipped') => void;
  /** Bố mẹ không uống: ghi lý do, hết thuốc thì đặt số viên còn lại về 0, báo cho con. */
  skipSlot: (slot: DoseSlot, reason: 'out' | 'unable') => void;
  checkin: (memberId: string, mood: Mood, symptoms: string[]) => void;
  addBp: (memberId: string, sys: number, dia: number, pulse: number) => void;
  startSos: (memberId: string, loc?: { lat: number; lng: number }) => string;
  cancelSos: (id: string) => void;
  /** Máy con: bấm "Con đã thấy" SOS, máy bố mẹ hiện để yên tâm. */
  ackSos: (id: string) => void;
  /** Máy con: gửi lời nhắn cho bố/mẹ. */
  sendMessage: (memberId: string, text: string, from: string) => void;
  /** Máy bố mẹ: bấm "Đã xem" lời nhắn. */
  markMessageSeen: (id: string) => void;
  upsertAppointment: (a: Omit<Appointment, 'id'> & { id?: string }) => void;
  updateSettings: (patch: Partial<AlertSettings>) => void;
  /** Con bấm "ổn rồi, tắt cảnh báo" (chỉ ẩn trong hôm nay, trên máy này). */
  dismissAlert: (key: string) => void;
  markGuideSeen: () => void;
  setTextScale: (k: number) => void;
  setAppLock: (on: boolean) => void;
  loadDemo: () => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, sync = getFamilySync() }: { children: ReactNode; sync?: FamilySync }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string>();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [deviceTick, setDeviceTick] = useState(0);
  const loaded = useRef(false);
  const baseRef = useRef<SharedData | undefined>(undefined);
  const engineRef = useRef<SyncEngine | undefined>(undefined);
  const dataRef = useRef(data);

  useEffect(() => {
    Promise.all([readSecure(KEY), readSecure(BASE_KEY)])
      .then(([raw, base]) => {
        if (raw) setData({ ...emptyData(), ...(JSON.parse(raw) as AppData) });
        if (base) baseRef.current = JSON.parse(base) as SharedData;
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    dataRef.current = data;
    if (!loaded.current) return;
    writeSecure(KEY, JSON.stringify(data)).catch(() => undefined);
    engineRef.current?.push(shared(data));
  }, [data]);

  // Nối máy chủ khi gia đình đã có mã trên máy chủ.
  const familyId = sync && !data.demo ? data.familyId : undefined;
  useEffect(() => {
    if (!ready || !sync || !familyId) return;
    const engine = new SyncEngine({
      sync,
      familyId,
      base: baseRef.current ?? freshBase(),
      onRemote: (snap) => {
        setSyncError(undefined);
        setData((d) => mergeRemote(d, snap));
      },
      saveAcked: (b) => {
        baseRef.current = b;
        writeSecure(BASE_KEY, JSON.stringify(b)).catch(() => undefined);
      },
      onError: (e) => setSyncError(e.message),
      canDelete: (coll, id) => (dataRef.current.deleted ?? []).includes(`${coll}/${id}`),
    });
    let stopped = false;
    sync
      .signIn()
      .then(() => {
        if (stopped) return;
        engineRef.current = engine;
        // Gửi những gì trên máy còn khác máy chủ (gia đình mới tạo, sửa khi mất mạng rồi tắt app...).
        engine.start(shared(dataRef.current));
      })
      .catch((e: Error) => setSyncError(e.message));
    return () => {
      stopped = true;
      engine.stop();
      if (engineRef.current === engine) engineRef.current = undefined;
    };
  }, [ready, sync, familyId]);

  // Máy bố mẹ: chờ con bấm Đồng ý. Được đồng ý thì vào gia đình, bắt đầu từ dữ liệu trên máy chủ
  // (bỏ dữ liệu cũ trên máy, vd dữ liệu mẫu).
  const pending = sync ? data.pendingJoin : undefined;
  useEffect(() => {
    if (!ready || !sync || !pending || pending.denied) return;
    return sync.watchJoinRequest(pending.familyId, (st) => {
      if (st === 'approved') {
        const fresh = emptyData();
        baseRef.current = shared(fresh);
        writeSecure(BASE_KEY, JSON.stringify(baseRef.current)).catch(() => undefined);
        const role = pending.role ?? 'parent';
        setData((d) => ({
          ...fresh,
          textScale: d.textScale,
          consentAt: d.consentAt,
          consentVersion: d.consentVersion,
          role,
          familyId: pending.familyId,
          currentMemberId: role === 'parent' ? pending.memberId : undefined,
        }));
      } else if (st === 'denied' || st === 'gone') {
        setData((d) => (d.pendingJoin ? { ...d, pendingJoin: { ...d.pendingJoin, denied: true } } : d));
      }
    });
  }, [ready, sync, pending]);

  // Máy trong gia đình: nghe các yêu cầu vào gia đình đang chờ đồng ý.
  useEffect(() => {
    if (!ready || !sync || !familyId) return;
    return sync.subscribeJoinRequests(familyId, setJoinRequests);
  }, [ready, sync, familyId]);

  // Ghi thông tin máy (vai trò, mã nhận thông báo đẩy) để máy chủ biết gửi cảnh báo cho ai.
  useEffect(() => {
    if (!ready || !sync || !familyId || !data.role) return;
    const role = data.role;
    const memberId = role === 'parent' ? data.currentMemberId : undefined;
    getPushToken()
      .catch(() => undefined)
      .then((pushToken) => sync.registerDevice(familyId, { role, memberId, pushToken }))
      .catch(() => undefined);
  }, [ready, sync, familyId, data.role, data.currentMemberId, deviceTick]);

  // Máy bố mẹ: báo "còn sống" và tự báo cho con khi trễ thuốc / chưa điểm danh —
  // khi mở app, khi quay lại app, mỗi 15 phút khi đang mở, và chạy nền khi đóng app (nếu máy cho phép).
  // Máy con: cũng chạy nền để tự báo khi máy bố mẹ mất tín hiệu hoặc pin yếu.
  const beatMember = data.role === 'parent' ? data.currentMemberId : data.role === 'child' && !data.demo ? 'child' : undefined;
  useEffect(() => {
    if (!ready || !sync || !familyId || !beatMember) {
      void setBackgroundEnabled(false);
      return;
    }
    void setBackgroundEnabled(true);
    const beat = () => checkAndAlert().catch(() => undefined);
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && beat());
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [ready, sync, familyId, beatMember]);

  // Đặt lại nhắc thuốc khi lịch thuốc hoặc người dùng máy thay đổi.
  // Gồm cả số lần đã ghi uống thuốc, để bấm "Đã uống" thì hủy các lần nhắc lại của lần đó.
  const medKey = JSON.stringify([
    data.role,
    data.currentMemberId,
    data.settings.lateMinutes,
    data.settings.timeZone,
    data.medications.map((m) => [m.memberId, m.name, m.pillsPerDose, m.times]),
    data.appointments.map((a) => [a.memberId, a.at, a.title, a.place, a.companion]),
    data.doseLogs.filter((l) => l.memberId === data.currentMemberId).length,
  ]);
  useEffect(() => {
    if (!loaded.current) return;
    rescheduleMedReminders(data)
      // Ghi lại lịch đã đặt nhắc, để phần chạy nền không báo "con vừa đổi lịch" cho thay đổi bố mẹ đã thấy trong app.
      .then(() => (data.role === 'parent' ? AsyncStorage.setItem(BG_SCHED_KEY, scheduleKey(data)) : undefined))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medKey, ready]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const store = useMemo<Store>(() => {
    const iso = () => new Date().toISOString();
    // Xóa dữ liệu trên máy này (giữ lại đồng ý chính sách và cỡ chữ).
    const resetLocal = () => {
      baseRef.current = undefined;
      AsyncStorage.removeItem(BASE_KEY).catch(() => undefined);
      setData((d) => ({ ...emptyData(), consentAt: d.consentAt, consentVersion: d.consentVersion, textScale: d.textScale }));
    };
    // Máy bố mẹ tự gửi thông báo cho các con (miễn phí, không cần máy chủ riêng). Chạy ngầm, không chặn màn hình.
    const alertChildren = (msg: PushMessage) => {
      if (!sync || !familyId || data.role !== 'parent') return;
      sync
        .childPushTokens(familyId)
        .then((tokens) => sendPush(tokens, msg))
        .catch(() => undefined);
    };
    // Máy con báo cho máy bố mẹ (con đã thấy SOS, lời nhắn). Chạy ngầm.
    const alertParent = (memberId: string, msg: PushMessage) => {
      if (!sync || !familyId || data.role !== 'child') return;
      sync
        .parentPushTokens(familyId, memberId)
        .then((tokens) => sendPush(tokens, msg))
        .catch(() => undefined);
    };
    const myName = () => data.myName ?? [...data.caregivers].sort((a, b) => a.order - b.order).find((c) => !c.sosOnly)?.name ?? '';
    return {
      ready,
      data,
      now,
      syncEnabled: !!sync,
      syncError,
      refreshDevice: () => setDeviceTick((t) => t + 1),
      setRole: (role) => update((d) => ({ ...d, role })),
      addMember: (m) => {
        const member: Member = { ...m, id: newId('m') };
        update((d) => ({ ...d, members: [...d.members, member] }));
        return member;
      },
      updateMember: (id, patch) =>
        update((d) => ({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      newPairing: async (memberId) => {
        if (!sync || data.demo) {
          update((d) => ({ ...d, pairing: createPairing(memberId, new Date()) }));
          return;
        }
        await sync.signIn();
        let fid = data.familyId;
        if (!fid) {
          fid = await sync.createFamily();
          baseRef.current = freshBase();
          await AsyncStorage.removeItem(BASE_KEY).catch(() => undefined);
          const created = fid;
          update((d) => ({ ...d, familyId: created }));
        }
        const pairing = await sync.createPairingCode(fid, memberId);
        update((d) => ({ ...d, pairing }));
      },
      pair: async (code) => {
        if (!sync) {
          const res = checkCode(code, data.pairing, new Date());
          if (res.ok) update((d) => ({ ...d, role: 'parent', currentMemberId: res.memberId }));
          return res;
        }
        if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) return { ok: false, reason: 'format' };
        try {
          // Gửi yêu cầu, chờ con bấm Đồng ý (xem hiệu ứng theo dõi pendingJoin bên dưới).
          const { familyId: fid, memberId, role } = await sync.requestJoin(code);
          update((d) => ({ ...d, pendingJoin: { familyId: fid, memberId, role, at: new Date().toISOString() } }));
          return { ok: true, memberId, pending: true };
        } catch (e) {
          return { ok: false, reason: e instanceof SyncError ? e.reason : 'network' };
        }
      },
      newChildPairing: async () => {
        if (!sync || !data.familyId || data.demo) throw new Error('Cần kết nối với máy chủ trước');
        const p = await sync.createPairingCode(data.familyId, '', 'child');
        update((d) => ({ ...d, childPairing: p }));
      },
      linkedEmail: async () => (sync ? sync.linkedEmail() : undefined),
      linkEmail: async (email, password) => {
        if (!sync) throw new Error('Chưa kết nối máy chủ');
        await sync.linkEmail(email, password);
      },
      restoreWithEmail: async (email, password) => {
        if (!sync) throw new Error('Chưa kết nối máy chủ');
        const r = await sync.restoreWithEmail(email, password);
        if (!r) return false;
        const fresh = emptyData();
        baseRef.current = shared(fresh);
        await writeSecure(BASE_KEY, JSON.stringify(baseRef.current)).catch(() => undefined);
        setData((d) => ({
          ...fresh,
          textScale: d.textScale,
          consentAt: d.consentAt,
          consentVersion: d.consentVersion,
          guideSeen: true,
          role: r.role,
          familyId: r.familyId,
          currentMemberId: r.role === 'parent' ? r.memberId : undefined,
        }));
        return true;
      },
      listDevices: async () => {
        if (!sync || !data.familyId) return [];
        return sync.listDevices(data.familyId);
      },
      removeDevice: async (uid) => {
        if (!sync || !data.familyId) return;
        await sync.removeDevice(data.familyId, uid);
      },
      transferOwner: async (uid) => {
        if (!sync || !data.familyId) return;
        await sync.transferOwner(data.familyId, uid);
      },
      acceptPrivacy: () => update((d) => ({ ...d, consentAt: new Date().toISOString(), consentVersion: PRIVACY_VERSION })),
      deleteFamilyData: async () => {
        if (sync && data.familyId && !data.demo) await sync.deleteFamily(data.familyId);
        resetLocal();
      },
      leaveFamily: async () => {
        if (sync && data.familyId && !data.demo) {
          const me = await sync.signIn();
          await sync.removeDevice(data.familyId, me);
        }
        resetLocal();
      },
      cancelJoin: () => update((d) => ({ ...d, pendingJoin: undefined })),
      joinRequests: familyId ? joinRequests : [],
      decideJoin: async (req, approve) => {
        if (!sync || !data.familyId) return;
        await sync.decideJoin(data.familyId, req, approve);
        // Mã đã dùng thì bỏ khỏi máy (máy chủ cũng đã xóa), để con tạo mã mới khi cần.
        if (approve)
          update((d) => ({
            ...d,
            pairing: d.pairing?.code === req.code ? undefined : d.pairing,
            childPairing: d.childPairing?.code === req.code ? undefined : d.childPairing,
          }));
      },
      setCurrentMember: (id) => update((d) => ({ ...d, currentMemberId: id })),
      upsertCaregiver: (c) =>
        update((d) => {
          const id = c.id ?? newId('c');
          const exists = d.caregivers.some((x) => x.id === id);
          const next = { ...c, id } as Caregiver;
          return { ...d, caregivers: exists ? d.caregivers.map((x) => (x.id === id ? next : x)) : [...d.caregivers, next] };
        }),
      removeCaregiver: (id) =>
        update((d) => ({ ...d, caregivers: d.caregivers.filter((c) => c.id !== id), deleted: markDeleted(d, `caregivers/${id}`) })),
      upsertMedication: (m) =>
        update((d) => {
          const id = m.id ?? newId('t');
          const exists = d.medications.some((x) => x.id === id);
          const next = { ...m, id, createdAt: m.createdAt ?? (exists ? undefined : new Date().toISOString()) } as Medication;
          if (!next.createdAt) delete next.createdAt;
          return { ...d, medications: exists ? d.medications.map((x) => (x.id === id ? next : x)) : [...d.medications, next] };
        }),
      restock: (medId, pills) =>
        update((d) => ({
          ...d,
          medications: d.medications.map((m) => (m.id === medId ? { ...m, stockPills: (m.stockPills ?? 0) + pills } : m)),
        })),
      removeMedication: (id) =>
        update((d) => ({ ...d, medications: d.medications.filter((m) => m.id !== id), deleted: markDeleted(d, `medications/${id}`) })),
      markSlot: (slot, status) =>
        update((d) => ({
          ...d,
          doseLogs: [
            ...d.doseLogs.filter((l) => !(l.memberId === slot.memberId && l.date === slot.date && l.time === slot.time)),
            ...logSlot(slot, status, new Date()),
          ],
          medications: status === 'taken' ? consumeStock(d.medications, slot) : d.medications,
        })),
      skipSlot: (slot, reason) => {
        const ids = new Set(slot.meds.map((x) => x.id));
        update((d) => ({
          ...d,
          doseLogs: [
            ...d.doseLogs.filter((l) => !(l.memberId === slot.memberId && l.date === slot.date && l.time === slot.time)),
            ...logSlot(slot, 'skipped', new Date(), reason),
          ],
          medications: reason === 'out' ? d.medications.map((x) => (ids.has(x.id) ? { ...x, stockPills: 0 } : x)) : d.medications,
        }));
        const m = data.members.find((x) => x.id === slot.memberId);
        if (m) alertChildren(skipPush(m, slot.time, reason, slot.meds.map((x) => x.name)));
      },
      checkin: (memberId, mood, symptoms) => {
        // Bấm "ổn" nhiều lần liền nhau chỉ tính một lần.
        const recent = data.checkins.some(
          (c) => c.memberId === memberId && c.mood === 'good' && mood === 'good' && Date.now() - new Date(c.at).getTime() < 10 * 60_000,
        );
        if (recent) return;
        update((d) => ({ ...d, checkins: [...d.checkins, { memberId, mood, symptoms, at: iso() }] }));
        const m = data.members.find((x) => x.id === memberId);
        const msg = m && checkinPush(m, mood, symptoms);
        if (msg) alertChildren(msg);
      },
      addBp: (memberId, sys, dia, pulse) => {
        update((d) => ({ ...d, bpReadings: [...d.bpReadings, { memberId, sys, dia, pulse, at: iso() }] }));
        const m = data.members.find((x) => x.id === memberId);
        const msg = m && bpPush(m, sys, dia, data.settings);
        if (msg) alertChildren(msg);
      },
      startSos: (memberId, loc) => {
        const id = newId('sos');
        update((d) => ({ ...d, sosEvents: [...d.sosEvents, { id, memberId, at: iso(), cancelled: false, ...loc }] }));
        const m = data.members.find((x) => x.id === memberId);
        if (m) alertChildren(sosPush(m, new Date(), loc));
        return id;
      },
      cancelSos: (id) =>
        update((d) => ({ ...d, sosEvents: d.sosEvents.map((e) => (e.id === id ? { ...e, cancelled: true } : e)) })),
      ackSos: (id) => {
        const ev = data.sosEvents.find((e) => e.id === id);
        if (!ev || ev.ackBy) return;
        const by = myName() || 'Con';
        update((d) => ({ ...d, sosEvents: d.sosEvents.map((e) => (e.id === id ? { ...e, ackBy: by, ackAt: iso() } : e)) }));
        const m = data.members.find((x) => x.id === ev.memberId);
        if (m) alertParent(m.id, sosAckPush(m, by));
      },
      sendMessage: (memberId, text, from) => {
        const t = text.trim().slice(0, 100);
        if (!t) return;
        update((d) => ({ ...d, myName: from, messages: [...(d.messages ?? []), { id: newId('msg'), memberId, from, text: t, at: iso() }] }));
        const m = data.members.find((x) => x.id === memberId);
        if (m) alertParent(m.id, messagePush(m, from, t));
      },
      markMessageSeen: (id) =>
        update((d) => ({ ...d, messages: (d.messages ?? []).map((x) => (x.id === id && !x.seenAt ? { ...x, seenAt: iso() } : x)) })),
      upsertAppointment: (a) =>
        update((d) => {
          const id = a.id ?? newId('k');
          const exists = d.appointments.some((x) => x.id === id);
          const next = { ...a, id } as Appointment;
          return { ...d, appointments: exists ? d.appointments.map((x) => (x.id === id ? next : x)) : [...d.appointments, next] };
        }),
      updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      setAppLock: (on) => update((d) => ({ ...d, appLock: on })),
      setTextScale: (k) => update((d) => ({ ...d, textScale: k })),
      markGuideSeen: () => update((d) => ({ ...d, guideSeen: true })),
      dismissAlert: (key) => update((d) => ({ ...d, dismissed: [...(d.dismissed ?? []).slice(-50), key] })),
      loadDemo: () =>
        setData((d) => ({ ...demoData(new Date()), demo: true, consentAt: d.consentAt, consentVersion: d.consentVersion, textScale: d.textScale })),
      reset: () => resetLocal(),
    };
  }, [data, now, ready, update, sync, syncError, joinRequests, familyId]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore phải nằm trong StoreProvider');
  return s;
}

/** Bố/mẹ đang dùng máy này (phía bố mẹ). */
export function useCurrentMember(): Member | undefined {
  const { data } = useStore();
  return data.members.find((m) => m.id === data.currentMemberId) ?? data.members[0];
}
