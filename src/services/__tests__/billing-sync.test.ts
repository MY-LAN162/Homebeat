import { discountPct } from '../../domain/billing';
import { MemoryServer, MemorySync } from '../memorySync';

describe('gói cước và giới thiệu qua máy chủ (bản giả trong bộ nhớ)', () => {
  it('gia đình A giới thiệu gia đình B: B nhập mã, B trả phí, A thấy lượt giới thiệu và được giảm 5%', async () => {
    const server = new MemoryServer();
    const a = new MemorySync(server, 'uid-a');
    const b = new MemorySync(server, 'uid-b');
    const famA = await a.createFamily();
    const famB = await b.createFamily();
    const billA = await a.initBilling(famA, '2026-11-01T00:00:00.000Z');
    const billB = await b.initBilling(famB, '2026-11-02T00:00:00.000Z');
    expect(billA.refCode).not.toBe(billB.refCode);
    expect(await a.initBilling(famA, '2027-01-01T00:00:00.000Z')).toEqual(billA); // tạo lần hai không đổi gì

    expect(await b.refCodeExists(billA.refCode)).toBe(true);
    expect(await b.refCodeExists('ZZZZZZ')).toBe(false);
    await b.updateBilling(famB, { referredBy: billA.refCode });
    await expect(b.updateBilling(famB, { referredBy: 'ZZZZZZ' })).rejects.toThrow();
    await expect(b.updateBilling(famB, { trialStart: '2030-01-01T00:00:00.000Z' })).rejects.toThrow();

    let usesSeen = 0;
    const stop = a.watchBilling(famA, (_bill, uses) => (usesSeen = uses.length));
    await b.recordReferralPaid(billA.refCode, billB.refCode, '2026-12-02T00:00:00.000Z');
    expect(usesSeen).toBe(1);
    stop();
    const uses = [...server.refUses.get(billA.refCode)!.values()];
    expect(discountPct(billA, uses, new Date('2027-01-15T00:00:00Z'))).toBe(5);
  });
});
