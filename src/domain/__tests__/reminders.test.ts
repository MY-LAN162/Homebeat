import { followUpOffsets, followUps, slotFromNotification } from '../reminders';
import { emptyData, type AppData } from '../types';

const base = (): AppData => ({
  ...emptyData(),
  role: 'parent',
  currentMemberId: 'bo',
  members: [{ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' }],
  medications: [
    { id: 'a', memberId: 'bo', name: 'Amlodipin', pillsPerDose: 1, times: ['07:00', '19:00'] },
  ],
});

describe('nhắc lại khi chưa bấm "Đã uống"', () => {
  it('nhắc 2 lần trước mốc báo cho con', () => {
    expect(followUpOffsets(30)).toEqual([10, 20]);
    expect(followUpOffsets(60)).toEqual([20, 40]);
    expect(followUpOffsets(15)).toEqual([5, 10]);
  });

  it('chỉ nhắc lại lần chưa uống, và chỉ những lần còn ở phía trước', () => {
    const now = new Date(2026, 9, 1, 7, 5);
    const d = base();
    const list = followUps(d, 'bo', now, 1).map((f) => `${f.time}+${f.n}`);
    expect(list).toEqual(['07:00+1', '07:00+2', '19:00+1', '19:00+2']);

    d.doseLogs = [{ memberId: 'bo', medId: 'a', date: '2026-10-01', time: '07:00', status: 'taken', at: now.toISOString() }];
    expect(followUps(d, 'bo', now, 1).map((f) => f.time)).toEqual(['19:00', '19:00']);
  });

  it('bấm "Đã uống" trên thông báo: tìm đúng lần uống, bỏ qua nếu đã ghi', () => {
    const now = new Date(2026, 9, 1, 7, 15);
    const d = base();
    const slot = slotFromNotification(d, 'bo', { time: '07:00' }, now);
    expect(slot?.meds.map((m) => m.id)).toEqual(['a']);
    d.doseLogs = [{ memberId: 'bo', medId: 'a', date: '2026-10-01', time: '07:00', status: 'taken', at: now.toISOString() }];
    expect(slotFromNotification(d, 'bo', { time: '07:00', date: '2026-10-01' }, now)).toBeUndefined();
    expect(slotFromNotification(d, 'bo', { time: '12:00' }, now)).toBeUndefined();
  });
});

describe('bảng 30 ngày cho bác sĩ', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { doctorReport, reportText } = require('../report');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { demoData } = require('../seed');
  const now = new Date(2026, 9, 1, 21, 0);
  const data = demoData(now);

  it('tính huyết áp, uống thuốc, triệu chứng từ dữ liệu thật trong app', () => {
    const r = doctorReport(data, 'bo', now, 30);
    expect(r.bp.readings.length).toBe(data.bpReadings.filter((x: { memberId: string }) => x.memberId === 'bo').length);
    expect(r.bp.maxSys).toBe(Math.max(...data.bpReadings.filter((x: { memberId: string }) => x.memberId === 'bo').map((x: { sys: number }) => x.sys)));
    expect(r.adherence.taken).toBeLessThanOrEqual(r.adherence.scheduled);
    expect(r.adherence.onTime).toBeLessThanOrEqual(r.adherence.taken);
    expect(r.missedByMed.length).toBeGreaterThan(0);
    const text = reportText(data.members[0], r);
    expect(text).toContain('HUYẾT ÁP');
    expect(text).toContain('THUỐC ĐANG DÙNG');
  });

  it('không có dữ liệu thì ghi "chưa", không bịa số', () => {
    const empty = { ...data, bpReadings: [], medications: [], checkins: [], doseLogs: [] };
    const r = doctorReport(empty, 'bo', now, 30);
    expect(r.bp.avgSys).toBeUndefined();
    expect(r.adherence.pct).toBeUndefined();
    expect(reportText(data.members[0], r)).toContain('Chưa đo lần nào');
  });
});

describe('không tính những ngày app chưa dùng là quên thuốc', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { adherence } = require('../schedule');
  it('thuốc nhập từ bản cũ chỉ tính từ ngày đầu có nhật ký', () => {
    const now = new Date(2026, 9, 10, 20, 0);
    const med = { id: 'x', memberId: 'bo', name: 'X', pillsPerDose: 1, times: ['07:00'] };
    const logs = [8, 9, 10].map((d) => ({ memberId: 'bo', medId: 'x', date: `2026-10-${String(d).padStart(2, '0')}`, time: '07:00', status: 'taken' as const, at: '' }));
    expect(adherence([med], logs, 'bo', now, 30)).toEqual({ taken: 3, scheduled: 3 });
  });
});
