// Lịch nhắc lại khi bố mẹ chưa bấm "Đã uống", và tìm lần uống từ một thông báo.
import { slotsForDay, type DoseSlot } from './schedule';
import type { AppData } from './types';
import { addDays, atTime, dateKey } from './time';

/**
 * Nhắc lại sau bao nhiêu phút. Nhắc 2 lần trước mốc báo cho con (lateMinutes),
 * vd trễ 30 phút mới báo con → nhắc lại sau 10 và 20 phút.
 */
export function followUpOffsets(lateMinutes: number): number[] {
  const a = Math.max(5, Math.round(lateMinutes / 3));
  const b = Math.max(a + 5, Math.round((lateMinutes * 2) / 3));
  return [a, b].filter((m) => m < lateMinutes);
}

export interface FollowUp {
  at: Date;
  date: string;
  time: string;
  /** Lần nhắc lại thứ mấy (1, 2). */
  n: number;
}

/**
 * Các lần nhắc lại cần đặt trong `days` ngày tới, chỉ cho những lần uống chưa ghi nhận.
 * Đặt lại mỗi khi mở app hoặc bấm "Đã uống", nên lần đã uống sẽ không bị nhắc lại.
 */
export function followUps(data: AppData, memberId: string, now: Date, days = 2): FollowUp[] {
  const offsets = followUpOffsets(data.settings.lateMinutes);
  const out: FollowUp[] = [];
  for (let d = 0; d < days; d++) {
    const day = addDays(now, d);
    for (const slot of slotsForDay(data.medications, data.doseLogs, memberId, day, now, data.settings.lateMinutes)) {
      if (slot.status === 'taken' || slot.status === 'skipped') continue;
      offsets.forEach((min, i) => {
        const at = new Date(atTime(day, slot.time).getTime() + min * 60_000);
        if (at > now) out.push({ at, date: slot.date, time: slot.time, n: i + 1 });
      });
    }
  }
  return out;
}

/** Lần uống mà thông báo nói tới (ngày + giờ). Trả về undefined nếu đã ghi nhận rồi hoặc không còn thuốc giờ đó. */
export function slotFromNotification(
  data: AppData,
  memberId: string,
  info: { date?: string; time?: string },
  now: Date,
): DoseSlot | undefined {
  if (!info.time) return undefined;
  const date = info.date ?? dateKey(now);
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const slot = slotsForDay(data.medications, data.doseLogs, memberId, day, now, data.settings.lateMinutes).find(
    (s) => s.time === info.time,
  );
  if (!slot || slot.status === 'taken' || slot.status === 'skipped') return undefined;
  return slot;
}

export interface VisitReminder {
  at: Date;
  title: string;
  body: string;
  appointmentId: string;
}

/** Giờ nhắc lịch khám: 19:00 tối hôm trước, và 2 tiếng trước giờ khám. */
export const VISIT_EVE = '19:00';
export const VISIT_BEFORE_MIN = 120;

/**
 * Nhắc lịch khám trên máy bố mẹ (thông báo trên máy, không cần mạng): tối hôm trước và 2 tiếng trước.
 * Chỉ các lần khám trong 30 ngày tới, chỉ giờ nhắc còn ở tương lai.
 */
export function visitReminders(data: AppData, memberId: string, now: Date): VisitReminder[] {
  const m = data.members.find((x) => x.id === memberId);
  if (!m) return [];
  const call = m.call.toLowerCase();
  const out: VisitReminder[] = [];
  const limit = addDays(now, 30);
  for (const a of data.appointments) {
    const at = new Date(a.at);
    if (a.memberId !== memberId || at <= now || at > limit) continue;
    const time = `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;
    const where = a.place ? ` · ${a.place}` : '';
    const who = a.companion ? ` ${a.companion} đưa ${call} đi.` : '';
    const eve = atTime(addDays(at, -1), VISIT_EVE);
    if (eve > now) {
      out.push({
        at: eve,
        title: `Mai ${call} đi khám lúc ${time}`,
        body: `${a.title}${where}.${who} Nhớ mang sổ khám bệnh và thẻ bảo hiểm y tế.`,
        appointmentId: a.id,
      });
    }
    const before = new Date(at.getTime() - VISIT_BEFORE_MIN * 60_000);
    if (before > now && before > eve) {
      out.push({
        at: before,
        title: `2 tiếng nữa ${call} đi khám (${time})`,
        body: `${a.title}${where}.${who}`,
        appointmentId: a.id,
      });
    }
  }
  return out.sort((x, y) => x.at.getTime() - y.at.getTime());
}
