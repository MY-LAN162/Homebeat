// Quy tắc cảnh báo tính theo giờ địa phương. Máy chủ chạy giờ UTC, nên đặt múi giờ trước khi
// dùng Date. Lấy từ biến APP_TZ, mặc định giờ Việt Nam. Phải import file này đầu tiên.
process.env.TZ = process.env.APP_TZ || 'Asia/Ho_Chi_Minh';
export {};
