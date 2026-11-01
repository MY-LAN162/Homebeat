// Phần thuần của máy chủ: không gọi Firebase, để kiểm thử được.
import { displayName } from '../../src/domain/address';
import { familyAlerts, type AlertKind, type FamilyAlert } from '../../src/domain/alerts';
import type { RemoteSnapshot } from '../../src/domain/syncdiff';
import { mergeRemote } from '../../src/domain/syncdiff';
import { dateKey } from '../../src/domain/time';
import { DEFAULT_SETTINGS, emptyData, type AppData, type Member, type SosEvent } from '../../src/domain/types';

/**
 * Loại cảnh báo máy chủ tự gửi thông báo đẩy cho con (kiểm tra định kỳ).
 * - SOS gửi ngay khi có (hàm onSosCreated), không đợi kiểm tra định kỳ.
 * - "no-signal" (mất tín hiệu) CHƯA gửi: máy bố mẹ hiện chỉ báo "còn sống" khi đang mở app,
 *   nên bật lên sẽ báo nhầm. Cần chạy nền trên máy bố mẹ trước.
 * - "low-stock" và "hơi mệt" là mức thông tin, chỉ hiện trong app.
 */
export const PUSH_KINDS: readonly AlertKind[] = ['late-dose', 'no-checkin', 'unwell', 'bp-high'];

/** Ghép dữ liệu đọc từ Firestore thành AppData để dùng lại quy tắc cảnh báo của app. */
export function buildAppData(snap: RemoteSnapshot): AppData {
  const base = emptyData();
  const data = mergeRemote(base, snap);
  data.settings = { ...DEFAULT_SETTINGS, ...(snap.settings ?? {}) };
  // Gia đình chưa chọn nơi sống của bố mẹ thì dùng múi giờ mặc định của máy chủ (APP_TZ, mặc định Việt Nam).
  data.settings.timeZone ??= process.env.APP_TZ || 'Asia/Ho_Chi_Minh';
  return data;
}

/** Mã chống gửi trùng: mỗi cảnh báo chỉ gửi một lần mỗi ngày. */
export function alertKey(a: FamilyAlert, now: Date): string {
  return `${dateKey(now)}_${a.memberId}_${a.kind}_${simpleHash(a.title)}`.replace(/\//g, '-');
}

/** Cảnh báo cần gửi bây giờ (chưa gửi hôm nay, đúng loại, mức cần chú ý). */
export function alertsToPush(data: AppData, now: Date, alreadySent: Set<string>): { key: string; alert: FamilyAlert }[] {
  return familyAlerts(data, now)
    .filter((a) => PUSH_KINDS.includes(a.kind) && a.level !== 'info')
    .map((alert) => ({ key: alertKey(alert, now), alert }))
    .filter(({ key }) => !alreadySent.has(key));
}

export function sosMessage(member: Member | undefined, sos: SosEvent): { title: string; body: string } {
  const who = member ? displayName(member) : 'Bố mẹ';
  const at = new Date(sos.at).toTimeString().slice(0, 5);
  const where = sos.lat != null && sos.lng != null ? ` Vị trí: https://maps.google.com/?q=${sos.lat},${sos.lng}` : '';
  return { title: `🆘 ${who} bấm SOS`, body: `Lúc ${at}. Gọi ngay cho ${member?.call.toLowerCase() ?? 'bố mẹ'}.${where}` };
}

/** Giới hạn nhập mã: tối đa MAX_ATTEMPTS lần sai trong WINDOW_MS cho mỗi người dùng. */
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 10 * 60_000;

export interface AttemptState {
  count: number;
  windowStart: number;
}

export function checkAttempts(state: AttemptState | undefined, now: number): { allowed: boolean; next: AttemptState } {
  const fresh = !state || now - state.windowStart > WINDOW_MS;
  const cur = fresh ? { count: 0, windowStart: now } : state;
  return { allowed: cur.count < MAX_ATTEMPTS, next: { count: cur.count + 1, windowStart: cur.windowStart } };
}

export type RedeemCheck =
  | { ok: true; familyId: string; memberId: string }
  | { ok: false; code: 'invalid-argument' | 'not-found' | 'failed-precondition' };

export function checkPairingDoc(
  input: unknown,
  doc: { familyId: string; memberId: string; expiresAt: string } | undefined,
  now: Date,
): RedeemCheck {
  if (typeof input !== 'string' || !/^\d{6}$/.test(input)) return { ok: false, code: 'invalid-argument' };
  if (!doc) return { ok: false, code: 'not-found' };
  if (now.getTime() > new Date(doc.expiresAt).getTime()) return { ok: false, code: 'failed-precondition' };
  return { ok: true, familyId: doc.familyId, memberId: doc.memberId };
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
