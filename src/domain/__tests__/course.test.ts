import { doseReminderPlan } from '../reminders';
import { courseEnded, daysOfStock, scheduleText, slotsForDay, takesOn } from '../schedule';
import { emptyData, type AppData, type Medication } from '../types';

const base: Medication = { id: 'k', memberId: 'bo', name: 'Kháng sinh', pillsPerDose: 1, times: ['08:00', '20:00'] };
const d = (y: number, m: number, day: number, h = 9) => new Date(y, m - 1, day, h);

describe('thuốc theo đợt, cách ngày, theo thứ', () => {
  it('đợt 7 ngày: uống từ ngày đầu tới ngày cuối, sau đó tự dừng', () => {
    const m = { ...base, start: '2026-11-10', until: '2026-11-16' };
    expect(takesOn(m, d(2026, 11, 9))).toBe(false);
    expect(takesOn(m, d(2026, 11, 10))).toBe(true);
    expect(takesOn(m, d(2026, 11, 16))).toBe(true);
    expect(takesOn(m, d(2026, 11, 17))).toBe(false);
    expect(courseEnded(m, d(2026, 11, 17))).toBe(true);
    expect(slotsForDay([m], [], 'bo', d(2026, 11, 17), d(2026, 11, 17), 30)).toEqual([]);
    expect(scheduleText(m, d(2026, 11, 14))).toBe('Theo đợt: còn 3 ngày (tới 16/11)');
    expect(scheduleText(m, d(2026, 11, 17))).toBe('Đã hết đợt (16/11)');
  });
  it('cách ngày tính từ ngày bắt đầu; theo thứ chỉ đúng thứ đã chọn', () => {
    const e = { ...base, start: '2026-11-10', every: 2 };
    expect([10, 11, 12, 13].map((x) => takesOn(e, d(2026, 11, x)))).toEqual([true, false, true, false]);
    const w = { ...base, weekdays: [1, 3, 5] }; // T2, T4, T6
    expect(takesOn(w, d(2026, 11, 9))).toBe(true); // Thứ hai 9/11/2026
    expect(takesOn(w, d(2026, 11, 10))).toBe(false);
    expect(scheduleText(w, d(2026, 11, 10))).toBe('T2, T4, T6');
    expect(scheduleText(e, d(2026, 11, 10))).toBe('Cách ngày');
  });
  it('số ngày còn thuốc tính theo cách uống', () => {
    expect(daysOfStock({ ...base, stockPills: 20 })).toBe(10);
    expect(daysOfStock({ ...base, stockPills: 20, every: 2 })).toBe(20);
  });
  it('nhắc trên máy bố mẹ: hằng ngày thì lặp lại; có thuốc theo đợt thì đặt từng lần 7 ngày tới', () => {
    const data = (meds: Medication[]): AppData => ({ ...emptyData(), medications: meds });
    expect(doseReminderPlan(data([base]), 'bo', d(2026, 11, 10)).mode).toBe('daily');
    const plan = doseReminderPlan(data([{ ...base, start: '2026-11-10', until: '2026-11-12' }]), 'bo', d(2026, 11, 10, 9));
    expect(plan.mode).toBe('dated');
    if (plan.mode === 'dated') {
      // 10/11: chỉ còn 20:00 (8:00 đã qua); 11 và 12/11: 2 lần mỗi ngày; sau đó hết đợt.
      expect(plan.items.map((x) => `${x.at.getDate()} ${x.slot.time}`)).toEqual(['10 20:00', '11 08:00', '11 20:00', '12 08:00', '12 20:00']);
    }
  });
});
