import { childMissedAlerts } from '../background';
import { memberAlerts } from '../alerts';
import { lateCopy, pruneOutbox, type OutboxItem } from '../outbox';
import { emptyData, type AppData } from '../types';

// Giờ máy chạy test có thể khác giờ Việt Nam: đặt múi giờ rõ ràng.
const at = (hhmm: string) => new Date(`2026-11-13T${hhmm}:00+07:00`);
function family(): AppData {
  return {
    ...emptyData(),
    role: 'child',
    settings: { ...emptyData().settings, timeZone: 'Asia/Ho_Chi_Minh', checkinBy: '10:00' },
    members: [{ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con', lastSeenAt: at('06:00').toISOString() }],
    medications: [{ id: 'amlo', memberId: 'bo', name: 'Amlodipin', pillsPerDose: 1, times: ['12:00'] }],
    checkins: [{ memberId: 'bo', at: at('07:00').toISOString(), mood: 'good', symptoms: [] }],
  };
}

describe('máy con tự báo khi máy bố mẹ không báo được', () => {
  it('trễ thuốc: chỉ báo khi đã trễ thêm 30 phút, mỗi ngày một lần', () => {
    const d = family();
    expect(childMissedAlerts(d, at('12:45'), []).alerts).toEqual([]);
    const r = childMissedAlerts(d, at('13:05'), []);
    expect(r.alerts.map((a) => a.title)).toEqual(['Bố Hùng chưa uống thuốc 12:00']);
    expect(r.alerts[0].body).toContain('có thể chưa báo được');
    expect(childMissedAlerts(d, at('13:30'), r.sent).alerts).toEqual([]);
  });
  it('bố đã uống thì không báo', () => {
    const d = family();
    d.doseLogs = [{ memberId: 'bo', medId: 'amlo', date: '2026-11-13', time: '12:00', status: 'taken', at: at('12:50').toISOString() }];
    expect(childMissedAlerts(d, at('13:30'), []).alerts).toEqual([]);
  });
  it('máy bố mẹ không dùng hàm này', () => {
    expect(childMissedAlerts({ ...family(), role: 'parent' }, at('13:30'), []).alerts).toEqual([]);
  });
});

describe('mất tín hiệu: tính cả việc bố mẹ vừa làm', () => {
  it('nhịp cũ 7 giờ nhưng bố vừa đo huyết áp → không báo mất tín hiệu', () => {
    const d = family();
    d.bpReadings = [{ memberId: 'bo', at: at('12:30').toISOString(), sys: 120, dia: 80, pulse: 70 }];
    d.doseLogs = [{ memberId: 'bo', medId: 'amlo', date: '2026-11-13', time: '12:00', status: 'taken', at: at('12:30').toISOString() }];
    const kinds = memberAlerts(d, d.members[0], at('13:00')).map((a) => a.kind);
    expect(kinds).not.toContain('no-signal');
    expect(memberAlerts(family(), family().members[0], at('13:00')).map((a) => a.kind)).toContain('no-signal');
  });
});

describe('hộp thư chờ', () => {
  const item = (kind: string, hhmm: string): OutboxItem => ({
    id: kind + hhmm, familyId: 'f', to: 'children', at: at(hhmm).toISOString(), tries: 1,
    msg: { title: 't', body: 'Gọi ngay.', data: { kind } },
  });
  it('bỏ tin quá cũ; SOS giữ lâu hơn', () => {
    const left = pruneOutbox([item('unwell', '01:00'), item('sos', '01:00'), item('unwell', '12:00')], at('13:00'));
    expect(left.map((i) => i.id)).toEqual(['sos01:00', 'unwell12:00']);
  });
  it('gửi trễ thì ghi giờ xảy ra', () => {
    expect(lateCopy(item('sos', '12:00'), at('12:01')).body).toBe('Gọi ngay.');
    expect(lateCopy(item('sos', '12:00'), at('12:20')).body).toContain('Xảy ra lúc');
  });
});
