// Việc máy bố mẹ làm khi chạy nền (khoảng 15 phút một lần, tùy điện thoại cho phép):
// tìm cảnh báo cần báo cho con mà chưa báo. Hàm thuần, không gọi máy chủ.
import { memberAlerts, type AlertKind } from './alerts';
import { isPlainDaily } from './schedule';
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
    .map((m) => [m.id, m.name, m.pillsPerDose, [...m.times].sort(), m.start ?? '', m.until ?? '', m.every ?? 1, m.weekdays ?? []])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const visits = data.appointments
    .filter((a) => a.memberId === data.currentMemberId)
    .map((a) => [a.id, a.at, a.title, a.place ?? '', a.companion ?? ''])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  // Có thuốc không uống hằng ngày: nhắc được đặt cho 7 ngày tới, nên mỗi ngày đặt lại một lần.
  const rolling = data.medications.some((m) => m.memberId === data.currentMemberId && !isPlainDaily(m)) ? dateKey(new Date()) : '';
  return JSON.stringify([data.currentMemberId, meds, visits, data.settings.lateMinutes, data.settings.timeZone ?? '', rolling]);
}

/** Thay lịch thuốc và cài đặt trên máy bằng bản mới nhất đọc từ máy chủ (chỉ dùng trong bộ nhớ, không ghi đè dữ liệu đã lưu). */
export function withSchedule(
  data: AppData,
  remote: { medications: AppData['medications']; appointments?: AppData['appointments']; settings?: AppData['settings'] },
): AppData {
  return {
    ...data,
    medications: remote.medications,
    appointments: remote.appointments ?? data.appointments,
    settings: { ...data.settings, ...(remote.settings ?? {}) },
  };
}

/**
 * Lời báo cho bố mẹ khi con vừa đổi lịch: lịch thuốc (giờ uống mới), hoặc lịch đi khám (lần khám tới).
 * `oldKey`: dấu lịch trước đó (scheduleKey) để biết đổi phần nào. Không đổi gì đáng báo thì undefined.
 */
export function scheduleNotice(data: AppData, oldKey?: string): { title: string; body: string } | undefined {
  const m = data.members.find((x) => x.id === data.currentMemberId);
  if (!m) return undefined;
  let medsChanged = true;
  let visitsChanged = false;
  try {
    const [o, n] = [JSON.parse(oldKey ?? 'null') as unknown[] | null, JSON.parse(scheduleKey(data)) as unknown[]];
    if (o) {
      medsChanged = JSON.stringify(o[1]) !== JSON.stringify(n[1]);
      visitsChanged = JSON.stringify(o[2]) !== JSON.stringify(n[2]);
    }
  } catch {
    /* dấu cũ hỏng: coi như đổi lịch thuốc */
  }
  if (!medsChanged) {
    if (!visitsChanged) return undefined;
    const next = data.appointments
      .filter((a) => a.memberId === m.id && new Date(a.at) > new Date())
      .sort((a, b) => a.at.localeCompare(b.at))[0];
    return {
      title: `${m.self} vừa cập nhật lịch đi khám của ${m.call.toLowerCase()}`,
      body: next ? `Lần tới: ${next.title}, ${new Date(next.at).toLocaleDateString('vi-VN')}. Hôm trước máy sẽ nhắc.` : 'Hiện không có lịch khám sắp tới.',
    };
  }
  const times = [...new Set(data.medications.filter((x) => x.memberId === m.id).flatMap((x) => x.times))].sort();
  return {
    title: `${m.self} vừa cập nhật lịch thuốc cho ${m.call.toLowerCase()}`,
    body: times.length ? `Giờ uống mới: ${times.join(', ')}. Đến giờ máy sẽ nhắc.` : 'Hiện không còn thuốc nào cần nhắc.',
  };
}
