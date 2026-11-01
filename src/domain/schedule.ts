// Lịch uống thuốc: chia thuốc theo giờ, tính trạng thái, tính số ngày còn thuốc.
import type { DoseLog, Medication } from './types';
import { addDays, atTime, dateKey, toMinutes } from './time';

export type SlotStatus = 'taken' | 'skipped' | 'due' | 'late' | 'upcoming';

export interface DoseSlot {
  memberId: string;
  date: string;
  time: string;
  meds: Medication[];
  pills: number;
  status: SlotStatus;
  /** Số phút đã trễ (khi status = late hoặc due). */
  minutesLate: number;
}

/** Thuốc của một người, gom theo từng giờ uống trong ngày, sắp theo giờ. */
export function slotsForDay(
  meds: Medication[],
  logs: DoseLog[],
  memberId: string,
  day: Date,
  now: Date,
  lateMinutes: number,
): DoseSlot[] {
  const date = dateKey(day);
  const byTime = new Map<string, Medication[]>();
  for (const med of meds) {
    if (med.memberId !== memberId) continue;
    for (const t of med.times) {
      const list = byTime.get(t) ?? [];
      list.push(med);
      byTime.set(t, list);
    }
  }
  const times = [...byTime.keys()].sort((a, b) => toMinutes(a) - toMinutes(b));
  return times.map((time) => {
    const slotMeds = byTime.get(time)!;
    const slotLogs = logs.filter(
      (l) => l.memberId === memberId && l.date === date && l.time === time,
    );
    const allLogged = slotMeds.every((m) => slotLogs.some((l) => l.medId === m.id));
    const anyTaken = slotLogs.some((l) => l.status === 'taken');
    const diff = Math.floor((now.getTime() - atTime(day, time).getTime()) / 60000);
    let status: SlotStatus;
    if (allLogged) status = anyTaken ? 'taken' : 'skipped';
    else if (diff < 0) status = 'upcoming';
    else if (diff >= lateMinutes) status = 'late';
    else status = 'due';
    return {
      memberId,
      date,
      time,
      meds: slotMeds,
      pills: slotMeds.reduce((s, m) => s + m.pillsPerDose, 0),
      status,
      minutesLate: status === 'due' || status === 'late' ? Math.max(0, diff) : 0,
    };
  });
}

/** Lần uống cần chú ý nhất: đang đến giờ / trễ, nếu không thì lần sắp tới trong ngày. */
export function currentSlot(slots: DoseSlot[]): DoseSlot | undefined {
  return (
    slots.find((s) => s.status === 'late') ??
    slots.find((s) => s.status === 'due') ??
    slots.find((s) => s.status === 'upcoming')
  );
}

/** Số ngày còn thuốc, làm tròn xuống. undefined nếu không biết số viên còn lại. */
export function daysOfStock(med: Medication): number | undefined {
  if (med.stockPills == null) return undefined;
  const perDay = med.pillsPerDose * med.times.length;
  if (perDay <= 0) return undefined;
  return Math.floor(med.stockPills / perDay);
}

export interface Adherence {
  taken: number;
  scheduled: number;
}

/**
 * Tỷ lệ uống thuốc trong `days` ngày gần nhất (tính cả hôm nay),
 * chỉ đếm những lần đã qua giờ hẹn.
 */
export function adherence(
  meds: Medication[],
  logs: DoseLog[],
  memberId: string,
  now: Date,
  days: number,
): Adherence {
  let taken = 0;
  let scheduled = 0;
  for (let i = 0; i < days; i++) {
    const day = addDays(now, -i);
    for (const slot of slotsForDay(meds, logs, memberId, day, now, Number.MAX_SAFE_INTEGER)) {
      if (slot.status === 'upcoming') continue;
      scheduled += 1;
      if (slot.status === 'taken') taken += 1;
    }
  }
  return { taken, scheduled };
}

/** Ghi nhận cả một giờ uống (mọi thuốc trong giờ đó). */
export function logSlot(slot: DoseSlot, status: DoseLog['status'], at: Date): DoseLog[] {
  return slot.meds.map((m) => ({
    memberId: slot.memberId,
    medId: m.id,
    date: slot.date,
    time: slot.time,
    status,
    at: at.toISOString(),
  }));
}

/** Trừ số viên còn lại sau khi uống. */
export function consumeStock(meds: Medication[], slot: DoseSlot): Medication[] {
  const ids = new Set(slot.meds.map((m) => m.id));
  return meds.map((m) =>
    ids.has(m.id) && m.stockPills != null
      ? { ...m, stockPills: Math.max(0, m.stockPills - m.pillsPerDose) }
      : m,
  );
}
