// Xưng hô: app nói với bố mẹ theo đúng cách con gọi.
import type { Member } from './types';

export function callLower(m: Pick<Member, 'call'>): string {
  return m.call.toLowerCase();
}

export function partOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 11) return 'buổi sáng';
  if (h < 13) return 'buổi trưa';
  if (h < 18) return 'buổi chiều';
  return 'buổi tối';
}

/** "Chào buổi sáng, bố Hùng" */
export function greeting(m: Pick<Member, 'call' | 'name'>, now: Date): string {
  return `Chào ${partOfDay(now)}, ${callLower(m)} ${m.name}`;
}

/** Nút điểm danh: "Con ơi, bố ổn" */
export function okLabel(m: Pick<Member, 'call' | 'self'>): string {
  return `${m.self} ơi, ${callLower(m)} ổn`;
}

/** "Đến giờ uống thuốc rồi bố ơi" */
export function medPrompt(m: Pick<Member, 'call'>): string {
  return `Đến giờ uống thuốc rồi ${callLower(m)} ơi`;
}

/** "Bố đã uống" */
export function tookLabel(m: Pick<Member, 'call'>): string {
  return `${m.call} đã uống`;
}

/** Tên hiển thị phía con: "Bố Hùng" */
export function displayName(m: Pick<Member, 'call' | 'name'>): string {
  return `${m.call} ${m.name}`;
}
