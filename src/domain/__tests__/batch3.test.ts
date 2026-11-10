import { memberAlerts } from '../alerts';
import { childSignalAlerts, eveningSummary, scheduleKey } from '../background';
import { levelOf } from '../levels';
import { mergeRemote } from '../syncdiff';
import { emptyData, type AppData, type Member } from '../types';

const bo: Member = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };

describe('máy bố mẹ tắt thông báo', () => {
  it('nhịp còn sống báo tắt thông báo → máy con có cảnh báo và tự hiện một lần mỗi ngày', () => {
    const d: AppData = { ...emptyData(), role: 'child', familyId: 'f', members: [bo] };
    const now = new Date(2026, 10, 10, 9, 0);
    const merged = mergeRemote(d, { heartbeats: { bo: { at: now.toISOString(), battery: 80, notifOff: true } } });
    expect(merged.members[0].notifOff).toBe(true);
    expect(memberAlerts(merged, merged.members[0], now).some((a) => a.kind === 'notif-off')).toBe(true);
    const r = childSignalAlerts(d, { bo: { at: now.toISOString(), notifOff: true } }, now, []);
    expect(r.alerts.map((a) => a.title)).toEqual(['Máy của bố đang tắt thông báo']);
    expect(childSignalAlerts(d, { bo: { at: now.toISOString(), notifOff: true } }, now, r.sent).alerts).toEqual([]);
    // Bật lại thì hết cảnh báo.
    const back = mergeRemote(merged, { heartbeats: { bo: { at: now.toISOString(), notifOff: false } } });
    expect(memberAlerts(back, back.members[0], now).some((a) => a.kind === 'notif-off')).toBe(false);
  });
});

describe('nhắc đo huyết áp', () => {
  it('đổi giờ nhắc thì máy bố mẹ đặt lại; con tắt nhắc thì máy bố mẹ cũng tắt', () => {
    const d: AppData = { ...emptyData(), role: 'parent', currentMemberId: 'bo', members: [bo] };
    const on = { ...d, settings: { ...d.settings, bpRemind: '07:00' } };
    expect(scheduleKey(on)).not.toBe(scheduleKey(d));
    const off = mergeRemote(on, { settings: { ...d.settings } });
    expect(off.settings.bpRemind).toBeUndefined();
  });
});

describe('tóm tắt buổi tối cho con', () => {
  it('một dòng mỗi người: thuốc, điểm danh, huyết áp; im lặng (mức thông tin)', () => {
    const d: AppData = {
      ...emptyData(),
      members: [bo],
      medications: [{ id: 'a', memberId: 'bo', name: 'A', pillsPerDose: 1, times: ['07:00', '12:00', '19:00'] }],
      doseLogs: [
        { memberId: 'bo', medId: 'a', date: '2026-11-10', time: '07:00', status: 'taken', at: new Date(2026, 10, 10, 7, 5).toISOString() },
        { memberId: 'bo', medId: 'a', date: '2026-11-10', time: '12:00', status: 'taken', at: new Date(2026, 10, 10, 12, 5).toISOString() },
      ],
      checkins: [{ memberId: 'bo', at: new Date(2026, 10, 10, 7, 10).toISOString(), mood: 'good', symptoms: [] }],
      bpReadings: [{ memberId: 'bo', at: new Date(2026, 10, 10, 8, 0).toISOString(), sys: 130, dia: 80, pulse: 70 }],
    };
    const s = eveningSummary(d, new Date(2026, 10, 10, 20, 5));
    expect(s?.body).toBe('Bố Hùng: thuốc 2/3 lần (chưa uống 19:00), báo ổn lúc 07:10, huyết áp 130/80');
    expect(levelOf('summary')).toBe('info');
  });
});
