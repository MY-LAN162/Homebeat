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
  /** Lần cuối máy của bố mẹ gửi tín hiệu (ISO). Chỉ có khi đã nối máy chủ đồng bộ. */
  lastSeenAt?: string;
  battery?: number;
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
}

export interface AlertSettings {
  /** Trễ thuốc bao nhiêu phút thì báo. */
  lateMinutes: number;
  /** Máy không di chuyển / mất tín hiệu bao nhiêu giờ thì báo. */
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
  /** Cỡ chữ trên máy này: 1 bình thường, 1.15 lớn, 1.3 rất lớn (không đồng bộ sang máy khác). */
  textScale?: number;
  /** Máy bố mẹ đã gửi yêu cầu vào gia đình, đang chờ con bấm Đồng ý. */
  pendingJoin?: { familyId: string; memberId: string; at: string; denied?: boolean };
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
  appointments: [],
  settings: { ...DEFAULT_SETTINGS },
});
