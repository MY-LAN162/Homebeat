// Tên khóa lưu trên máy (AsyncStorage), dùng chung giữa app và phần chạy nền.
export const DATA_KEY = 'homebeat:data:v1';
/** Bản dữ liệu máy chủ đã xác nhận (mốc so sánh khi gửi thay đổi). */
export const BASE_KEY = 'homebeat:synced:v1';
/** Cảnh báo đã tự báo cho con hôm nay (chống báo trùng). */
export const BG_SENT_KEY = 'homebeat:bg-sent:v1';
/** Lần cuối phần chạy nền chạy (để xem trong Mức sử dụng). */
export const BG_LAST_KEY = 'homebeat:bg-last:v1';
/** Cảnh báo mất tín hiệu / pin yếu máy con đã tự báo (chống báo trùng). */
export const BG_SIGNAL_KEY = 'homebeat:bg-signal:v1';
/** Lịch thuốc máy bố mẹ đã đặt giờ nhắc theo (để biết con vừa đổi lịch khi chạy nền). */
/** Ngày máy con đã gửi tóm tắt buổi tối (mỗi ngày một lần). */
export const BG_SUMMARY_KEY = 'homebeat:bg-summary:v1';
export const BG_SCHED_KEY = 'homebeat:bg-sched:v1';
/** Thông báo đẩy chưa gửi được (mất mạng), chờ gửi lại. */
export const OUTBOX_KEY = 'homebeat:outbox:v1';
