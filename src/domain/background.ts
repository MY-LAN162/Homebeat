// Việc máy bố mẹ làm khi chạy nền (khoảng 15 phút một lần, tùy điện thoại cho phép):
// tìm cảnh báo cần báo cho con mà chưa báo. Hàm thuần, không gọi máy chủ.
import { memberAlerts, type AlertKind } from './alerts';
import type { PushMessage } from './pushRules';
import type { AppData } from './types';
import { dateKey } from './time';
import { toZone } from './tz';

/** Loại cảnh báo máy bố mẹ tự báo khi chạy nền (SOS, huyết áp, không khỏe đã báo ngay lúc nhập). */
export const BACKGROUND_KINDS: readonly AlertKind[] = ['late-dose', 'no-checkin'];

/** Mã chống báo trùng: mỗi cảnh báo một lần mỗi ngày. */
export function backgroundKey(day: string, memberId: string, kind: string, title: string): string {
  return `${day}|${memberId}|${kind}|${title}`;
}

/** Cảnh báo cần gửi bây giờ cho người đang dùng máy này, và danh sách mã đã gửi (chỉ giữ của hôm nay). */
export function backgroundPushes(data: AppData, now: Date, sent: string[]): { pushes: PushMessage[]; sent: string[] } {
  const memberId = data.role === 'parent' ? data.currentMemberId : undefined;
  const m = data.members.find((x) => x.id === memberId);
  const today = dateKey(toZone(now, data.settings.timeZone));
  const keep = sent.filter((k) => k.startsWith(`${today}|`));
  if (!m) return { pushes: [], sent: keep };
  const pushes: PushMessage[] = [];
  for (const a of memberAlerts(data, m, now)) {
    if (!BACKGROUND_KINDS.includes(a.kind)) continue;
    const key = backgroundKey(today, m.id, a.kind, a.title);
    if (keep.includes(key)) continue;
    keep.push(key);
    pushes.push({
      title: a.title,
      body: `${a.detail ? `${a.detail}. ` : ''}Nên gọi hỏi thăm ${m.call.toLowerCase()}.`,
      data: { kind: a.kind, memberId: m.id },
    });
  }
  return { pushes, sent: keep };
}
