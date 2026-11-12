// Thanh toán qua Google Play / App Store.
//
// CHƯA NỐI CỬA HÀNG: cần (1) tài khoản Google Play Console (25 USD, một lần) và Apple Developer (99 USD/năm),
// (2) tạo gói đăng ký đúng mã STORE_PRODUCT trong domain/billing.ts, kèm ưu đãi giới thiệu,
// (3) thêm thư viện thanh toán (bản cài mới) và thay hàm buy() bên dưới.
// Trong lúc chưa nối, app báo "sắp mở" và mọi tính năng vẫn miễn phí (BILLING_ENFORCED = false).
import { STORE_PRODUCT, type Period, type PlanId } from '../domain/billing';

export const storeReady = false;

export type BuyResult = { ok: true; at: string } | { ok: false; reason: 'not-ready' | 'cancelled' | 'error' };

export async function buy(plan: PlanId, period: Period): Promise<BuyResult> {
  void STORE_PRODUCT(plan, period);
  if (!storeReady) return { ok: false, reason: 'not-ready' };
  return { ok: false, reason: 'error' };
}
