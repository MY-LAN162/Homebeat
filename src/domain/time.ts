// Tiện ích ngày giờ, dùng giờ địa phương của máy.

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "07:30" -> 450 (phút tính từ 0 giờ). */
export function toMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) throw new Error(`Giờ không hợp lệ: ${time}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Giờ không hợp lệ: ${time}`);
  return h * 60 + min;
}

export function isValidTime(time: string): boolean {
  try {
    toMinutes(time);
    return true;
  } catch {
    return false;
  }
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Ngày giờ của mốc "HH:MM" trong ngày `day`. */
export function atTime(day: Date, time: string): Date {
  const mins = toMinutes(time);
  const d = new Date(day);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "Thứ Bảy, 26 tháng 9" */
export function formatLongDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
}

/** "Thứ Ba 30/9" */
export function formatShortDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** "35 phút", "2 giờ 20 phút" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} phút`;
  if (r === 0) return `${h} giờ`;
  return `${h} giờ ${r} phút`;
}

/** Thời điểm `now` có nằm trong khoảng ngủ (có thể qua nửa đêm) không. */
export function inWindow(now: Date, start: string, end: string): boolean {
  const n = minutesOfDay(now);
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? n >= s && n < e : n >= s || n < e;
}
