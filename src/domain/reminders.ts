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
