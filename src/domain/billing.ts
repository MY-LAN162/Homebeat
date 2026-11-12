// Gói cước, dùng thử và giới thiệu bạn bè. Hàm thuần, để kiểm thử và dùng chung giữa app và máy chủ.
//
// Quy tắc (Lan chốt 12/11/2026):
//  - Dùng thử 30 ngày, đủ tính năng, không cần thẻ.
//  - Giá theo tháng: Nhỏ 89.000đ, Vừa 119.000đ, Lớn 179.000đ. Theo năm: trả 10 tháng (tặng 2 tháng).
//  - Giới thiệu: gia đình được giới thiệu giảm 10%, người giới thiệu giảm 5%, trong 2 tháng đầu
//    sau khi gia đình được giới thiệu hết dùng thử và bắt đầu trả phí.
//  - Nút SOS miễn phí mãi mãi, kể cả khi hết hạn.

export type PlanId = 'small' | 'medium' | 'large';
export type Period = 'm' | 'y';

export interface Plan {
  id: PlanId;
  name: string;
  monthly: number;
  members: number;
  careFor: number;
}

export const PLANS: readonly Plan[] = [
  { id: 'small', name: 'Nhỏ', monthly: 89_000, members: 4, careFor: 2 },
  { id: 'medium', name: 'Vừa', monthly: 119_000, members: 7, careFor: 4 },
  { id: 'large', name: 'Lớn', monthly: 179_000, members: 12, careFor: 6 },
];

export const TRIAL_DAYS = 30;
/** Theo năm: trả bằng số tháng này (tặng 2 tháng). */
export const YEAR_PAYS_MONTHS = 10;
export const REF_NEW_PCT = 10;
export const REF_OLD_PCT = 5;
export const REF_MONTHS = 2;

/** Mã sản phẩm trên Google Play / App Store (tạo đúng các mã này khi mở cửa hàng). */
export const STORE_PRODUCT = (plan: PlanId, period: Period) => `antam.${plan}.${period === 'm' ? 'month' : 'year'}`;

export const planOf = (id: PlanId | undefined) => PLANS.find((p) => p.id === id);

/** Một lượt giới thiệu thành công: gia đình được giới thiệu đã bắt đầu trả phí. */
export interface ReferralUse {
  /** Mã giới thiệu của gia đình được giới thiệu (không lưu mã gia đình để giữ kín). */
  code: string;
  paidAt: string;
}

/** Tình trạng gói của một gia đình (lưu ở families/{id}/meta/billing). */
export interface Billing {
  /** Ngày bắt đầu dùng thử (ISO). Đặt một lần khi tạo gia đình. */
  trialStart: string;
  /** Mã giới thiệu của gia đình này (6 ký tự). */
  refCode: string;
  /** Mã giới thiệu đã nhập lúc đăng ký (nếu có). */
  referredBy?: string;
  plan?: PlanId;
  period?: Period;
  /** Đã trả tới ngày này (ISO). Trống = chưa trả lần nào. */
  paidUntil?: string;
  /** Lần đầu trả phí (ISO): mốc tính 2 tháng giảm 10% cho gia đình được giới thiệu. */
  firstPaidAt?: string;
}

const DAY = 86_400_000;

export type BillingState = 'trial' | 'active' | 'expired';

export interface Entitlement {
  state: BillingState;
  /** Còn mấy ngày (dùng thử hoặc gói đã trả). */
  daysLeft: number;
  trialEndsAt: Date;
}

export function trialEnd(b: Pick<Billing, 'trialStart'>): Date {
  return new Date(new Date(b.trialStart).getTime() + TRIAL_DAYS * DAY);
}

/** Gia đình đang ở giai đoạn nào: dùng thử / đã trả / hết hạn. */
export function entitlement(b: Billing, now: Date): Entitlement {
  const tEnd = trialEnd(b);
  const paid = b.paidUntil ? new Date(b.paidUntil) : undefined;
  if (paid && paid > now) return { state: 'active', daysLeft: Math.ceil((paid.getTime() - now.getTime()) / DAY), trialEndsAt: tEnd };
  if (now < tEnd) return { state: 'trial', daysLeft: Math.ceil((tEnd.getTime() - now.getTime()) / DAY), trialEndsAt: tEnd };
  return { state: 'expired', daysLeft: 0, trialEndsAt: tEnd };
}

/** Việc gì vẫn dùng được khi hết hạn: SOS và nhắc thuốc trên máy bố mẹ (an toàn của bố mẹ không bị khóa). */
export type Feature = 'sos' | 'dose-reminder' | 'alerts' | 'messages' | 'visits' | 'report' | 'scan' | 'summary';
export const ALWAYS_FREE: readonly Feature[] = ['sos', 'dose-reminder'];

/**
 * Khóa tính năng khi hết hạn. Đang tắt (false) trong giai đoạn thử nghiệm: mọi tính năng đều mở.
 * Bật khi đã mở bán trên Google Play / App Store.
 */
export const BILLING_ENFORCED = false;

export function canUse(feature: Feature, ent: Entitlement, enforced = BILLING_ENFORCED): boolean {
  if (!enforced || ALWAYS_FREE.includes(feature)) return true;
  return ent.state !== 'expired';
}

/** Giá một kỳ thanh toán, chưa giảm. */
export function basePrice(plan: PlanId, period: Period): number {
  const p = planOf(plan)!;
  return period === 'm' ? p.monthly : p.monthly * YEAR_PAYS_MONTHS;
}

/**
 * Số % được giảm cho kỳ thanh toán bắt đầu lúc `at`.
 *  - Gia đình được giới thiệu: 10% cho các kỳ trong 2 tháng đầu kể từ lần trả đầu tiên.
 *  - Người giới thiệu: 5% cho các kỳ trong 2 tháng kể từ khi gia đình được giới thiệu bắt đầu trả phí.
 *    Giới thiệu nhiều gia đình: không cộng dồn %, mà nối tiếp thời gian (mỗi lượt thêm 2 tháng giảm 5%).
 *  - Hai loại không cộng nhau: lấy mức cao hơn.
 */
export function discountPct(b: Billing, uses: readonly ReferralUse[], at: Date): number {
  let pct = 0;
  const firstPaid = b.firstPaidAt ? new Date(b.firstPaidAt) : at;
  if (b.referredBy && at < addMonths(firstPaid, REF_MONTHS)) pct = REF_NEW_PCT;
  if (refRewardActive(uses, at)) pct = Math.max(pct, REF_OLD_PCT);
  return pct;
}

/** Thời gian được giảm 5% của người giới thiệu: mỗi lượt 2 tháng, nối tiếp nhau. */
export function refRewardUntil(uses: readonly ReferralUse[]): Date | undefined {
  let until: Date | undefined;
  for (const u of [...uses].sort((a, b) => a.paidAt.localeCompare(b.paidAt))) {
    const start = until && until > new Date(u.paidAt) ? until : new Date(u.paidAt);
    until = addMonths(start, REF_MONTHS);
  }
  return until;
}

export function refRewardActive(uses: readonly ReferralUse[], at: Date): boolean {
  const until = refRewardUntil(uses);
  const first = uses.length ? new Date([...uses].sort((a, b) => a.paidAt.localeCompare(b.paidAt))[0].paidAt) : undefined;
  return !!until && !!first && at >= first && at < until;
}

/** Giá phải trả cho kỳ bắt đầu lúc `at` (làm tròn tới 100đ). */
export function priceFor(b: Billing, plan: PlanId, period: Period, uses: readonly ReferralUse[], at: Date): { price: number; pct: number; base: number } {
  const base = basePrice(plan, period);
  // Giảm theo tháng: gói năm chỉ giảm phần 2 tháng đầu (không giảm cả năm).
  const pct = discountPct(b, uses, at);
  const discount = period === 'm' ? (base * pct) / 100 : (planOf(plan)!.monthly * REF_MONTHS * pct) / 100;
  return { price: Math.round((base - discount) / 100) * 100, pct, base };
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Thời hạn mới sau khi trả một kỳ: nối tiếp nếu còn hạn, tính từ lúc trả nếu đã hết. */
export function extendPaid(b: Billing, period: Period, at: Date): string {
  const cur = b.paidUntil ? new Date(b.paidUntil) : undefined;
  const start = cur && cur > at ? cur : at;
  return addMonths(start, period === 'm' ? 1 : 12).toISOString();
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0, O, 1, I dễ nhầm

/** Mã giới thiệu 6 ký tự, dễ đọc qua điện thoại. */
export function makeRefCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return s;
}

export function normalizeRefCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isRefCode(code: string): boolean {
  return code.length === 6 && [...code].every((c) => CODE_CHARS.includes(c));
}

/** Nhập mã giới thiệu được không: chưa nhập mã nào, chưa trả phí, không phải mã của chính mình. */
export function canEnterReferral(b: Billing, code: string): { ok: true } | { ok: false; reason: string } {
  if (b.referredBy) return { ok: false, reason: 'Gia đình đã nhập mã giới thiệu rồi.' };
  if (b.firstPaidAt) return { ok: false, reason: 'Mã giới thiệu chỉ nhập được trước lần trả phí đầu tiên.' };
  if (!isRefCode(code)) return { ok: false, reason: 'Mã gồm 6 chữ và số, ví dụ K7M2QX.' };
  if (code === b.refCode) return { ok: false, reason: 'Đây là mã của chính gia đình bạn.' };
  return { ok: true };
}

export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Tin nhắn mời gia đình khác (gửi qua Zalo). */
export function referralText(code: string, url = process.env.EXPO_PUBLIC_WEB_URL ?? ''): string {
  return [
    `Nhà mình đang dùng An Tâm để nhắc bố mẹ uống thuốc và biết bố mẹ ổn mỗi ngày.`,
    `Dùng thử miễn phí ${TRIAL_DAYS} ngày. Nhập mã giới thiệu ${code} để được giảm ${REF_NEW_PCT}% 2 tháng đầu.`,
    url ? `Xem và đăng ký: ${url}?gt=${code}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
