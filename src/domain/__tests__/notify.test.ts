import { scheduleKey, scheduleNotice } from '../background';
import { levelOf, pushOptions } from '../levels';
import { messagePush, sosAckPush, sosPush } from '../pushRules';
import { visitReminders } from '../reminders';
import { diffData, emptyShared, mergeRemote, shared } from '../syncdiff';
import { effectiveScale } from '../textSize';
import { emptyData, type AppData, type Member } from '../types';

const bo: Member = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };

describe('ba mức thông báo', () => {
  it('SOS khẩn cấp, pin yếu / đổi lịch là thông tin, còn lại cần chú ý', () => {
    expect(levelOf('sos')).toBe('urgent');
    expect(levelOf('low-battery')).toBe('info');
    expect(levelOf('schedule')).toBe('info');
    expect(levelOf('late-dose')).toBe('warn');
    expect(levelOf('message')).toBe('warn');
    expect(levelOf(undefined)).toBe('warn');
  });
  it('mỗi mức một kênh, âm riêng cho SOS, thông tin không kêu', () => {
    expect(pushOptions('urgent')).toMatchObject({ channelId: 'sos', sound: 'sos.wav', priority: 'high' });
    expect(pushOptions('warn')).toMatchObject({ channelId: 'canh-bao', sound: 'default' });
    expect(pushOptions('info')).toMatchObject({ channelId: 'thong-tin', sound: null, interruptionLevel: 'passive' });
    expect(sosPush(bo, new Date()).level).toBe('urgent');
  });
});

describe('con báo cho bố mẹ', () => {
  it('con đã thấy SOS và lời nhắn dùng cách xưng hô của gia đình', () => {
    expect(sosAckPush(bo, 'Hà').title).toBe('Con Hà đã thấy');
    expect(sosAckPush(bo, 'Hà').body).toContain('Bố giữ máy bên cạnh');
    const msg = messagePush(bo, 'Hà', 'Bố nhớ uống thuốc nhé');
    expect(msg.title).toBe('Con Hà nhắn bố');
    expect(msg.body).toBe('“Bố nhớ uống thuốc nhé”');
    expect(msg.data).toEqual({ kind: 'message', memberId: 'bo' });
  });

  it('lời nhắn đồng bộ lên máy chủ; "Đã xem" của bố về lại máy con; bản lưu cũ chưa có lời nhắn không lỗi', () => {
    const d: AppData = { ...emptyData(), members: [bo] };
    const before = { ...emptyShared(d.settings) } as ReturnType<typeof emptyShared>;
    delete (before as Partial<typeof before>).messages;
    const withMsg: AppData = { ...d, messages: [{ id: 'x1', memberId: 'bo', from: 'Hà', text: 'Chào bố', at: '2026-11-10T12:00:00.000Z' }] };
    const w = diffData(before, shared(withMsg));
    expect(w).toContainEqual(expect.objectContaining({ op: 'set', coll: 'messages', id: 'x1' }));
    const merged = mergeRemote(withMsg, { messages: [{ ...withMsg.messages[0], seenAt: '2026-11-10T12:05:00.000Z' }] });
    expect(merged.messages[0].seenAt).toBe('2026-11-10T12:05:00.000Z');
  });
});

describe('nhắc lịch khám trên máy bố mẹ', () => {
  const data = (): AppData => ({
    ...emptyData(),
    role: 'parent',
    currentMemberId: 'bo',
    members: [bo],
    appointments: [{ id: 'k1', memberId: 'bo', title: 'Tái khám tim mạch', at: new Date(2026, 10, 12, 8, 0).toISOString(), place: 'BV Chợ Rẫy', companion: 'Hà', questions: [] }],
  });
  it('tối hôm trước 19:00 và 2 tiếng trước giờ khám', () => {
    const r = visitReminders(data(), 'bo', new Date(2026, 10, 10, 9, 0));
    expect(r.map((x) => x.at.getTime())).toEqual([new Date(2026, 10, 11, 19, 0).getTime(), new Date(2026, 10, 12, 6, 0).getTime()]);
    expect(r[0].title).toBe('Mai bố đi khám lúc 8:00');
    expect(r[0].body).toContain('BV Chợ Rẫy');
    expect(r[0].body).toContain('Hà đưa bố đi');
  });
  it('giờ nhắc đã qua thì bỏ; lịch khám của người khác thì không nhắc', () => {
    expect(visitReminders(data(), 'bo', new Date(2026, 10, 11, 20, 0))).toHaveLength(1);
    expect(visitReminders(data(), 'me', new Date(2026, 10, 10, 9, 0))).toEqual([]);
  });
  it('con đổi lịch khám thì đặt lại nhắc và báo "cập nhật lịch đi khám", không báo nhầm là lịch thuốc', () => {
    const d = data();
    const old = scheduleKey(d);
    const moved = { ...d, appointments: [{ ...d.appointments[0], at: new Date(2026, 10, 13, 9, 0).toISOString() }] };
    expect(scheduleKey(moved)).not.toBe(old);
    expect(scheduleNotice(moved, old)?.title).toBe('Con vừa cập nhật lịch đi khám của bố');
    expect(scheduleNotice(d, old)).toBeUndefined();
  });
});

describe('cỡ chữ', () => {
  it('máy bố mẹ dùng cỡ chữ của bố/mẹ (con chỉnh hộ được), máy con dùng cỡ chữ của máy', () => {
    const members = [{ ...bo, textScale: 1.4 }];
    expect(effectiveScale({ role: 'parent', currentMemberId: 'bo', members, textScale: 1 })).toBe(1.4);
    expect(effectiveScale({ role: 'child', members, textScale: 1.15 })).toBe(1.15);
    expect(effectiveScale({ role: 'parent', currentMemberId: 'bo', members: [bo] })).toBe(1);
  });
});
