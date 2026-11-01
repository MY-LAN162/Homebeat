# Homebeat · An Tâm

Ứng dụng giúp con cái chăm sóc bố mẹ ở xa: nhắc bố mẹ uống thuốc, bố mẹ bấm "ổn" mỗi ngày, nút SOS, và con theo dõi tình hình của bố mẹ.

Viết bằng **React Native (Expo SDK 57)**, chạy được trên cả Android và iPhone.

## Trạng thái hiện tại (bản MVP)

### Đã chạy được

**Trên máy của bố mẹ** (chạy độc lập, không cần internet):

- **Xưng hô theo gia đình:** chọn bố/mẹ/ông/bà và con/cháu, ví dụ "Đến giờ uống thuốc rồi bà ơi", "Cháu ơi, bà ổn".
- **Nhắc uống thuốc:** thông báo hằng ngày theo lịch. Có các nút "Đã uống", "Nhắc lại sau 15 phút", "Hết thuốc / không uống được", và tự trừ số viên còn lại.
- **Điểm danh:** bấm "ổn" mỗi ngày.
- **Hỏi thăm sức khỏe:** chọn khỏe / hơi mệt / không khỏe, kèm triệu chứng.
- **Nhập huyết áp:** dùng nút + / − cỡ lớn, so với mức con đã đặt.
- **SOS:** giữ nút 3 giây (có vạch tiến trình), đếm ngược 3 giây để kịp hủy, rồi mở tin nhắn SMS soạn sẵn kèm link vị trí và gọi người nhận đầu tiên. Nếu chưa có số điện thoại nào, app báo rõ là "Chưa gửi được" và hiện nút gọi 115.
- **Đọc to:** đọc màn hình bằng giọng tiếng Việt.

**Trên máy của con:**

- **Trang chủ gia đình:** cảnh báo trễ thuốc, chưa điểm danh, huyết áp cao, báo mệt, SOS, sắp hết thuốc.
- **Chi tiết từng người:** dòng thời gian trong ngày và biểu đồ huyết áp.
- **Tab Thuốc:** thêm, sửa, xóa thuốc, chọn giờ uống, nhập số viên còn lại, xem tỷ lệ uống đúng giờ trong 7 ngày.
- **Tab Đi khám:** lịch khám, người đưa đi.
- **Tab Gia đình:** người được chăm sóc, mã kết nối 6 số, thứ tự người nhận cảnh báo (kể cả hàng xóm, chỉ báo khi SOS).
- **Cài đặt cảnh báo:** ngưỡng trễ thuốc, giờ điểm danh, mức huyết áp, bỏ qua giờ ngủ.

### Chưa làm

1. **Máy chủ đồng bộ.** Đây là việc quan trọng nhất. Hiện dữ liệu chỉ lưu trên từng máy, nên máy của con chưa nhận được dữ liệu thật từ máy bố mẹ. Giao diện đồng bộ đã định nghĩa sẵn ở `src/services/sync.ts`; cần cài bằng Firebase hoặc Supabase, cùng thông báo đẩy cho con.
2. **Mã kết nối giữa hai máy.** Phụ thuộc vào máy chủ ở mục 1. Hiện mã chỉ dùng được trên chính máy đã tạo mã (để thử).
3. **Cảnh báo "không di chuyển / mất tín hiệu".** Logic đã có (`src/domain/alerts.ts`), nhưng cần máy chủ và nhịp báo định kỳ từ máy bố mẹ.
4. **Các tính năng AI** (đã có thiết kế, chưa lập trình): quét đơn thuốc, gợi ý câu hỏi cho bác sĩ, ghi âm và tóm tắt buổi khám.
5. **Chụp ảnh viên thuốc.** Trường `photoUri` đã có, còn thiếu màn hình chụp ảnh.

Ở chế độ thử, có thể xem cả hai vai trò trên một máy: chọn **Dùng thử với dữ liệu mẫu**, rồi vào **Gia đình › Xem màn hình của bố**.

## Chạy thử

```bash
npm install
npx expo start
```

Quét mã QR bằng app **Expo Go** trên điện thoại. Nếu thông báo nhắc thuốc không hiện trong Expo Go, cần tạo bản development build: `npx eas-cli@latest build --profile development`.

Bản chạy trên trình duyệt (để xem nhanh giao diện): `npx expo start --web`.

## Kiểm tra

```bash
npm test            # 18 bài kiểm thử cho lịch thuốc, cảnh báo, xưng hô, mã kết nối
npm run typecheck   # kiểm tra kiểu TypeScript
npx expo lint
```

## Cấu trúc

```
src/
  app/                 Màn hình (Expo Router)
    onboarding/        Chọn vai trò, con thêm bố mẹ, bố mẹ nhập mã, cấp quyền
    parent/            Màn hình bố mẹ: trang chủ, nhắc thuốc, hỏi thăm, huyết áp, SOS
    child/             Màn hình con: trang chủ, thuốc, đi khám, gia đình, cài đặt
  domain/              Logic thuần, có kiểm thử: lịch thuốc, cảnh báo, xưng hô, mã kết nối
  services/            Thông báo, đọc to, gọi điện / SMS / vị trí, đồng bộ (chưa làm)
  state/store.tsx      Kho dữ liệu (đang lưu trên máy bằng AsyncStorage)
  components/ui.tsx    Nút, thẻ, nút giữ SOS, bộ tăng giảm số...
design/                22 màn hình thiết kế (.dc.html) và canvas.json
```

## Lưu ý

- An Tâm chỉ giúp nhắc lịch, không thay thế tư vấn của bác sĩ, dược sĩ. Mức huyết áp trong app là ngưỡng để báo cho con, không phải chẩn đoán.
- App lưu đơn thuốc, triệu chứng và huyết áp, tức là dữ liệu sức khỏe. Trước khi phát hành, nên hỏi ý kiến luật sư về các quy định bảo vệ dữ liệu cá nhân tại Việt Nam, đặc biệt khi bắt đầu lưu dữ liệu lên máy chủ.
- Một số dòng máy Android (Xiaomi, Oppo, Vivo...) hay tự tắt app chạy nền. Màn hình cấp quyền có hướng dẫn, nhưng cần thử trên máy thật.
