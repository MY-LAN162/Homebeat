// Tên khóa lưu trên máy (AsyncStorage), dùng chung giữa app và phần chạy nền.
export const DATA_KEY = 'homebeat:data:v1';
/** Bản dữ liệu máy chủ đã xác nhận (mốc so sánh khi gửi thay đổi). */
export const BASE_KEY = 'homebeat:synced:v1';
/** Cảnh báo đã tự báo cho con hôm nay (chống báo trùng). */
export const BG_SENT_KEY = 'homebeat:bg-sent:v1';
/** Lần cuối phần chạy nền chạy (để xem trong Mức sử dụng). */
export const BG_LAST_KEY = 'homebeat:bg-last:v1';
