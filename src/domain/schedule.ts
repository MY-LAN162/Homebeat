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

/** Thuốc uống hằng ngày, không theo đợt (để đặt nhắc lặp lại mỗi ngày). */
export function isPlainDaily(m: Medication): boolean {
  return !m.until && !(m.every && m.every > 1) && !(m.weekdays && m.weekdays.length && m.weekdays.length < 7);
}

/** Ngày `day` có phải uống thuốc này không (theo đợt, cách ngày, theo thứ). */
export function takesOn(m: Medication, day: Date): boolean {
  const key = dateKey(day);
  if (m.start && key < m.start) return false;
  if (m.until && key > m.until) return false;
  if (m.weekdays && m.weekdays.length && !m.weekdays.includes(day.getDay())) return false;
  if (m.every && m.every > 1) {
    const anchor = m.start ?? (m.createdAt ? dateKey(new Date(m.createdAt)) : key);
    const [y, mo, d] = anchor.split('-').map(Number);
    const diff = Math.round((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - new Date(y, mo - 1, d).getTime()) / 86400_000);
    if (diff % m.every !== 0) return false;
  }
  return true;
}

const WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Cách uống bằng lời: "Cách ngày · còn 3 ngày", "T2, T4, T6", "Đã hết đợt (17/11)". Trống nếu hằng ngày, lâu dài. */
export function scheduleText(m: Medication, now: Date): string {
  const parts: string[] = [];
  if (m.every && m.every > 1) parts.push(m.every === 2 ? 'Cách ngày' : `${m.every} ngày một lần`);
  if (m.weekdays?.length && m.weekdays.length < 7) parts.push([...m.weekdays].sort().map((d) => WEEK[d]).join(', '));
  if (m.until) {
    const [y, mo, d] = m.until.split('-').map(Number);
    const end = new Date(y, mo - 1, d);
    if (courseEnded(m, now)) parts.push(`Đã hết đợt (${d}/${mo})`);
    else {
      const left = Math.round((end.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400_000) + 1;
      parts.push(`Theo đợt: còn ${left} ngày (tới ${d}/${mo})`);
    }
  }
  return parts.join(' · ');
}

/** Thuốc đã hết đợt (qua ngày cuối). */
export function courseEnded(m: Medication, now: Date): boolean {
  return !!m.until && dateKey(now) > m.until;
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
    if (med.memberId !== memberId || !takesOn(med, day)) continue;
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
  // Trung bình mỗi ngày: cách ngày thì chia 2, theo thứ thì nhân số thứ / 7.
  const freq = (med.every && med.every > 1 ? 1 / med.every : 1) * (med.weekdays?.length ? med.weekdays.length / 7 : 1);
  const perDay = med.pillsPerDose * med.times.length * freq;
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
    const active = activeMedsOn(meds, logs, memberId, dateKey(day));
    for (const slot of slotsForDay(active, logs, memberId, day, now, Number.MAX_SAFE_INTEGER)) {
      if (slot.status === 'upcoming') continue;
      scheduled += 1;
      if (slot.status === 'taken') taken += 1;
    }
  }
  return { taken, scheduled };
}

/**
 * Thuốc phải uống trong ngày `key` ("YYYY-MM-DD").
 * Thuốc có ngày thêm: tính từ ngày đó. Thuốc nhập từ bản cũ (chưa có ngày thêm): tính từ ngày đầu tiên
 * có nhật ký uống thuốc của người này, để không coi những ngày app chưa dùng là "quên thuốc".
 */
export function activeMedsOn(meds: Medication[], logs: DoseLog[], memberId: string, key: string): Medication[] {
  let firstLog: string | undefined;
  for (const l of logs) if (l.memberId === memberId && (!firstLog || l.date < firstLog)) firstLog = l.date;
  return meds.filter((m) => {
    if (m.createdAt) return dateKey(new Date(m.createdAt)) <= key;
    return firstLog ? firstLog <= key : true;
  });
}

/** Cho bấm "Đã uống" sớm tối đa bao nhiêu phút trước giờ uống. */
export const EARLY_MINUTES = 60;

/** Còn bao nhiêu phút nữa tới giờ uống (âm = đã qua giờ). */
export function minutesUntil(slot: DoseSlot, now: Date): number {
  return toMinutes(slot.time) - (now.getHours() * 60 + now.getMinutes());
}

/** Lúc này có được bấm "Đã uống" cho lần này không: đã đến giờ / trễ, hoặc chỉ còn ≤ 60 phút. */
export function canTakeNow(slot: DoseSlot, now: Date): boolean {
  if (slot.status === 'due' || slot.status === 'late') return true;
  return slot.status === 'upcoming' && minutesUntil(slot, now) <= EARLY_MINUTES;
}

/** Số viên bằng chữ, dễ hiểu với người lớn tuổi: "nửa viên", "1 viên rưỡi", "2 viên". */
export function pillsText(n: number): string {
  if (n === 0.5) return 'nửa viên';
  if (n === 0.25) return 'một phần tư viên';
  if (Number.isInteger(n)) return `${n} viên`;
  if (Number.isInteger(n - 0.5)) return `${n - 0.5} viên rưỡi`;
  return `${String(n).replace('.', ',')} viên`;
}

/** Ghi nhận cả một giờ uống (mọi thuốc trong giờ đó). */
export function logSlot(slot: DoseSlot, status: DoseLog['status'], at: Date, reason?: DoseLog['reason']): DoseLog[] {
  return slot.meds.map((m) => ({
    memberId: slot.memberId,
    medId: m.id,
    date: slot.date,
    time: slot.time,
    status,
    at: at.toISOString(),
    ...(status === 'skipped' && reason ? { reason } : {}),
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
