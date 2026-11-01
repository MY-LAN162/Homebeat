import { bpPush, checkinPush, sosPush } from '../pushRules';
import { DEFAULT_SETTINGS } from '../types';

const bo = { id: 'bo', name: 'Hùng', call: 'Bố' as const, self: 'Con' as const };

describe('máy bố mẹ tự báo cho con', () => {
  it('SOS có giờ và link vị trí', () => {
    const m = sosPush(bo, new Date(2026, 9, 1, 9, 5), { lat: 21.0285, lng: 105.8542 });
    expect(m.title).toContain('SOS');
    expect(m.body).toContain('09:05');
    expect(m.body).toContain('maps.google.com/?q=21.028500,105.854200');
  });
  it('chỉ báo khi "không khỏe", không báo "hơi mệt" / "khỏe"', () => {
    expect(checkinPush(bo, 'good', [])).toBeUndefined();
    expect(checkinPush(bo, 'tired', ['Đau đầu'])).toBeUndefined();
    expect(checkinPush(bo, 'unwell', ['Chóng mặt'])?.body).toContain('Chóng mặt');
  });
  it('huyết áp: chỉ báo khi từ mức đã đặt trở lên', () => {
    expect(bpPush(bo, 130, 85, DEFAULT_SETTINGS)).toBeUndefined();
    expect(bpPush(bo, 150, 85, DEFAULT_SETTINGS)?.title).toContain('150/85');
    expect(bpPush(bo, 130, 92, DEFAULT_SETTINGS)).toBeDefined();
  });
});
