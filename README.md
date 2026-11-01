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
- **Quét đơn thuốc:** đọc chữ trên đơn, tách tên thuốc, hàm lượng, số viên, sáng/trưa/tối, sau ăn. Dòng chưa chắc được tô cam để con kiểm tra. Thuốc đã có thì cập nhật, không thêm trùng. Bản dùng thử nhận chữ gõ/dán hoặc đơn mẫu; bước chụp ảnh → chữ làm ở bản cài thật.
- **Tab Đi khám:** lịch khám, người đưa đi.
- **Chuẩn bị đi khám:** đếm ngày, câu hỏi cho bác sĩ (gợi ý từ nhật ký 7 ngày: huyết áp cao, quên thuốc, triệu chứng, nhiều loại thuốc; mỗi gợi ý ghi rõ lý do), danh sách đồ cần mang.
- **Ghi lại buổi khám:** chuyển lời nói thành chữ tiếng Việt (bản web dùng nhận dạng giọng nói của trình duyệt), đánh dấu câu hỏi đã hỏi, sửa chữ được.
- **Tóm tắt buổi khám:** lọc lời bác sĩ thành "Bác sĩ nói gì", "Thay đổi thuốc" (bấm để cập nhật lịch nhắc), "Việc cần làm", "Tái khám" (bấm để thêm vào lịch); gửi cho cả nhà qua Zalo/tin nhắn.
- **Chi tiết cảnh báo:** bấm vào cảnh báo để xem hôm nay của bố mẹ, gọi bố mẹ / người thân / hàng xóm, xem vị trí SOS, cách cài để máy không tắt An Tâm, và "Bố ổn rồi, tắt cảnh báo".
- **Tab Gia đình:** người được chăm sóc, mã kết nối 6 số, thứ tự người nhận cảnh báo (kể cả hàng xóm, chỉ báo khi SOS).
- **Cài đặt cảnh báo:** ngưỡng trễ thuốc, giờ điểm danh, mức huyết áp, bỏ qua giờ ngủ, **nơi bố mẹ sống (múi giờ)**: giờ uống thuốc, điểm danh, giờ ngủ tính theo giờ ở đó, kể cả khi con ở nước khác.

Các tính năng "AI" ở trên **không dùng mô hình AI trả phí**: gợi ý và tóm tắt dựa trên quy tắc và dữ liệu đã ghi; đọc chữ trên ảnh và nhận dạng giọng nói dùng dịch vụ có sẵn của điện thoại (miễn phí).

**Máy chủ đồng bộ (Firebase)** — code đã xong, cần tạo dự án Firebase để chạy thật (xem mục *Máy chủ đồng bộ* bên dưới):

- **Ghép máy bằng mã 6 số:** con tạo mã trên máy mình, bố mẹ nhập mã trên máy bố mẹ. Mã dùng 1 lần, hết hạn sau 24 giờ, nhập sai quá 5 lần trong 10 phút thì phải chờ.
- **Đồng bộ hai chiều:** con nhập thuốc, lịch khám, người nhận cảnh báo, cài đặt → máy bố mẹ nhận. Bố mẹ uống thuốc, điểm danh, đo huyết áp, bấm SOS → máy con thấy ngay.
- **Mất mạng vẫn chạy:** dữ liệu vẫn lưu trên máy; có mạng lại thì tự gửi phần còn thiếu.
- **Nhịp "còn sống":** máy bố mẹ báo lên máy chủ khi mở app và 15 phút một lần khi đang mở.
- **Thông báo đẩy cho con:** SOS gửi ngay; trễ thuốc, chưa điểm danh, huyết áp cao, báo "không khỏe" thì máy chủ kiểm tra 5 phút một lần và gửi (mỗi cảnh báo 1 lần/ngày).
- Chưa điền cấu hình Firebase thì app chạy như cũ (chỉ lưu trên máy).

### Để dành cho bước triển khai thật

Theo yêu cầu: làm xong giao diện và cho dùng thử trước; khi triển khai thật mới làm các phần dưới, và quyết định có mua gói trả phí hay không.

1. **Chọn cách chạy máy chủ:** miễn phí hoàn toàn (Firebase gói Spark, điện thoại tự gửi cảnh báo qua Expo Push, con bấm "Đồng ý" khi có máy mới xin vào gia đình) hoặc Firebase gói Blaze (Cloud Functions đã viết sẵn, cảnh báo đúng giờ hơn). Xem mục *Chi phí* bên dưới.
2. **Chạy nền trên máy bố mẹ** để báo "còn sống" khi không mở app; sau đó mới bật thông báo đẩy "mất tín hiệu".
3. **Chụp ảnh → chữ** cho quét đơn thuốc (ML Kit / Apple Vision, chạy trên máy) và **nhận dạng giọng nói trên điện thoại** (thư viện `expo-speech-recognition`). Cả hai cần bản development build.
4. **Nhiều con cùng theo dõi một gia đình**, **đọc pin máy bố mẹ** (`expo-battery`), **chụp ảnh viên thuốc**.
5. Tài khoản Expo (EAS) để build file cài Android/iPhone; tài khoản Google Play / Apple để đưa lên kho.

Ở chế độ thử, có thể xem cả hai vai trò trên một máy: chọn **Dùng thử với dữ liệu mẫu**, rồi vào **Gia đình › Xem màn hình của bố**.

## Chạy thử

```bash
npm install
npx expo start
```

Quét mã QR bằng app **Expo Go** trên điện thoại. Nếu thông báo nhắc thuốc không hiện trong Expo Go, cần tạo bản development build: `npx eas-cli@latest build --profile development`.

Bản chạy trên trình duyệt (để xem nhanh giao diện): `npx expo start --web`.

## Chi phí khi triển khai thật

Trong lúc làm và dùng thử: 0đ (chạy bằng Firebase Emulator và bản web). Khi có người dùng thật:

| Khoản | Ít người dùng | Nhiều người dùng |
|---|---|---|
| Firebase gói Spark (đăng nhập, lưu và đồng bộ dữ liệu) | 0đ, miễn phí 50.000 lượt đọc + 20.000 lượt ghi mỗi ngày | Vượt hạn mức thì lên Blaze, trả phần vượt |
| Cloud Functions (chỉ gói Blaze, phải gắn thẻ) | Khoảng 0đ (2 triệu lượt gọi/tháng miễn phí) | Khoảng 0,4 USD / triệu lượt vượt + thời gian chạy |
| Thông báo đẩy Expo | Miễn phí | Miễn phí |
| Build app (EAS) | Gói miễn phí có giới hạn số build/tháng | Gói trả phí 19–99 USD/tháng nếu build nhiều |
| Phần "AI" (chạy trên điện thoại) | 0đ | 0đ |
| Kho ứng dụng | Google Play ~25 USD một lần, Apple ~99 USD/năm (cần kiểm tra lại) | Như bên trái |

Ước tính (chưa đo thật): mỗi gia đình ~50 lượt ghi + ~100 lượt đọc/ngày, nên gói miễn phí đủ cho khoảng vài trăm gia đình. Nguồn giá: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Expo pricing](https://expo.dev/pricing). Giá có thể đổi, xem lại trang chính thức trước khi mua.

## Kiểm tra lần build này (1/11/2026)

**Đã chạy:** typecheck, lint, 41 bài kiểm thử app + 5 logic máy chủ + 5 luật bảo mật (trên Firestore Emulator), đóng gói Android / iOS / web không lỗi, chạy thử 25 bước qua mọi màn hình bằng trình duyệt cỡ điện thoại (không có lỗi console), chạy thử ghép 2 máy qua máy chủ thật (emulator).

**Lỗi phát hiện và đã sửa:**

| Lỗi | Ảnh hưởng | Đã sửa |
|---|---|---|
| Tỷ lệ uống thuốc tính cả những ngày trước khi thêm thuốc | Gợi ý sai "bố hay quên thuốc 39 lần" | Ghi ngày thêm thuốc, chỉ tính từ ngày đó; câu chữ nhẹ hơn ("quên 2 lần trong 7 ngày") |
| Quét đơn thuốc thêm trùng thuốc đã có | Bố mẹ bị nhắc uống gấp đôi ("4 viên") | Nhận ra thuốc đã có (kể cả viết hơi khác: Amlodipin / Amlodipine), cập nhật thay vì thêm |
| Mở thẳng trang Quét đơn / Thêm lịch khám khi dữ liệu chưa tải | Nút bị khóa, không chọn được người | Chọn người lúc vẽ màn hình |
| Hộp thoại xác nhận không hiện trên bản web | Không xóa được thuốc, không thấy báo lỗi | Hộp thoại vẽ ngay trong app, chạy ở mọi nơi |
| Xóa người nhận cảnh báo không hỏi lại | Dễ bấm nhầm | Hỏi lại trước khi xóa |
| Gia đình mới tạo bị mất dữ liệu khi nối máy chủ; cấu hình Firebase không vào app | Mất dữ liệu, không đồng bộ | Gửi trước rồi mới nghe máy chủ; đọc đúng biến `EXPO_PUBLIC_*` |
| Link hỏng / đường dẫn lạ | Màn hình lỗi | Tự quay về trang đầu |

**Rà độ dễ dùng (mọi lứa tuổi, mọi trình độ):**

- Bỏ từ kỹ thuật trên màn hình ("chưa nối máy chủ" → không hiện; "AI đọc được" → "Máy đọc được").
- Nút bấm cao 44–72 điểm, chữ màn hình bố mẹ 18–30, mỗi màn hình bố mẹ chỉ một việc chính.
- Không có số điện thoại thì không hiện nút xám bấm không được; thay bằng "Thêm số điện thoại của bố để gọi nhanh".
- Gợi ý câu hỏi và dòng chưa chắc trên đơn thuốc đều ghi rõ lý do, để người dùng tự kiểm tra, không phải tin máy.
- Các việc không hoàn tác được (xóa thuốc, xóa người, xóa dữ liệu) đều hỏi lại.

**Nên làm thêm (chưa làm, cần Lan chốt):** chữ to hơn cho màn hình của con khi con cũng lớn tuổi (tùy chọn cỡ chữ); hướng dẫn lần đầu 3 bước cho bố mẹ; đọc to cả màn hình nhắc thuốc tự động khi mở.

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
npm test            # 41 bài kiểm thử: lịch thuốc, cảnh báo, xưng hô, mã kết nối, đồng bộ hai máy, đọc đơn thuốc, tóm tắt buổi khám, múi giờ
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
