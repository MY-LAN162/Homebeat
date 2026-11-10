// Phần thuần (không gọi máy chủ) của đồng bộ: tính cần ghi gì lên máy chủ, và gộp dữ liệu máy chủ vào máy.
// Tách riêng để kiểm thử được, và để Cloud Functions dùng chung cách đặt mã tài liệu.
import type { AlertSettings, AppData, Member } from './types';

/** Danh sách lưu trên máy chủ, mỗi danh sách là một collection con của families/{familyId}. */
export const COLLECTIONS = [
  'members',
  'caregivers',
  'medications',
  'appointments',
  'doseLogs',
  'checkins',
  'bpReadings',
  'sosEvents',
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

/**
 * Sự kiện từ máy bố mẹ (uống thuốc, điểm danh, huyết áp, SOS): gộp kiểu hợp nhất,
 * để sự kiện chưa kịp gửi (mất mạng) không bị mất khi máy nhận bản từ máy chủ.
 */
export const EVENT_COLLECTIONS: readonly CollectionName[] = ['doseLogs', 'checkins', 'bpReadings', 'sosEvents'];

/** Cài đặt gia đình: danh sách người, thuốc, lịch khám... Bản trên máy chủ là bản đúng. */
export const CONFIG_COLLECTIONS: readonly CollectionName[] = ['members', 'caregivers', 'medications', 'appointments'];

/** Sự kiện cũ hơn số ngày này không tải về (giữ máy nhẹ). */
export const EVENT_DAYS = 30;

type Item<C extends CollectionName> = AppData[C][number];

/** Mã tài liệu trên máy chủ. Cố định theo nội dung để gửi lại nhiều lần không bị nhân đôi. */
export function docId<C extends CollectionName>(coll: C, item: Item<C>): string {
  switch (coll) {
    case 'doseLogs': {
      const l = item as AppData['doseLogs'][number];
      return safeId(`${l.memberId}_${l.date}_${l.time}_${l.medId}`);
    }
    case 'checkins':
    case 'bpReadings': {
      const e = item as { memberId: string; at: string };
      return safeId(`${e.memberId}_${e.at}`);
    }
    default:
      return safeId((item as { id: string }).id);
  }
}

/** Firestore không cho dấu "/" trong mã tài liệu. */
function safeId(s: string): string {
  return s.replace(/\//g, '-');
}

/** Trường chỉ thuộc về máy (không gửi lên danh sách người). */
const MEMBER_LOCAL_FIELDS: (keyof Member)[] = ['lastSeenAt', 'battery'];

/** Bỏ trường `undefined` (Firestore không nhận) và trường chỉ có trên máy. */
export function toDoc<C extends CollectionName>(coll: C, item: Item<C>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item as object)) {
    if (v === undefined) continue;
    if (coll === 'members' && (MEMBER_LOCAL_FIELDS as string[]).includes(k)) continue;
    // Lời bác sĩ chỉ gửi lên máy chủ khi người dùng bấm chia sẻ.
    if (coll === 'appointments' && k === 'transcript' && !(item as { shareTranscript?: boolean }).shareTranscript) continue;
    out[k] = v;
  }
  return out;
}

export type SyncWrite =
  | { op: 'set'; coll: CollectionName; id: string; data: Record<string, unknown> }
  | { op: 'delete'; coll: CollectionName; id: string }
  | { op: 'settings'; data: AlertSettings };

/** Phần dữ liệu có trên máy chủ (không gồm vai trò, người đang dùng máy, mã kết nối...). */
export type SharedData = Pick<AppData, CollectionName | 'settings'>;

/**
 * Những gì cần ghi lên máy chủ để `before` (bản máy chủ đã có) thành `after` (bản trên máy).
 * Chỉ ghi tài liệu có thay đổi.
 * `canDelete`: chỉ xóa trên máy chủ những gì người dùng THẬT SỰ bấm xóa. Dữ liệu chỉ "thiếu" trên máy
 * (vd app tắt giữa chừng lúc đang lưu) thì không xóa, tránh mất dữ liệu của cả gia đình.
 */
export function diffData(
  before: SharedData,
  after: SharedData,
  canDelete: (coll: CollectionName, id: string) => boolean = () => true,
): SyncWrite[] {
  const out: SyncWrite[] = [];
  for (const coll of COLLECTIONS) {
    const prev = new Map<string, string>();
    for (const item of before[coll] as Item<typeof coll>[]) {
      prev.set(docId(coll, item), JSON.stringify(toDoc(coll, item)));
    }
    const seen = new Set<string>();
    for (const item of after[coll] as Item<typeof coll>[]) {
      const id = docId(coll, item);
      seen.add(id);
      const data = toDoc(coll, item);
      if (prev.get(id) !== JSON.stringify(data)) out.push({ op: 'set', coll, id, data });
    }
    for (const id of prev.keys()) if (!seen.has(id) && canDelete(coll, id)) out.push({ op: 'delete', coll, id });
  }
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) {
    out.push({ op: 'settings', data: after.settings });
  }
  return out;
}

/** Dữ liệu máy chủ gửi về. Chỉ có những phần đã tải xong (chưa tải thì không có khóa). */
export interface RemoteSnapshot {
  members?: AppData['members'];
  caregivers?: AppData['caregivers'];
  medications?: AppData['medications'];
  appointments?: AppData['appointments'];
  doseLogs?: AppData['doseLogs'];
  checkins?: AppData['checkins'];
  bpReadings?: AppData['bpReadings'];
  sosEvents?: AppData['sosEvents'];
  settings?: AlertSettings;
  /** Tín hiệu "còn sống" của từng máy bố mẹ, theo memberId. */
  heartbeats?: Record<string, { at: string; battery?: number }>;
}

/**
 * Gộp dữ liệu máy chủ vào dữ liệu trên máy.
 * - Cài đặt gia đình: lấy bản máy chủ.
 * - Sự kiện: hợp nhất theo mã, bản máy chủ thắng khi trùng mã.
 * - Tín hiệu còn sống: gắn vào từng người (lastSeenAt, battery).
 */
export function mergeRemote<T extends SharedData>(local: T, remote: RemoteSnapshot): T {
  const next = { ...local } as T;
  for (const coll of CONFIG_COLLECTIONS) {
    const r = remote[coll];
    if (r) (next as SharedData)[coll] = r as never;
  }
  // Lời bác sĩ chưa chia sẻ chỉ có trên máy này: giữ lại khi bản máy chủ không có.
  if (remote.appointments) {
    const mine = new Map(local.appointments.map((a) => [a.id, a.transcript] as const));
    next.appointments = remote.appointments.map((a) =>
      a.transcript === undefined && mine.get(a.id) ? { ...a, transcript: mine.get(a.id) } : a,
    );
  }
  for (const coll of EVENT_COLLECTIONS) {
    const r = remote[coll] as Item<typeof coll>[] | undefined;
    if (!r) continue;
    const byId = new Map<string, Item<typeof coll>>();
    for (const item of local[coll] as Item<typeof coll>[]) byId.set(docId(coll, item), item);
    for (const item of r) byId.set(docId(coll, item), item);
    const merged = [...byId.values()].sort((a, b) => eventTime(a).localeCompare(eventTime(b)));
    (next as SharedData)[coll] = merged as never;
  }
  if (remote.settings) next.settings = { ...local.settings, ...remote.settings };
  // Danh sách người lấy từ máy chủ không có lastSeenAt/battery: giữ lại giá trị cũ rồi ghi đè bằng nhịp mới.
  next.members = mergeHeartbeats(next.members, remote.heartbeats ?? {}, local.members);
  return next;
}

/** Gắn nhịp "còn sống" mới nhất (thời điểm, pin) vào từng người; không có nhịp mới thì giữ giá trị cũ. */
export function mergeHeartbeats(
  members: Member[],
  heartbeats: Record<string, { at: string; battery?: number }>,
  previous: Member[] = members,
): Member[] {
  const oldSeen = new Map(previous.map((m) => [m.id, m] as const));
  return members.map((m) => {
    const hb = heartbeats[m.id];
    const old = oldSeen.get(m.id);
    const lastSeenAt = hb?.at ?? m.lastSeenAt ?? old?.lastSeenAt;
    const battery = hb ? hb.battery : (m.battery ?? old?.battery);
    const out: Member = { ...m };
    if (lastSeenAt !== undefined) out.lastSeenAt = lastSeenAt;
    if (battery !== undefined) out.battery = battery;
    return out;
  });
}

function eventTime(e: unknown): string {
  return (e as { at?: string }).at ?? '';
}

/** Lấy phần dùng chung từ AppData. */
export function shared(d: AppData): SharedData {
  return {
    members: d.members,
    caregivers: d.caregivers,
    medications: d.medications,
    appointments: d.appointments,
    doseLogs: d.doseLogs,
    checkins: d.checkins,
    bpReadings: d.bpReadings,
    sosEvents: d.sosEvents,
    settings: d.settings,
  };
}

/** Phần chưa có trên máy chủ: dùng làm mốc khi chưa đồng bộ lần nào. */
export function emptyShared(settings: AlertSettings): SharedData {
  return {
    members: [],
    caregivers: [],
    medications: [],
    appointments: [],
    doseLogs: [],
    checkins: [],
    bpReadings: [],
    sosEvents: [],
    settings,
  };
}
