import {
  basePrice, canEnterReferral, canUse, discountPct, entitlement, extendPaid, isRefCode, makeRefCode,
  normalizeRefCode, priceFor, referralText, refRewardUntil, type Billing,
} from '../billing';

const b0: Billing = { trialStart: '2026-11-01T00:00:00.000Z', refCode: 'K7M2QX' };
const d = (s: string) => new Date(s);

describe('dùng thử và hết hạn', () => {
  it('30 ngày dùng thử, đã trả thì còn hạn, quá hạn thì hết', () => {
    expect(entitlement(b0, d('2026-11-21T00:00:00Z'))).toMatchObject({ state: 'trial', daysLeft: 10 });
    expect(entitlement(b0, d('2026-12-02T00:00:00Z')).state).toBe('expired');
    const paid = { ...b0, paidUntil: '2027-01-01T00:00:00.000Z' };
    expect(entitlement(paid, d('2026-12-02T00:00:00Z'))).toMatchObject({ state: 'active', daysLeft: 30 });
  });
  it('khi bật thu phí: hết hạn vẫn dùng được SOS và nhắc thuốc', () => {
    const ent = entitlement(b0, d('2026-12-05T00:00:00Z'));
    expect(canUse('sos', ent, true)).toBe(true);
    expect(canUse('dose-reminder', ent, true)).toBe(true);
    expect(canUse('report', ent, true)).toBe(false);
    expect(canUse('report', ent)).toBe(true); // đang thử nghiệm: chưa khóa gì
  });
});

describe('giá và giới thiệu', () => {
  it('giá theo tháng / theo năm (trả 10 tháng)', () => {
    expect(basePrice('medium', 'm')).toBe(119_000);
    expect(basePrice('medium', 'y')).toBe(1_190_000);
  });
  it('gia đình được giới thiệu giảm 10% trong 2 tháng đầu trả phí', () => {
    const b = { ...b0, referredBy: 'ABCDEF', firstPaidAt: '2026-12-01T00:00:00.000Z' };
    expect(priceFor(b, 'medium', 'm', [], d('2026-12-01T00:00:00Z'))).toEqual({ price: 107_100, pct: 10, base: 119_000 });
    expect(priceFor(b, 'medium', 'm', [], d('2027-01-01T00:00:00Z')).pct).toBe(10);
    expect(priceFor(b, 'medium', 'm', [], d('2027-02-01T00:00:00Z')).pct).toBe(0);
    // Lần trả đầu tiên (chưa có firstPaidAt) cũng được giảm.
    expect(discountPct({ ...b0, referredBy: 'ABCDEF' }, [], d('2026-12-01T00:00:00Z'))).toBe(10);
    // Gói năm: chỉ giảm phần 2 tháng đầu.
    expect(priceFor(b, 'medium', 'y', [], d('2026-12-01T00:00:00Z')).price).toBe(1_190_000 - 23_800);
  });
  it('người giới thiệu giảm 5% trong 2 tháng; giới thiệu nhiều nhà thì nối tiếp thời gian, không cộng %', () => {
    const uses = [{ code: 'AAAAAA', paidAt: '2026-12-10T00:00:00.000Z' }, { code: 'BBBBBB', paidAt: '2026-12-20T00:00:00.000Z' }];
    expect(refRewardUntil(uses)?.toISOString()).toBe('2027-04-10T00:00:00.000Z');
    expect(discountPct(b0, uses, d('2027-03-01T00:00:00Z'))).toBe(5);
    expect(discountPct(b0, uses, d('2027-04-11T00:00:00Z'))).toBe(0);
    expect(discountPct(b0, uses, d('2026-12-01T00:00:00Z'))).toBe(0);
    // Vừa được giới thiệu vừa giới thiệu người khác: lấy mức cao hơn.
    expect(discountPct({ ...b0, referredBy: 'ABCDEF' }, uses, d('2026-12-15T00:00:00Z'))).toBe(10);
  });
  it('gia hạn nối tiếp nếu còn hạn', () => {
    expect(extendPaid({ ...b0, paidUntil: '2027-01-15T00:00:00.000Z' }, 'm', d('2027-01-01T00:00:00Z'))).toBe('2027-02-15T00:00:00.000Z');
    expect(extendPaid(b0, 'y', d('2026-12-01T00:00:00Z'))).toBe('2027-12-01T00:00:00.000Z');
  });
});

describe('mã giới thiệu', () => {
  it('6 ký tự dễ đọc, không có 0 O 1 I', () => {
    for (let i = 0; i < 50; i++) expect(isRefCode(makeRefCode())).toBe(true);
    expect(normalizeRefCode(' k7m-2qx ')).toBe('K7M2QX');
    expect(isRefCode('K7M2Q0')).toBe(false);
  });
  it('chỉ nhập một lần, trước khi trả phí, không nhập mã của chính mình', () => {
    expect(canEnterReferral(b0, 'ABCDEF').ok).toBe(true);
    expect(canEnterReferral(b0, 'K7M2QX').ok).toBe(false);
    expect(canEnterReferral({ ...b0, referredBy: 'XYZWVU' }, 'ABCDEF').ok).toBe(false);
    expect(canEnterReferral({ ...b0, firstPaidAt: '2026-12-01T00:00:00.000Z' }, 'ABCDEF').ok).toBe(false);
  });
  it('tin mời có mã và mức giảm; chưa có link web thì không bịa link', () => {
    const t = referralText('K7M2QX', '');
    expect(t).toContain('K7M2QX');
    expect(t).toContain('giảm 10%');
    expect(t).not.toContain('http');
  });
});
