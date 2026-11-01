import { demoData } from '../seed';
import { parsePrescription, rxToMedication, SAMPLE_RX } from '../rx';
import { applyMedChange, SAMPLE_TRANSCRIPT, suggestQuestions, summarizeVisit } from '../visit';

describe('đọc đơn thuốc', () => {
  it('đọc đơn mẫu: tên, hàm lượng, buổi, số viên, sau ăn', () => {
    const items = parsePrescription(SAMPLE_RX);
    expect(items.map((i) => i.name)).toEqual(['Amlodipine 5mg', 'Metformin 500mg', 'Aspirin 81mg']);
    expect(items[0]).toMatchObject({ strength: '5mg', parts: ['Sáng'], pillsPerDose: 1, afterMeal: true, days: 30, totalPills: 30 });
    expect(items[1].parts).toEqual(['Sáng', 'Tối']);
    expect(items[1].totalPills).toBe(60);
    expect(items[2].parts).toEqual(['Trưa']);
    expect(items[0].doubts).toEqual([]);
  });

  it('nửa viên, ngày 2 lần không ghi buổi thì đánh dấu để kiểm tra', () => {
    const [it] = parsePrescription('1. Bisoprolol 2,5mg\nNgày 2 lần, mỗi lần 1/2 viên');
    expect(it.pillsPerDose).toBe(0.5);
    expect(it.parts).toEqual(['Sáng', 'Tối']);
    expect(it.doubts.length).toBe(1);
  });

  it('chữ không dấu (ảnh mờ) vẫn đọc được', () => {
    const [it] = parsePrescription('Amlodipin 5 mg\nsang 1 vien sau an');
    expect(it).toMatchObject({ strength: '5mg', parts: ['Sáng'], afterMeal: true });
  });

  it('thuốc thiếu thông tin thì báo chưa chắc', () => {
    const [it] = parsePrescription('2. Vitamin tổng hợp');
    expect(it.doubts).toContain('Chưa đọc được uống buổi nào');
  });

  it('đổi thành lịch uống', () => {
    const [it] = parsePrescription(SAMPLE_RX).slice(1);
    expect(rxToMedication(it, 'bo')).toMatchObject({ times: ['07:00', '19:00'], stockPills: 60 });
  });
});

describe('đi khám', () => {
  const now = new Date(2026, 8, 27, 9, 0);
  const data = demoData(now);

  it('gợi ý câu hỏi dựa trên dữ liệu, kèm lý do', () => {
    const qs = suggestQuestions(data, 'bo', now);
    expect(qs.some((x) => x.q.startsWith('Huyết áp tuần này'))).toBe(true);
    for (const x of qs) expect(x.why.length).toBeGreaterThan(0);
  });

  it('không có dữ liệu thì không bịa câu hỏi', () => {
    const empty = { ...data, bpReadings: [], checkins: [], doseLogs: [], medications: [] };
    expect(suggestQuestions(empty, 'bo', now)).toEqual([]);
  });

  it('tóm tắt lời bác sĩ: nhận xét, đổi thuốc, việc cần làm, tái khám', () => {
    const meds = [{ id: 'amlo', memberId: 'bo', name: 'Amlodipine 5mg', pillsPerDose: 1, times: ['07:00'] }];
    const s = summarizeVisit(SAMPLE_TRANSCRIPT, meds);
    expect(s.medChanges).toEqual([expect.objectContaining({ name: 'Amlodipine', from: '5mg', to: '10mg', medId: 'amlo' })]);
    expect(s.nextVisit).toMatchObject({ day: 28, month: 10 });
    expect(s.todos).toHaveLength(2);
    expect(s.notes).toHaveLength(3);
    expect(applyMedChange(meds[0], s.medChanges[0]).name).toBe('Amlodipine 10mg');
  });
});

describe('múi giờ', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { toZone, offsetLabel } = require('../tz');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { memberAlerts } = require('../alerts');

  it('đổi giờ sang nơi bố mẹ sống', () => {
    const d = new Date(Date.UTC(2026, 9, 1, 3, 0)); // 10:00 ở Việt Nam
    expect(toZone(d, 'Asia/Ho_Chi_Minh').getHours()).toBe(10);
    expect(offsetLabel('Asia/Ho_Chi_Minh', d)).toBe('GMT+7');
  });

  it('giờ điểm danh tính theo giờ của bố mẹ, không theo máy của con', () => {
    const data = demoData(new Date());
    const bo = { ...data.members[0] };
    const base = { ...data, checkins: [], medications: [], bpReadings: [], sosEvents: [], settings: { ...data.settings, checkinBy: '10:00' } };
    const at9VN = new Date(Date.UTC(2026, 9, 1, 2, 0)); // 9:00 VN
    const at11VN = new Date(Date.UTC(2026, 9, 1, 4, 0)); // 11:00 VN
    const vn = { ...base, settings: { ...base.settings, timeZone: 'Asia/Ho_Chi_Minh' } };
    const kinds = (d: typeof vn, t: Date) => memberAlerts(d, bo, t).map((a: { kind: string }) => a.kind);
    expect(kinds(vn, at9VN)).not.toContain('no-checkin');
    expect(kinds(vn, at11VN)).toContain('no-checkin');
  });
});

describe('sửa lỗi phát hiện khi chạy thử', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { adherence } = require('../schedule');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { findExisting } = require('../rx');
  it('thuốc mới thêm hôm nay không bị tính là quên những ngày trước', () => {
    const now = new Date(2026, 9, 10, 20, 0);
    const med = { id: 'x', memberId: 'bo', name: 'X', pillsPerDose: 1, times: ['07:00'], createdAt: new Date(2026, 9, 10, 8, 0).toISOString() };
    expect(adherence([med], [], 'bo', now, 7)).toEqual({ taken: 0, scheduled: 1 });
  });
  it('nhận ra thuốc đã có dù viết hơi khác', () => {
    const meds = [{ name: 'Amlodipin 5mg' }, { name: 'Metformin 500mg' }];
    expect(findExisting({ name: 'Amlodipine 5mg' }, meds)?.name).toBe('Amlodipin 5mg');
    expect(findExisting({ name: 'Aspirin 81mg' }, meds)).toBeUndefined();
  });
});
