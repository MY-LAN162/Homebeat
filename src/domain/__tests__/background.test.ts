import { backgroundPushes, childSignalAlerts } from '../background';
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

describe('máy con tự báo mất tín hiệu, pin yếu', () => {
  const child = (): AppData => ({
    ...data(),
    role: 'child',
    currentMemberId: undefined,
    familyId: 'f1',
    settings: { ...emptyData().settings, stillHours: 3, excludeSleep: false },
  });
  const at = (h: number, min = 0) => new Date(2026, 9, 1, h, min);

  it('máy bố mất tín hiệu quá 3 giờ: báo một lần cho lần mất đó', () => {
    const hb = { bo: { at: at(8).toISOString(), battery: 40 } };
    const first = childSignalAlerts(child(), hb, at(11, 30), []);
    expect(first.alerts.map((a) => a.data.kind)).toEqual(['no-signal']);
    expect(first.alerts[0].body).toContain('Pin lần cuối 40%');
    expect(first.alerts[0].body).toContain('Nên gọi hỏi thăm bố');
    expect(childSignalAlerts(child(), hb, at(12, 30), first.sent).alerts).toEqual([]);
    // Có tín hiệu lại rồi mất lần nữa: báo lần mới.
    const hb2 = { bo: { at: at(13).toISOString(), battery: 38 } };
    expect(childSignalAlerts(child(), hb2, at(16, 30), first.sent).alerts.map((a) => a.data.kind)).toEqual(['no-signal']);
  });

  it('còn tín hiệu, chưa quá 3 giờ: không báo', () => {
    expect(childSignalAlerts(child(), { bo: { at: at(10).toISOString(), battery: 60 } }, at(11), []).alerts).toEqual([]);
  });

  it('pin còn 15% trở xuống khi máy vẫn có tín hiệu: nhắc sạc, mỗi ngày một lần', () => {
    const hb = { bo: { at: at(10, 50).toISOString(), battery: 12 } };
    const r = childSignalAlerts(child(), hb, at(11), []);
    expect(r.alerts.map((a) => a.title)).toEqual(['Pin máy của bố còn 12%']);
    expect(r.alerts[0].body).toContain('cắm sạc');
    expect(childSignalAlerts(child(), { bo: { at: at(14).toISOString(), battery: 9 } }, at(14, 5), r.sent).alerts).toEqual([]);
  });

  it('chỉ máy con, không chạy ở chế độ dùng thử', () => {
    const hb = { bo: { at: at(6).toISOString(), battery: 5 } };
    expect(childSignalAlerts({ ...child(), role: 'parent' }, hb, at(11), []).alerts).toEqual([]);
    expect(childSignalAlerts({ ...child(), demo: true }, hb, at(11), []).alerts).toEqual([]);
  });

  it('bỏ qua giờ ngủ nếu con đã bật', () => {
    const d = { ...child(), settings: { ...child().settings, excludeSleep: true, sleepStart: '22:00', sleepEnd: '06:00' } };
    expect(childSignalAlerts(d, { bo: { at: at(19).toISOString() } }, new Date(2026, 9, 1, 23, 30), []).alerts).toEqual([]);
  });
});
