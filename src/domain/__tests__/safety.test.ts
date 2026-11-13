import { memberAlerts } from '../alerts';
import { skipPush } from '../pushRules';
import { canTakeNow, logSlot, pillsText, slotsForDay } from '../schedule';
import { emptyData, type AppData, type Member } from '../types';

const bo: Member = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };
const data = (): AppData => ({
  ...emptyData(),
  members: [bo],
  medications: [
    { id: 'a', memberId: 'bo', name: 'Amlodipin 5mg', pillsPerDose: 1, times: ['07:00', '20:00'] },
    { id: 'b', memberId: 'bo', name: 'Bisoprolol 2,5mg', pillsPerDose: 0.5, times: ['20:00'] },
  ],
});

describe('không cho uống thuốc sớm', () => {
  it('lúc 10:00 chưa được bấm "Đã uống" cho lần 20:00; 19:05 thì được; trễ thì được', () => {
    const d = data();
    const at = (h: number, mi = 0) => new Date(2026, 10, 10, h, mi);
    const slot20 = (now: Date) => slotsForDay(d.medications, d.doseLogs, 'bo', now, now, 30).find((s) => s.time === '20:00')!;
    expect(canTakeNow(slot20(at(10)), at(10))).toBe(false);
    expect(canTakeNow(slot20(at(18, 59)), at(18, 59))).toBe(false);
    expect(canTakeNow(slot20(at(19, 5)), at(19, 5))).toBe(true);
    expect(canTakeNow(slot20(at(21)), at(21))).toBe(true);
  });
});

describe('nửa viên', () => {
  it('đọc số viên bằng chữ dễ hiểu', () => {
    expect(pillsText(0.5)).toBe('nửa viên');
    expect(pillsText(1)).toBe('1 viên');
    expect(pillsText(1.5)).toBe('1 viên rưỡi');
    expect(pillsText(2.5)).toBe('2 viên rưỡi');
    expect(pillsText(0.75)).toBe('0,75 viên');
    const slot = slotsForDay(data().medications, [], 'bo', new Date(2026, 10, 10, 20, 0), new Date(2026, 10, 10, 20, 0), 30).find((s) => s.time === '20:00')!;
    expect(pillsText(slot.pills)).toBe('1 viên rưỡi');
  });
});

describe('hết thuốc / không uống được', () => {
  it('ghi lý do, con thấy cảnh báo "không uống thuốc" (không còn báo trễ), và nhận thông báo', () => {
    const d = data();
    const now = new Date(2026, 10, 10, 7, 40);
    const slot = slotsForDay(d.medications, d.doseLogs, 'bo', now, now, 30).find((s) => s.time === '07:00')!;
    d.doseLogs = logSlot(slot, 'skipped', now, 'out');
    expect(d.doseLogs[0].reason).toBe('out');
    const al = memberAlerts(d, bo, now);
    const skip = al.find((x) => x.kind === 'skipped-dose');
    expect(skip?.title).toBe('Bố Hùng không uống thuốc 07:00');
    expect(skip?.detail).toBe('Hết thuốc: Amlodipin 5mg');
    expect(al.some((x) => x.kind === 'late-dose')).toBe(false);
    const p = skipPush(bo, '07:00', 'out', ['Amlodipin 5mg']);
    expect(p.body).toBe('Bố báo hết thuốc (1 loại). Mở app để xem, cần mua thêm.');
    expect(skipPush(bo, '07:00', 'unable', []).body).toBe('Bố báo không uống được. Nên gọi hỏi thăm.');
  });
});
