// Đếm mức dùng từng tính năng, CHỈ lưu trên máy này (không gửi đi đâu).
// Dùng khi thử với gia đình thật: xem tính năng nào được dùng, tính năng nào bỏ đó,
// rồi người dùng tự bấm "Gửi" nếu muốn chia sẻ số liệu (xem màn hình Mức sử dụng).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'homebeat:usage:v1';

export interface UsageStat {
  count: number;
  first: string;
  last: string;
}
export type Usage = Record<string, UsageStat>;

let cache: Usage | undefined;
let loading: Promise<Usage> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function load(): Promise<Usage> {
  if (cache) return Promise.resolve(cache);
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => (cache = raw ? (JSON.parse(raw) as Usage) : {}))
    .catch(() => (cache = {}));
  return loading;
}

/** Ghi nhận một lần dùng. Không bao giờ làm app lỗi. */
export function track(event: string) {
  void load().then((u) => {
    const at = new Date().toISOString();
    const cur = u[event];
    u[event] = { count: (cur?.count ?? 0) + 1, first: cur?.first ?? at, last: at };
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(u)).catch(() => undefined), 1000);
  });
}

export function getUsage(): Promise<Usage> {
  return load().then((u) => ({ ...u }));
}

export async function resetUsage() {
  cache = {};
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** Tên dễ hiểu cho từng sự kiện / màn hình. */
export const USAGE_LABELS: Record<string, string> = {
  'screen:/parent': 'Bố mẹ · Trang chủ',
  'screen:/parent/medicine': 'Bố mẹ · Màn hình uống thuốc',
  'screen:/parent/checkin': 'Bố mẹ · Hỏi thăm sức khỏe',
  'screen:/parent/bp': 'Bố mẹ · Nhập huyết áp',
  'screen:/parent/sos': 'Bố mẹ · SOS',
  'screen:/child': 'Con · Trang chủ',
  'screen:/child/meds': 'Con · Tab Thuốc',
  'screen:/child/visits': 'Con · Tab Đi khám',
  'screen:/child/family': 'Con · Tab Gia đình',
  'screen:/child/alert': 'Con · Chi tiết cảnh báo',
  'screen:/child/scan': 'Con · Quét đơn thuốc',
  'screen:/child/visit-prep': 'Con · Chuẩn bị đi khám',
  'screen:/child/visit-record': 'Con · Ghi lại buổi khám',
  'screen:/child/visit-summary': 'Con · Tóm tắt buổi khám',
  'screen:/child/report': 'Con · Bảng 30 ngày cho bác sĩ',
  dose_taken: 'Bấm "Đã uống" trong app',
  dose_taken_from_notification: 'Bấm "Đã uống" ngay trên thông báo',
  dose_taken_after_followup: 'Uống sau khi được nhắc lại',
  dose_notification_opened: 'Bấm vào thông báo nhắc thuốc',
  dose_snoozed: 'Bấm "Nhắc lại sau 15 phút"',
  dose_skipped: 'Bấm "Hết thuốc / không uống được"',
  checkin_ok: 'Bấm "ổn"',
  sos_sent: 'Gửi SOS',
  sos_cancelled: 'Hủy SOS',
  scan_saved: 'Lưu đơn thuốc đã quét',
  restock: 'Bấm "Đã mua thêm thuốc"',
  report_shared: 'Gửi bảng 30 ngày cho bác sĩ',
  summary_shared: 'Gửi tóm tắt buổi khám',
  read_aloud: 'Tự đọc to khi nhắc thuốc',
};
