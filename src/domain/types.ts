import type { Billing, ReferralUse } from './billing';
// Kiểu dữ liệu chính của An Tâm (Homebeat).

export type Role = 'child' | 'parent';

/** Cách con gọi bố mẹ, và cách app xưng với bố mẹ. */
export type CallName = 'Bố' | 'Mẹ' | 'Ông' | 'Bà';
export type SelfName = 'Con' | 'Cháu';

/** Người được chăm sóc (bố, mẹ, ông, bà). */
export interface Member {
  id: string;
  name: string;
  call: CallName;
  self: SelfName;
  phone?: string;
  note?: string;
  /** Cỡ chữ trên máy của bố/mẹ này (1 Lớn … 1.6 Khổng lồ). Đồng bộ để con chỉnh hộ được. */
  textScale?: number;
  /** Lần cuối máy của bố mẹ gửi tín hiệu (ISO). Chỉ có khi đã nối máy chủ đồng bộ. */
  lastSeenAt?: string;
  battery?: number;
  /** Máy của bố/mẹ đang tắt thông báo (theo nhịp còn sống gần nhất). Chỉ trên máy, không gửi lên. */
  notifOff?: boolean;
  // Hồ sơ sức khỏe (không bắt buộc). Hiện khi SOS, trong báo cáo bác sĩ, và để cảnh báo dị ứng khi thêm thuốc.
  birthYear?: number;
  /** Bệnh nền, ví dụ ["Huyết áp cao", "Tiểu đường"]. */
  conditions?: string[];
  /** Dị ứng thuốc / thức ăn, gõ tự do: "Penicillin, aspirin". */
  allergies?: string;
  /** Nhóm máu, ví dụ "O+". */
  bloodType?: string;
  /** Số thẻ bảo hiểm y tế. */
  insurance?: string;
  /** Bệnh viện / bác sĩ hay khám. */
  hospital?: string;
  /** Địa chỉ nhà (để báo cấp cứu). */
  address?: string;
}

/** Người nhận cảnh báo (con, cháu, hàng xóm). Thứ tự gọi theo `order`. */
export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  order: number;
  /** Chỉ liên hệ khi SOS (ví dụ hàng xóm). */
  sosOnly?: boolean;
}

export interface Medication {
  id: string;
  memberId: string;
  name: string;
  purpose?: string;
  /** Số viên mỗi lần uống. */
  pillsPerDose: number;
  /** Giờ uống trong ngày, dạng "HH:MM". */
  times: string[];
  afterMeal?: boolean;
  /** Số viên còn lại. Không biết thì để trống. */
  stockPills?: number;
  note?: string;
  /** Ảnh viên thuốc do con chụp (uri). */
  photoUri?: string;
  /** Ngày thêm thuốc (ISO). Tỷ lệ uống thuốc chỉ tính từ ngày này. */
  createdAt?: string;
  /** Uống theo đợt: ngày đầu và ngày cuối của đợt ("YYYY-MM-DD"). Sau ngày cuối thì tự dừng nhắc. */
  start?: string;
  until?: string;
  /** Cách mấy ngày uống một lần (2 = cách ngày), tính từ `start`. Trống = hằng ngày. */
  every?: number;
  /** Chỉ uống vào các thứ này (0 = Chủ nhật … 6 = Thứ bảy). Trống = mọi ngày. */
  weekdays?: number[];
}

export type DoseStatus = 'taken' | 'skipped';

export interface DoseLog {
  memberId: string;
  medId: string;
  /** Ngày "YYYY-MM-DD" và giờ "HH:MM" của lần uống theo lịch. */
  date: string;
  time: string;
  status: DoseStatus;
  at: string;
  /** Khi không uống: 'out' hết thuốc, 'unable' không uống được (mệt, buồn nôn...). */
  reason?: 'out' | 'unable';
}

export type Mood = 'good' | 'tired' | 'unwell';

export interface Checkin {
  memberId: string;
  at: string;
  mood: Mood;
  symptoms: string[];
}

export interface BpReading {
  memberId: string;
  at: string;
  sys: number;
  dia: number;
  pulse: number;
}

export interface SosEvent {
  id: string;
  memberId: string;
  at: string;
  cancelled: boolean;
  lat?: number;
  lng?: number;
  /** Con đầu tiên bấm "Con đã thấy" (tên) và lúc nào, để máy bố mẹ yên tâm. */
  ackBy?: string;
  ackAt?: string;
}

/** Lời nhắn của con gửi bố/mẹ (hiện chữ to, đọc to trên máy bố mẹ). */
export interface Message {
  id: string;
  /** Gửi cho bố/mẹ nào. */
  memberId: string;
  /** Tên người gửi (con). */
  from: string;
  text: string;
  at: string;
  /** Lúc bố mẹ bấm "Đã xem". */
  seenAt?: string;
}

export interface Appointment {
  id: string;
  memberId: string;
  title: string;
  at: string;
  place?: string;
  companion?: string;
  questions: string[];
  /** Câu hỏi đã hỏi bác sĩ (đánh dấu trong lúc khám). */
  asked?: string[];
  /** Đồ cần mang theo. Chưa có thì dùng danh sách mặc định. */
  bring?: string[];
  /** Lời bác sĩ đã chuyển thành chữ (hoặc con tự ghi). */
  transcript?: string;
  /** Có chia sẻ lời bác sĩ với cả nhà không. Mặc định không: lời ghi chỉ nằm trên máy đã ghi. */
  shareTranscript?: boolean;
}

export interface AlertSettings {
  /** Trễ thuốc bao nhiêu phút thì báo. */
  lateMinutes: number;
  /** Không nhận được tín hiệu từ máy bố mẹ bao nhiêu giờ thì báo. */
  stillHours: number;
  /** Chưa bấm "ổn" trước giờ này thì báo, "HH:MM". */
  checkinBy: string;
  bpSys: number;
  bpDia: number;
  excludeSleep: boolean;
  sleepStart: string;
  sleepEnd: string;
  /**
   * Múi giờ nơi bố mẹ sống (vd "Asia/Ho_Chi_Minh"). Giờ uống thuốc, giờ điểm danh, giờ ngủ tính theo múi giờ này,
   * kể cả khi con ở nước khác. Trống = theo giờ của điện thoại.
   */
  timeZone?: string;
  /** Tự đọc to khi mở màn hình nhắc thuốc trên máy bố mẹ. Trống = bật. */
  autoSpeak?: boolean;
  /** Nhắc bố mẹ đo huyết áp mỗi ngày lúc này ("HH:MM"). Trống = không nhắc. */
  bpRemind?: string;
}

export interface Pairing {
  code: string;
  memberId: string;
  expiresAt: string;
}

export interface AppData {
  version: 1;
  role?: Role;
  /** Trên máy bố mẹ: bố/mẹ nào đang dùng máy này. */
  currentMemberId?: string;
  members: Member[];
  caregivers: Caregiver[];
  medications: Medication[];
  doseLogs: DoseLog[];
  checkins: Checkin[];
  bpReadings: BpReading[];
  sosEvents: SosEvent[];
  messages: Message[];
  appointments: Appointment[];
  settings: AlertSettings;
  pairing?: Pairing;
  /** Mã gia đình trên máy chủ đồng bộ. Chưa có = chỉ lưu trên máy. */
  familyId?: string;
  /** Đang xem dữ liệu mẫu: không bao giờ gửi lên máy chủ. */
  demo?: boolean;
  /** Cảnh báo con đã bấm "ổn rồi, tắt cảnh báo" (chỉ trên máy này). */
  dismissed?: string[];
  /** Bố mẹ đã xem hướng dẫn lần đầu trên máy này. */
  guideSeen?: boolean;
  /** Máy của con: nhận tóm tắt buổi tối (20:00) về bố mẹ. Trống = có. */
  eveningSummary?: boolean;
  /** Máy của con: tên người dùng máy này (ký tên khi nhắn bố mẹ, khi bấm "Con đã thấy"). */
  myName?: string;
  /** Cỡ chữ trên máy này: 1 bình thường, 1.15 lớn, 1.3 rất lớn (không đồng bộ sang máy khác). */
  textScale?: number;
  /** Máy bố mẹ đã gửi yêu cầu vào gia đình, đang chờ con bấm Đồng ý. */
  pendingJoin?: { familyId: string; memberId: string; role?: Role; at: string; denied?: boolean };
  /** Mã kết nối cho máy mới của con (vd đổi điện thoại), khác với mã cho máy bố mẹ. */
  childPairing?: Pairing;
  /** Lúc người dùng đồng ý chính sách quyền riêng tư trên máy này (ISO). */
  consentAt?: string;
  /** Phiên bản chính sách đã đồng ý (đổi chính sách thì hỏi lại). */
  consentVersion?: number;
  /** Máy của con: khóa app bằng vân tay / khuôn mặt / mã máy (máy bố mẹ không khóa). */
  appLock?: boolean;
  /** Những gì người dùng đã bấm xóa trên máy này, dạng "medications/<id>" (để chỉ xóa đúng chúng trên máy chủ). */
  deleted?: string[];
  /** Gói cước của gia đình (bản trên máy; bản gốc ở families/{id}/meta/billing). */
  billing?: Billing;
  /** Các gia đình mình đã giới thiệu đã bắt đầu trả phí (để tính phần giảm 5%). */
  refUses?: ReferralUse[];
}

export const DEFAULT_SETTINGS: AlertSettings = {
  lateMinutes: 30,
  stillHours: 3,
  checkinBy: '10:00',
  bpSys: 140,
  bpDia: 90,
  excludeSleep: true,
  sleepStart: '22:00',
  sleepEnd: '06:00',
};

/** Dữ liệu trống. Là hàm để mỗi lần gọi có mảng mới, tránh dùng chung. */
export const emptyData = (): AppData => ({
  version: 1,
  members: [],
  caregivers: [],
  medications: [],
  doseLogs: [],
  checkins: [],
  bpReadings: [],
  sosEvents: [],
  messages: [],
  appointments: [],
  settings: { ...DEFAULT_SETTINGS },
});
