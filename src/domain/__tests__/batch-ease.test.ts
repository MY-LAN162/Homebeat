import { familyInviteText, parentInviteText } from '../inviteText';
import { validPhone } from '../phoneNumber';
import type { Member } from '../types';

const bo: Member = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };

describe('tin gửi mã kết nối', () => {
  it('có cách tải app và từng bước; chưa có link thì không bịa link', () => {
    const t = parentInviteText(bo, '482913', '');
    expect(t).toContain('người gửi tin này sẽ gửi file cài');
    expect(t).toContain('“Tôi là bố, mẹ”');
    expect(t).toContain('482 913');
    expect(t).not.toContain('http');
    expect(parentInviteText(bo, '482913', 'https://example.com/an-tam.apk')).toContain('1. Tải app An Tâm: https://example.com/an-tam.apk');
    expect(familyInviteText('111222', '')).toContain('“Người nhà mời tôi cùng theo dõi”');
  });
});

describe('số điện thoại', () => {
  it('nhận số Việt Nam 9–11 chữ số, có +84, dấu cách, dấu chấm', () => {
    expect(validPhone('0901234567')).toBe(true);
    expect(validPhone('+84 901 234 567')).toBe(true);
    expect(validPhone('090.123.4567')).toBe(true);
    expect(validPhone('12345')).toBe(false);
    expect(validPhone('')).toBe(false);
  });
});

describe('tin gửi mã khi đã có trang web', () => {
  it('dẫn tới trang tải app kèm sẵn mã', () => {
    const t = parentInviteText({ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' }, '482913', '', 'https://an-tam.web.app/');
    expect(t).toContain('https://an-tam.web.app/tai?ma=482913');
  });
});
