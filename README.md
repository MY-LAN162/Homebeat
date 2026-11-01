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

**Máy chủ đồng bộ (Firebase)** — code đã xong, cần tạo dự án Firebase để chạy thật (xem mục *Máy chủ đồng bộ* bên dưới):

- **Ghép máy bằng mã 6 số:** con tạo mã trên máy mình, bố mẹ nhập mã trên máy bố mẹ. Mã dùng 1 lần, hết hạn sau 24 giờ, nhập sai quá 5 lần trong 10 phút thì phải chờ.
- **Đồng bộ hai chiều:** con nhập thuốc, lịch khám, người nhận cảnh báo, cài đặt → máy bố mẹ nhận. Bố mẹ uống thuốc, điểm danh, đo huyết áp, bấm SOS → máy con thấy ngay.
- **Mất mạng vẫn chạy:** dữ liệu vẫn lưu trên máy; có mạng lại thì tự gửi phần còn thiếu.
- **Nhịp "còn sống":** máy bố mẹ báo lên máy chủ khi mở app và 15 phút một lần khi đang mở.
- **Thông báo đẩy cho con:** SOS gửi ngay; trễ thuốc, chưa điểm danh, huyết áp cao, báo "không khỏe" thì máy chủ kiểm tra 5 phút một lần và gửi (mỗi cảnh báo 1 lần/ngày).
- Chưa điền cấu hình Firebase thì app chạy như cũ (chỉ lưu trên máy).

### Chưa làm

1. **Tạo dự án Firebase thật** và điền cấu hình (xem bên dưới). Cần mã dự án EAS để máy con nhận được thông báo đẩy.
2. **Cảnh báo "mất tín hiệu" qua thông báo đẩy.** Máy bố mẹ hiện chỉ báo "còn sống" khi đang mở app, nên máy chủ CHƯA gửi loại cảnh báo này (tránh báo nhầm). Cần thêm chạy nền trên máy bố mẹ. Trong app của con, dòng "Mất tín hiệu" vẫn hiện theo `lastSeenAt`.
3. **Nhiều con cùng theo dõi một gia đình.** Hiện mỗi gia đình do một máy con tạo; chưa có cách mời thêm máy con khác.
4. **Pin máy bố mẹ:** trường `battery` đã có nhưng chưa đọc pin (cần thêm `expo-battery`).
5. **Các tính năng AI** (đã có thiết kế, chưa lập trình): quét đơn thuốc, gợi ý câu hỏi cho bác sĩ, ghi âm và tóm tắt buổi khám.
6. **Chụp ảnh viên thuốc.** Trường `photoUri` đã có, còn thiếu màn hình chụp ảnh.

Ở chế độ thử, có thể xem cả hai vai trò trên một máy: chọn **Dùng thử với dữ liệu mẫu**, rồi vào **Gia đình › Xem màn hình của bố**.

## Chạy thử

```bash
npm install
npx expo start
```

Quét mã QR bằng app **Expo Go** trên điện thoại. Nếu thông báo nhắc thuốc không hiện trong Expo Go, cần tạo bản development build: `npx eas-cli@latest build --profile development`.

Bản chạy trên trình duyệt (để xem nhanh giao diện): `npx expo start --web`.

## Máy chủ đồng bộ

Cấu trúc:

| File | Việc |
|---|---|
| `src/domain/syncdiff.ts` | Phần thuần: tính cần ghi gì lên máy chủ, gộp dữ liệu máy chủ về máy |
| `src/services/sync.ts` | Giao diện `FamilySync` |
| `src/services/firebaseSync.ts` | Cài `FamilySync` bằng Firebase (Auth ẩn danh, Firestore, Cloud Functions) |
| `src/services/syncEngine.ts` | Nối kho dữ liệu của app với máy chủ |
| `src/services/memorySync.ts` | Máy chủ giả trong bộ nhớ, dùng cho kiểm thử |
| `firestore.rules` | Luật bảo mật: chỉ người trong gia đình đọc/ghi được |
| `functions/` | Cloud Functions: đổi mã kết nối, gửi SOS, kiểm tra cảnh báo định kỳ |

Các bước chạy thật:

1. Tạo dự án ở [Firebase console](https://console.firebase.google.com), gói **Blaze** (Cloud Functions cần gói này).
2. Bật **Authentication › Anonymous**, tạo **Firestore** (khu vực `asia-southeast1`).
3. Thêm **Web app**, chép cấu hình vào file `.env` (mẫu ở `.env.example`).
4. Cài công cụ và triển khai luật + functions:

   ```bash
   npm --prefix functions install
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore,functions
   ```

5. Thông báo đẩy cho con: tạo dự án EAS (`npx eas-cli@latest init`, sẽ thêm `extra.eas.projectId` vào `app.json`) và dùng bản development build.

Giờ địa phương cho cảnh báo mặc định là giờ Việt Nam (đổi bằng biến `APP_TZ` của functions).

## Kiểm tra

```bash
npm test            # 29 bài kiểm thử: lịch thuốc, cảnh báo, xưng hô, mã kết nối, đồng bộ hai máy
npm --prefix functions test         # 5 bài kiểm thử logic máy chủ
npm --prefix functions run test:rules   # 5 bài kiểm thử luật bảo mật (cần Java, chạy trên Firestore Emulator)
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
