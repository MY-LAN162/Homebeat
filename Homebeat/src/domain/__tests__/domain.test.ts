import { greeting, medPrompt, okLabel, tookLabel } from '../address';
import { familyAlerts, isBpHigh, memberAlerts, memberStatus } from '../alerts';
import { checkCode, createPairing, formatCode, generateCode } from '../pairing';
import { adherence, consumeStock, currentSlot, daysOfStock, logSlot, slotsForDay } from '../schedule';
import { demoData } from '../seed';
import { formatDuration, formatLongDate, inWindow, toMinutes } from '../time';
import type { AppData, Medication } from '../types';
import { DEFAULT_SETTINGS, emptyData } from '../types';

const at = (s: string) => new Date(s);

describe('time', () => {
  it('đổi giờ ra phút và báo lỗi giờ sai', () => {
    expect(toMinutes('07:30')).toBe(450);
    expect(() => toMinutes('25:00')).toThrow();
    expect(() => toMinutes('7h')).toThrow();
  });
  it('định dạng ngày và khoảng thời gian tiếng Việt', () => {
    expect(formatLongDate(at('2026-09-26T09:00:00'))).toBe('Thứ Bảy, 26 tháng 9');
    expect(formatDuration(35)).toBe('35 phút');
    expect(formatDuration(140)).toBe('2 giờ 20 phút');
    expect(formatDuration(120)).toBe('2 giờ');
  });
  it('khung giờ ngủ qua nửa đêm', () => {
    expect(inWindow(at('2026-09-26T23:00:00'), '22:00', '06:00')).toBe(true);
    expect(inWindow(at('2026-09-26T05:59:00'), '22:00', '06:00')).toBe(true);
    expect(inWindow(at('2026-09-26T06:00:00'), '22:00', '06:00')).toBe(false);
  });
});

describe('xưng hô', () => {
  const bo = { name: 'Hùng', call: 'Bố' as const, self: 'Con' as const };
  const ba = { name: 'Lan', call: 'Bà' as const, self: 'Cháu' as const };
  it('nói đúng cách gọi', () => {
    expect(greeting(bo, at('2026-09-26T08:00:00'))).toBe('Chào buổi sáng, bố Hùng');
    expect(greeting(ba, at('2026-09-26T20:00:00'))).toBe('Chào buổi tối, bà Lan');
    expect(okLabel(bo)).toBe('Con ơi, bố ổn');
    expect(okLabel(ba)).toBe('Cháu ơi, bà ổn');
    expect(medPrompt(ba)).toBe('Đến giờ uống thuốc rồi bà ơi');
    expect(tookLabel(bo)).toBe('Bố đã uống');
  });
});

const meds: Medication[] = [
  { id: 'a', memberId: 'bo', name: 'A', pillsPerDose: 1, times: ['07:00'], stockPills: 4 },
  { id: 'b', memberId: 'bo', name: 'B', pillsPerDose: 1, times: ['07:00', '12:00', '19:00'], stockPills: 78 },
  { id: 'c', memberId: 'bo', name: 'C', pillsPerDose: 2, times: ['12:00'] },
  { id: 'x', memberId: 'me', name: 'X', pillsPerDose: 1, times: ['08:00'] },
];

describe('lịch thuốc', () => {
  const day = at('2026-09-26T12:10:00');
  it('gom thuốc theo giờ và sắp xếp', () => {
    const slots = slotsForDay(meds, [], 'bo', day, day, 30);
    expect(slots.map((s) => s.time)).toEqual(['07:00', '12:00', '19:00']);
    expect(slots[1].meds.map((m) => m.id)).toEqual(['b', 'c']);
    expect(slots[1].pills).toBe(3);
  });
  it('tính trạng thái đúng giờ / trễ / sắp tới', () => {
    const slots = slotsForDay(meds, [], 'bo', day, day, 30);
    expect(slots[0].status).toBe('late');
    expect(slots[1].status).toBe('due');
    expect(slots[1].minutesLate).toBe(10);
    expect(slots[2].status).toBe('upcoming');
    expect(currentSlot(slots)?.time).toBe('07:00');
  });
  it('ghi đã uống cho cả giờ và trừ thuốc', () => {
    const slots = slotsForDay(meds, [], 'bo', day, day, 30);
    const logs = logSlot(slots[0], 'taken', day);
    expect(logs).toHaveLength(2);
    const after = slotsForDay(meds, logs, 'bo', day, day, 30);
    expect(after[0].status).toBe('taken');
    expect(currentSlot(after)?.time).toBe('12:00');
    const left = consumeStock(meds, slots[0]);
    expect(left.find((m) => m.id === 'a')?.stockPills).toBe(3);
    expect(left.find((m) => m.id === 'c')?.stockPills).toBeUndefined();
  });
  it('bỏ qua cả giờ thì là skipped', () => {
    const slots = slotsForDay(meds, [], 'bo', day, day, 30);
    const after = slotsForDay(meds, logSlot(slots[0], 'skipped', day), 'bo', day, day, 30);
    expect(after[0].status).toBe('skipped');
  });
  it('số ngày còn thuốc', () => {
    expect(daysOfStock(meds[0])).toBe(4);
    expect(daysOfStock(meds[1])).toBe(26);
    expect(daysOfStock(meds[2])).toBeUndefined();
  });
  it('tỷ lệ uống chỉ đếm lần đã qua giờ', () => {
    const now = at('2026-09-26T12:10:00');
    const slots = slotsForDay(meds, [], 'bo', now, now, 30);
    const r = adherence(meds, logSlot(slots[0], 'taken', now), 'bo', now, 1);
    expect(r).toEqual({ taken: 1, scheduled: 2 });
  });
});

describe('cảnh báo', () => {
  const base = (): AppData => ({
    ...emptyData(),
    members: [{ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' }],
    medications: meds.map((m) => ({ ...m })),
  });
  it('báo trễ thuốc sau ngưỡng', () => {
    const a = memberAlerts(base(), base().members[0], at('2026-09-26T07:45:00'));
    expect(a.find((x) => x.kind === 'late-dose')?.title).toBe('Bố Hùng chưa uống thuốc 07:00');
    expect(a.find((x) => x.kind === 'late-dose')?.detail).toBe('Đã trễ 45 phút');
  });
  it('báo chưa điểm danh sau giờ đã đặt, hết báo khi đã điểm danh', () => {
    const now = at('2026-09-26T10:30:00');
    const d = base();
    expect(memberAlerts(d, d.members[0], now).some((x) => x.kind === 'no-checkin')).toBe(true);
    d.checkins.push({ memberId: 'bo', at: at('2026-09-26T09:00:00').toISOString(), mood: 'good', symptoms: [] });
    expect(memberAlerts(d, d.members[0], now).some((x) => x.kind === 'no-checkin')).toBe(false);
  });
  it('huyết áp theo ngưỡng con đặt', () => {
    expect(isBpHigh(135, 85, DEFAULT_SETTINGS)).toBe(false);
    expect(isBpHigh(151, 85, DEFAULT_SETTINGS)).toBe(true);
    expect(isBpHigh(130, 92, DEFAULT_SETTINGS)).toBe(true);
  });
  it('SOS là khẩn cấp và được xếp đầu', () => {
    const now = at('2026-09-26T13:00:00');
    const d = base();
    d.sosEvents.push({ id: 's', memberId: 'bo', at: at('2026-09-26T12:58:00').toISOString(), cancelled: false });
    const all = familyAlerts(d, now);
    expect(all[0].kind).toBe('sos');
    expect(memberStatus(all)).toBe('urgent');
  });
  it('SOS đã hủy thì không báo', () => {
    const d = base();
    d.sosEvents.push({ id: 's', memberId: 'bo', at: at('2026-09-26T12:58:00').toISOString(), cancelled: true });
    expect(familyAlerts(d, at('2026-09-26T13:00:00')).some((x) => x.kind === 'sos')).toBe(false);
  });
  it('mất tín hiệu nhưng không báo trong giờ ngủ', () => {
    const d = base();
    d.members[0].lastSeenAt = at('2026-09-26T18:00:00').toISOString();
    expect(memberAlerts(d, d.members[0], at('2026-09-26T21:30:00')).some((x) => x.kind === 'no-signal')).toBe(true);
    expect(memberAlerts(d, d.members[0], at('2026-09-26T23:30:00')).some((x) => x.kind === 'no-signal')).toBe(false);
  });
  it('dữ liệu mẫu chạy được', () => {
    const now = at('2026-09-26T12:40:00');
    const d = demoData(now);
    const all = familyAlerts(d, now);
    expect(all.some((x) => x.kind === 'late-dose' && x.memberId === 'me')).toBe(true);
    expect(all.some((x) => x.kind === 'low-stock' && x.title.startsWith('Amlodipine'))).toBe(true);
  });
});

describe('mã kết nối', () => {
  it('tạo mã 6 số và kiểm tra', () => {
    const now = at('2026-09-26T09:00:00');
    expect(generateCode()).toMatch(/^\d{6}$/);
    const p = createPairing('bo', now, () => 0.5);
    expect(p.code).toBe('555555');
    expect(formatCode('482913')).toBe('482 913');
    expect(checkCode('555 555', p, now)).toEqual({ ok: true, memberId: 'bo' });
    expect(checkCode('123456', p, now)).toEqual({ ok: false, reason: 'wrong' });
    expect(checkCode('12', p, now)).toEqual({ ok: false, reason: 'format' });
    expect(checkCode('555555', p, at('2026-09-27T09:01:00'))).toEqual({ ok: false, reason: 'expired' });
  });
});
