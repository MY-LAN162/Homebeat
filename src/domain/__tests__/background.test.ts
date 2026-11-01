import { backgroundPushes } from '../background';
import { emptyData, type AppData } from '../types';

const data = (): AppData => ({
  ...emptyData(),
  role: 'parent',
  currentMemberId: 'bo',
  members: [{ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' }],
  medications: [{ id: 'a', memberId: 'bo', name: 'Amlodipin', pillsPerDose: 1, times: ['07:00'] }],
  settings: { ...emptyData().settings, checkinBy: '10:00', lateMinutes: 30 },
});

describe('chạy nền trên máy bố mẹ', () => {
  it('báo trễ thuốc và chưa điểm danh một lần, lần chạy sau không báo lại', () => {
    const now = new Date(2026, 9, 1, 10, 30);
    const first = backgroundPushes(data(), now, []);
    expect(first.pushes.map((p) => p.data.kind).sort()).toEqual(['late-dose', 'no-checkin']);
    expect(first.pushes[0].body).toContain('Nên gọi hỏi thăm bố');
    const again = backgroundPushes(data(), new Date(2026, 9, 1, 10, 45), first.sent);
    expect(again.pushes).toEqual([]);
  });

  it('đã uống, đã điểm danh thì không báo', () => {
    const now = new Date(2026, 9, 1, 10, 30);
    const d = data();
    d.doseLogs = [{ memberId: 'bo', medId: 'a', date: '2026-10-01', time: '07:00', status: 'taken', at: new Date(2026, 9, 1, 7, 5).toISOString() }];
    d.checkins = [{ memberId: 'bo', at: new Date(2026, 9, 1, 7, 0).toISOString(), mood: 'good', symptoms: [] }];
    expect(backgroundPushes(d, now, []).pushes).toEqual([]);
  });

  it('sang ngày mới thì bỏ mã đã gửi hôm qua; máy con không chạy phần này', () => {
    const r = backgroundPushes(data(), new Date(2026, 9, 2, 6, 0), ['2026-10-01|bo|late-dose|x']);
    expect(r.sent).toEqual([]);
    expect(backgroundPushes({ ...data(), role: 'child' }, new Date(2026, 9, 1, 10, 30), []).pushes).toEqual([]);
  });
});
