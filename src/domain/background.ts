// Việc máy bố mẹ làm khi chạy nền (khoảng 15 phút một lần, tùy điện thoại cho phép):
// tìm cảnh báo cần báo cho con mà chưa báo. Hàm thuần, không gọi máy chủ.
import { memberAlerts, type AlertKind } from './alerts';
import { mergeHeartbeats } from './syncdiff';
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

/** Loại cảnh báo máy CON tự kiểm tra (không cần máy bố mẹ còn chạy): mất tín hiệu, pin yếu. */
export const SIGNAL_KINDS: readonly AlertKind[] = ['no-signal', 'low-battery'];

export interface LocalAlert {
  title: string;
  body: string;
  data: { kind: AlertKind; memberId: string };
}

/**
 * Máy con: từ nhịp "còn sống" mới nhất của các máy bố mẹ, tìm cảnh báo mất tín hiệu / pin yếu cần báo.
 * Mất tín hiệu báo một lần cho mỗi lần mất (theo thời điểm nhịp cuối); pin yếu một lần mỗi ngày.
 * Hàm thuần: máy con tự hiện thông báo trên máy mình, không cần máy chủ trả phí.
 */
export function childSignalAlerts(
  data: AppData,
  heartbeats: Record<string, { at: string; battery?: number }>,
  now: Date,
  sent: string[],
): { alerts: LocalAlert[]; sent: string[] } {
  if (data.role !== 'child' || data.demo) return { alerts: [], sent };
  const today = dateKey(toZone(now, data.settings.timeZone));
  const merged: AppData = { ...data, members: mergeHeartbeats(data.members, heartbeats) };
  const keep = [...sent];
  const alerts: LocalAlert[] = [];
  for (const m of merged.members) {
    for (const a of memberAlerts(merged, m, now)) {
      if (!SIGNAL_KINDS.includes(a.kind)) continue;
      const key = a.kind === 'no-signal' ? `no-signal|${m.id}|${m.lastSeenAt}` : `${today}|${m.id}|low-battery`;
      if (keep.includes(key)) continue;
      keep.push(key);
      alerts.push({
        title: a.title,
        body: a.kind === 'no-signal'
          ? `${a.detail ? `${a.detail}. ` : ''}Nên gọi hỏi thăm ${m.call.toLowerCase()}.`
          : a.detail ?? '',
        data: { kind: a.kind, memberId: m.id },
      });
    }
  }
  return { alerts, sent: keep.slice(-100) };
}

/**
 * Máy bố mẹ: dấu vân tay của lịch nhắc thuốc (thuốc của người dùng máy này, giờ uống, số viên, thời gian chờ, múi giờ).
 * Đổi thì phải đặt lại giờ nhắc.
 */
export function scheduleKey(data: AppData): string {
  const meds = data.medications
    .filter((m) => m.memberId === data.currentMemberId)
    .map((m) => [m.id, m.name, m.pillsPerDose, [...m.times].sort()])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify([data.currentMemberId, meds, data.settings.lateMinutes, data.settings.timeZone ?? '']);
}

/** Thay lịch thuốc và cài đặt trên máy bằng bản mới nhất đọc từ máy chủ (chỉ dùng trong bộ nhớ, không ghi đè dữ liệu đã lưu). */
export function withSchedule(data: AppData, remote: { medications: AppData['medications']; settings?: AppData['settings'] }): AppData {
  return { ...data, medications: remote.medications, settings: { ...data.settings, ...(remote.settings ?? {}) } };
}

/** Lời báo cho bố mẹ khi con vừa đổi lịch thuốc: giờ uống mới trong ngày. */
export function scheduleNotice(data: AppData): { title: string; body: string } | undefined {
  const m = data.members.find((x) => x.id === data.currentMemberId);
  if (!m) return undefined;
  const times = [...new Set(data.medications.filter((x) => x.memberId === m.id).flatMap((x) => x.times))].sort();
  return {
    title: `${m.self} vừa cập nhật lịch thuốc cho ${m.call.toLowerCase()}`,
    body: times.length ? `Giờ uống mới: ${times.join(', ')}. Đến giờ máy sẽ nhắc.` : 'Hiện không còn thuốc nào cần nhắc.',
  };
}
