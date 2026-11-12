# Homebeat · An Tâm

Ứng dụng giúp con cái chăm sóc bố mẹ ở xa: nhắc bố mẹ uống thuốc, bố mẹ bấm "ổn" mỗi ngày, nút SOS, và con theo dõi tình hình của bố mẹ.

Viết bằng **React Native (Expo SDK 57)**, chạy được trên cả Android và iPhone.

## Trạng thái hiện tại (bản MVP)

### Đã chạy được

**Trên máy của bố mẹ** (chạy độc lập, không cần internet):

- **Xưng hô theo gia đình:** chọn bố/mẹ/ông/bà và con/cháu, ví dụ "Đến giờ uống thuốc rồi bà ơi", "Cháu ơi, bà ổn".
- **Nhắc uống thuốc:** thông báo hằng ngày theo lịch, có nút **"Đã uống" ngay trên thông báo** (bấm là ghi nhận). Bấm vào thông báo thì mở thẳng màn hình uống thuốc. Chưa bấm thì **tự nhắc lại 2 lần** (vd sau 10 và 20 phút) rồi mới báo con. Trong app có "Đã uống", "Nhắc lại sau 15 phút", "Hết thuốc / không uống được", tự trừ số viên còn lại.
- **Tự đọc to** tên thuốc và số viên khi mở màn hình nhắc thuốc (con bật/tắt trong Cài đặt).
- **Điểm danh:** bấm "ổn" mỗi ngày.
- **Hỏi thăm sức khỏe:** chọn khỏe / hơi mệt / không khỏe, kèm triệu chứng.
- **Nhập huyết áp:** dùng nút + / − cỡ lớn, so với mức con đã đặt.
- **SOS:** giữ nút 3 giây, đếm ngược 3 giây để kịp hủy, rồi ghi nhận SOS (máy con thấy qua đồng bộ), gọi người đầu tiên, có nút gửi tin nhắn kèm vị trí, gọi người tiếp theo, gọi 115. **Mỗi dòng trạng thái chỉ ghi điều đã thật sự xảy ra**: không báo "đã gửi" khi tin nhắn mới được mở ra.
- **Đọc to:** đọc màn hình bằng giọng tiếng Việt.

**Trên máy của con:**

- **Trang chủ gia đình:** cảnh báo trễ thuốc, chưa điểm danh, huyết áp cao, báo mệt, SOS, sắp hết thuốc.
- **Chi tiết từng người:** dòng thời gian trong ngày và biểu đồ huyết áp.
- **Tab Thuốc:** thêm, sửa, xóa thuốc, chọn giờ uống, nhập số viên còn lại, xem tỷ lệ uống đúng giờ trong 7 ngày.
- **Sắp hết thuốc:** hiện ngay trên trang chủ của con, bấm "+30 viên / +60 viên" khi đã mua thêm.
- **Tình hình 30 ngày cho bác sĩ:** huyết áp (biểu đồ, trung bình, cao nhất), tỷ lệ uống thuốc và thuốc hay bỏ lỡ, triệu chứng tự báo, thuốc đang dùng; chọn 7 / 30 / 90 ngày; gửi qua Zalo.
- **Mức sử dụng app (thử nghiệm):** đếm ngay trên máy số lần dùng từng tính năng và tỷ lệ uống thuốc đúng giờ, để biết tính năng nào có ích khi thử với gia đình thật. Không tự gửi đi đâu; người dùng tự bấm "Gửi" nếu muốn.
- **Quét đơn thuốc:** đọc chữ trên đơn, tách tên thuốc, hàm lượng, số viên, sáng/trưa/tối, sau ăn. Dòng chưa chắc được tô cam để con kiểm tra. Thuốc đã có thì cập nhật, không thêm trùng. Bản dùng thử nhận chữ gõ/dán hoặc đơn mẫu; bước chụp ảnh → chữ làm ở bản cài thật.
- **Tab Đi khám:** lịch khám, người đưa đi.
- **Chuẩn bị đi khám:** đếm ngày, câu hỏi cho bác sĩ (gợi ý từ nhật ký 7 ngày: huyết áp cao, quên thuốc, triệu chứng, nhiều loại thuốc; mỗi gợi ý ghi rõ lý do), danh sách đồ cần mang.
- **Ghi lại buổi khám:** chuyển lời nói thành chữ tiếng Việt (bản web dùng nhận dạng giọng nói của trình duyệt), đánh dấu câu hỏi đã hỏi, sửa chữ được.
- **Tóm tắt buổi khám:** lọc lời bác sĩ thành "Bác sĩ nói gì", "Thay đổi thuốc" (bấm để cập nhật lịch nhắc), "Việc cần làm", "Tái khám" (bấm để thêm vào lịch); gửi cho cả nhà qua Zalo/tin nhắn.
- **Chi tiết cảnh báo:** bấm vào cảnh báo để xem hôm nay của bố mẹ, gọi bố mẹ / người thân / hàng xóm, xem vị trí SOS, cách cài để máy không tắt An Tâm, và "Bố ổn rồi, tắt cảnh báo".
- **Tab Gia đình:** người được chăm sóc, mã kết nối 6 số, thứ tự người nhận cảnh báo (kể cả hàng xóm, chỉ báo khi SOS).
- **Cài đặt cảnh báo:** ngưỡng trễ thuốc, giờ điểm danh, mức huyết áp, bỏ qua giờ ngủ, **nơi bố mẹ sống (múi giờ)**: giờ uống thuốc, điểm danh, giờ ngủ tính theo giờ ở đó, kể cả khi con ở nước khác.

Các tính năng "AI" ở trên **không dùng mô hình AI trả phí**: gợi ý và tóm tắt dựa trên quy tắc và dữ liệu đã ghi; đọc chữ trên ảnh và nhận dạng giọng nói dùng dịch vụ có sẵn của điện thoại (miễn phí).

**Dễ dùng cho mọi lứa tuổi:**

- **Hướng dẫn lần đầu 3 bước cho bố mẹ** (bấm "ổn" mỗi sáng → uống thuốc → SOS), chữ to, tự đọc to; xem lại được bằng nút "Xem lại hướng dẫn".
- **Cỡ chữ** Bình thường / Lớn / Rất lớn cho từng máy (Cài đặt).
- Nút "‹ Quay lại" có chữ; "Quay lại" về đúng màn hình trước.

**Máy chủ đồng bộ — miễn phí (Firebase gói Spark, không cần thẻ ngân hàng):** code đã xong và đã chạy thử 2 máy qua Firebase Emulator; cần tạo dự án Firebase để chạy thật (xem mục *Máy chủ đồng bộ* bên dưới).

- **Ghép máy:** con tạo mã 6 số → bố mẹ nhập mã trên máy bố mẹ → máy con hiện "Có máy xin kết nối làm máy của bố…" → con bấm **Đồng ý**. Đoán trúng mã cũng không tự vào được. Mã dùng 1 lần, hết hạn sau 24 giờ.
- **Đồng bộ hai chiều:** con nhập thuốc, lịch khám, người nhận cảnh báo, cài đặt → máy bố mẹ nhận. Bố mẹ uống thuốc, điểm danh, đo huyết áp, bấm SOS → máy con thấy ngay.
- **Mất mạng vẫn chạy:** dữ liệu lưu trên máy; có mạng lại thì tự gửi phần còn thiếu. App chỉ xóa trên máy chủ những gì người dùng thật sự bấm xóa (không bao giờ xóa nhầm khi app tắt giữa chừng).
- **Thông báo cho con (miễn phí qua Expo Push, gửi thẳng từ máy bố mẹ):** SOS, huyết áp cao, báo "không khỏe" gửi ngay; trễ thuốc, chưa điểm danh gửi khi máy bố mẹ chạy nền (khoảng 15 phút một lần, tùy điện thoại cho phép) hoặc khi mở app. Mỗi cảnh báo 1 lần/ngày.
- **Nhịp "còn sống" kèm pin:** máy bố mẹ báo khi mở app, mỗi 15 phút khi đang mở, và khi chạy nền.
- Chưa điền cấu hình Firebase thì app chạy như cũ (chỉ lưu trên máy).

### Để dành cho bước triển khai thật

1. **Tạo dự án Firebase** (gói Spark miễn phí) và **tài khoản Expo** để build file cài (xem các mục bên dưới).
2. **Chụp ảnh → chữ** cho quét đơn thuốc (ML Kit / Apple Vision, chạy trên máy) và **nhận dạng giọng nói trên điện thoại** (`expo-speech-recognition`). Hiện bản web dùng giọng nói của trình duyệt; bản cài cần thêm 2 thư viện này.
3. **Chụp ảnh viên thuốc**.
4. **Hạn chế đã biết của gói miễn phí:** iPhone không đảm bảo giờ chạy nền, nên cảnh báo trễ thuốc có thể đến chậm 15–60 phút; cảnh báo "mất tín hiệu" do máy con tự kiểm tra khi chạy nền, nên cũng có thể chậm. Khi cần đúng giờ hơn: bật Firebase gói Blaze, Cloud Functions trong `functions/` đã viết sẵn.
5. Tài khoản Google Play / Apple để đưa lên kho (khi phát hành rộng).

Ở chế độ thử, có thể xem cả hai vai trò trên một máy: chọn **Dùng thử với dữ liệu mẫu**, rồi vào **Gia đình › Xem màn hình của bố**.

## Chạy thử

```bash
npm install
npx expo start
```

Quét mã QR bằng app **Expo Go** trên điện thoại. Nếu thông báo nhắc thuốc không hiện trong Expo Go, cần tạo bản development build: `npx eas-cli@latest build --profile development`.

Bản chạy trên trình duyệt (để xem nhanh giao diện): `npx expo start --web`.

## Bảo mật và quyền riêng tư

Tất cả miễn phí (Firebase gói Spark, thư viện mã nguồn mở). Đã kiểm thử: 13 kiểm thử luật bảo mật trên Firestore Emulator, 66 kiểm thử app, chạy thử nhiều máy 17 bước.

| Bảo vệ | Chống được gì |
|---|---|
| Chỉ máy trong gia đình đọc/ghi được dữ liệu (luật Firestore) | Người lạ xem thông tin sức khỏe, vị trí |
| Vào gia đình: mã 6 số (1 lần, 24 giờ) **và** người trong gia đình bấm Đồng ý | Đoán trúng mã cũng không vào được |
| Khôi phục khi đổi máy: bố mẹ / người nhà tạo mã cho máy mới; hoặc đăng nhập email đã liên kết (Cài đặt) | Mất quyền vào gia đình khi đổi máy, cài lại app |
| Chỉ máy "quản lý gia đình" gỡ được máy khác; màn hình "Các máy trong gia đình"; chuyển quyền quản lý | Bấm nhầm gỡ máy; máy mất / máy lạ vẫn còn quyền |
| Máy chủ kiểm tra dữ liệu: đúng trường, đúng kiểu, độ dài và số trong khoảng hợp lý | Máy lỗi / mã độc ghi dữ liệu rác, tốn hạn mức |
| Chỉ xóa trên máy chủ thứ người dùng bấm xóa | Mất dữ liệu khi app tắt giữa chừng |
| Dữ liệu trên điện thoại được mã hóa (XChaCha20-Poly1305); khóa giữ trong Keychain / Keystore | Ai lấy được file dữ liệu của app cũng không đọc được |
| Khóa app bằng vân tay / khuôn mặt / mã máy (máy của con; máy bố mẹ không khóa để SOS luôn bấm được) | Người khác cầm máy đã mở khóa |
| Chỉ máy của con / máy quản lý xóa được dữ liệu; vai trò máy lấy theo yêu cầu đã được Đồng ý | Máy bố mẹ nhiễm mã độc xóa dữ liệu cả nhà hoặc tự nâng quyền |
| Máy con tự báo khi máy bố mẹ mất tín hiệu, pin yếu | Máy bố mẹ hết pin, bị tắt mà không ai biết |
| Lời bác sĩ chỉ lưu trên máy ghi, trừ khi bấm chia sẻ | Dữ liệu sức khỏe đi xa hơn cần thiết |
| Chính sách quyền riêng tư (`PRIVACY.md`, trong app), xin đồng ý lần đầu; xóa toàn bộ dữ liệu gia đình (máy quản lý); rời gia đình | Yêu cầu pháp lý về dữ liệu cá nhân nhạy cảm, yêu cầu của kho ứng dụng |

**Còn lại / hạn chế đã biết:**

- **App Check** đã cài trong code (điện thoại: React Native Firebase với Play Integrity / App Attest; web: reCAPTCHA v3 tùy chọn). Còn chờ: Lan đăng ký app trong Firebase console và bật "Enforce" (xem mục *App Check* bên dưới); chưa chạy thử trên điện thoại thật.
- `PRIVACY.md` là **bản nháp**, cần luật sư xem lại; điền email liên hệ trước khi phát hành.
- Bản web (trang dùng thử) không mã hóa dữ liệu trên trình duyệt và không có khóa vân tay.
- Nội dung thông báo (vd "Bố chưa uống thuốc 12:00") hiện trên màn hình khóa của máy con, theo cài đặt thông báo của điện thoại.
- Khi bật Firebase thật: vào **Authentication › Sign-in method** bật **Anonymous** và **Email/Password**.

## App Check (chỉ app thật mới gọi được máy chủ)

Miễn phí. Chặn công cụ giả mạo app (vd dò mã kết nối liên tục để đốt hạn mức miễn phí, làm app ngừng chạy).

Cách hoạt động trong code:
- Điện thoại dùng **React Native Firebase** (`src/services/fbsdk.native.ts`): bản phát hành chứng thực bằng **Play Integrity** (Android) và **App Attest** (iPhone, tự lùi về DeviceCheck nếu máy cũ); bản thử nghiệm (development build) dùng mã debug.
- Web dùng thư viện Firebase JavaScript (`src/services/fbsdk.ts`), App Check bằng reCAPTCHA v3 nếu có `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` (tùy chọn, chỉ cần khi mở bản web cho người dùng thật).
- Phần đồng bộ (`src/services/firebaseSync.ts`) dùng chung cho cả hai.

Các bước Lan làm (một lần):

1. Firebase console › Project settings › **Thêm app Android** (package `co.keendigital.homebeat`) và **app iOS** (bundle `co.keendigital.homebeat`); tải `google-services.json` và `GoogleService-Info.plist`.
2. **Không đưa 2 file này lên GitHub** (repo công khai, đã có trong `.gitignore`). Đưa lên EAS dạng biến môi trường kiểu file:

   ```bash
   npx eas-cli@latest env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   ```

   ```bash
   npx eas-cli@latest env:create --environment preview --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
   ```

   (`app.config.js` tự đọc 2 biến này; build trên máy thì chỉ cần để 2 file ở thư mục gốc.)
3. Lấy dấu vân tay chứng chỉ ký app Android (SHA-256): `npx eas-cli@latest credentials` › Android › xem "SHA256 Fingerprint". Thêm vào Firebase console › Project settings › app Android.
4. Firebase console › **App Check** › đăng ký app Android với **Play Integrity**, app iOS với **App Attest** (bật thêm DeviceCheck).
5. Bản development build: chạy app, xem log có dòng mã debug App Check, thêm mã đó trong App Check › Manage debug tokens (hoặc đặt sẵn `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`).
6. Chạy thử vài ngày, xem tab **Metrics** của App Check thấy yêu cầu "verified", rồi bấm **Enforce** cho **Cloud Firestore** và **Authentication**. Sau khi Enforce, công cụ giả mạo app sẽ bị chặn.

Lưu ý: Expo Go không chạy được React Native Firebase; dùng bản cài (EAS build) như mục dưới.

## Cài lên điện thoại thật (file APK cho Android)

Đã cấu hình sẵn (`eas.json`, `app.json`): quyền thông báo, vị trí khi SOS, biểu tượng thông báo, kênh "Nhắc uống thuốc". Lan chỉ cần tài khoản Expo miễn phí (https://expo.dev/signup).

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

(Lệnh `init` tạo dự án trên Expo và tự thêm mã dự án vào `app.json`. Cần mã này để máy con nhận được thông báo đẩy.)

```bash
npx eas-cli@latest build -p android --profile preview
```

Build chạy trên máy chủ của Expo khoảng 15–25 phút, xong sẽ có **link tải file APK**: gửi link qua Zalo, mở trên điện thoại Android, cho phép "cài ứng dụng không rõ nguồn" là cài được. Gói miễn phí của Expo có giới hạn số lần build mỗi tháng.

- **Cấu hình Firebase** (khi đã có dự án Firebase): file `.env` không được gửi lên máy build, nên thêm từng biến bằng lệnh, ví dụ `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value <giá trị>` (làm tương tự cho các biến trong `.env.example`).
- **iPhone:** cần tài khoản Apple Developer (khoảng 99 USD/năm) và đăng ký từng máy thử (`npx eas-cli@latest device:create`), rồi build với `-p ios`.
- Đã thử sinh mã native Android (`expo prebuild`) với cấu hình này: thành công.

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

## Rà lại tính năng: cái gì thật sự được dùng

Nguyên tắc: chỉ thêm tính năng người dùng sẽ dùng thường xuyên và mang lại giá trị rõ; không làm "cho đủ".

| Mức dùng | Tính năng | Ghi chú |
|---|---|---|
| Hằng ngày (giá trị chính) | Nhắc thuốc, bấm "ổn", con xem tình hình | Đã rút việc ghi uống thuốc còn 1 bước (nút trên thông báo) và tự nhắc lại 2 lần |
| Hiếm nhưng quan trọng nhất | SOS | Đã sửa để không báo sai trạng thái |
| Hằng tháng | Sắp hết thuốc, chuẩn bị đi khám, bảng 30 ngày | Đã thêm nút "Đã mua thêm" và bảng 30 ngày cho bác sĩ |
| Cần thử thật trước khi làm thêm | Quét đơn thuốc (đơn viết tay khó đọc), ghi âm và tóm tắt buổi khám (phòng khám ồn) | Chưa đầu tư thêm cho tới khi có số liệu từ "Mức sử dụng app" |
| Không làm | Chat, gọi video (đã có Zalo), đếm bước, trò chơi, trợ lý AI trò chuyện | Dễ làm ra rồi bỏ đó |

**Cách quyết định tiếp:** thử với 5–10 gia đình trong 2 tuần, xem màn hình *Mức sử dụng app* (tỷ lệ uống đúng giờ, số lần phải nhắc lại, màn hình nào không ai mở), rồi giữ, bỏ hoặc làm tiếp theo số liệu.

## Thứ tự triển khai (Lan chốt 12/11/2026): việc tốn phí làm cuối

1. **Miễn phí, làm trước:** Expo (build file cài Android, 30 lần/tháng miễn phí) → Firebase gói Spark (đồng bộ 2 máy, đưa trang web lên `*.web.app`) → thử trên điện thoại thật, sửa lỗi.
2. **Tốn phí, làm cuối cùng:** Google Play Console (25 USD, một lần: thanh toán, mã giới thiệu, lên Google Play) · Apple Developer (99 USD/năm: bản iPhone) · Firebase Blaze (trả theo dùng: Cloud Functions báo đúng giờ hơn, kiểm tra hóa đơn) · tên miền riêng (vd antam.vn) · xin Apple quyền "Critical Alerts" cho SOS (đi kèm Apple Developer).

## Gói cước và giới thiệu bạn bè trong app (12/11/2026)

- `src/domain/billing.ts`: dùng thử 30 ngày; giá Nhỏ 89.000đ / Vừa 119.000đ / Lớn 179.000đ (năm: trả 10 tháng); mỗi gia đình một **mã giới thiệu 6 ký tự** (không có 0, O, 1, I). Giảm **10%** cho gia đình được giới thiệu, **5%** cho người giới thiệu, trong 2 tháng đầu sau khi gia đình được giới thiệu bắt đầu trả phí. Giới thiệu nhiều nhà: không cộng %, mỗi nhà thêm 2 tháng giảm 5%. Hai loại giảm không cộng nhau (lấy mức cao hơn). Gói năm chỉ giảm phần 2 tháng đầu.
- Màn hình **Gia đình › 🎁 Gói của gia đình và giới thiệu bạn bè**: còn bao nhiêu ngày dùng thử, chọn gói (theo tháng / năm, giá đã trừ giảm), mã của gia đình + nút gửi qua Zalo, nhập mã của người quen. Trang chủ con nhắc khi còn ≤ 5 ngày dùng thử.
- Máy chủ: `families/{id}/meta/billing`, `referralCodes/{mã}`, `referralCodes/{mã}/uses/{mã nhà được giới thiệu}`. Quy tắc: không đổi được ngày dùng thử / mã của mình / mã đã nhập; chỉ ghi được lượt giới thiệu khi gói của mình thật sự đã nhập mã đó.
- **Chưa thu tiền thật**: `src/services/purchases.ts` báo "sắp mở thanh toán" cho tới khi có tài khoản Google Play Console (25 USD) / Apple Developer (99 USD/năm), tạo gói đăng ký đúng mã `antam.<gói>.<month|year>` và thêm thư viện thanh toán. `BILLING_ENFORCED = false`: chưa khóa tính năng nào. Khi bật: SOS và chuông nhắc thuốc trên máy bố mẹ **không bao giờ bị khóa**.
- Giới hạn cần biết: Google Play / App Store không cho tự giảm giá một gói đang gia hạn; phần giảm 5% cho người giới thiệu sẽ phải làm bằng "ưu đãi" của cửa hàng hoặc tặng thêm ngày dùng (quyết khi mở cửa hàng). Ghi "đã trả" hiện do máy ghi sau khi cửa hàng báo thành công; khi có Cloud Functions (gói Blaze) nên để máy chủ kiểm tra hóa đơn.

Trang **KeenDigital** (https://claude.ai/artifact/3xCLyN8phvqnebfcay3qLv): phần Homebeat dài đã rút thành một thẻ **An Tâm** (giá từ 89.000đ, dùng thử 30 ngày, −10% / −5%, SOS 0đ) dẫn sang trang sản phẩm; bỏ nút đổi tiền tệ; điều khoản sửa "dùng thử 30 ngày", "máy tự đọc đơn thuốc".

## Trang web sản phẩm (12/11/2026)

- Bản xem trước: https://claude.ai/artifact/HF7CpDnLQPgve1Dcmec7tj (nguồn: `web/an-tam-web.html`). Tên **An Tâm**, giá 89.000 / 119.000 / 179.000đ mỗi tháng (theo năm: trả 10 tháng), dùng thử **30 ngày**, SOS miễn phí mãi mãi.
- **Giới thiệu bạn bè** (Lan chốt): gia đình được giới thiệu giảm **10%**, người giới thiệu giảm **5%**, trong **2 tháng đầu** sau khi gia đình được giới thiệu hết dùng thử và bắt đầu trả phí. Link `?gt=MÃ` điền sẵn mã giới thiệu; `?ma=482913` hiện mã kết nối cho bố mẹ.
- Form đăng ký: trong bản xem trước lưu vào kho dữ liệu của trang (chỉ quản trị đọc). Khi đưa lên tên miền thật cần nối Firestore. App **chưa có** phần thanh toán và mã giới thiệu: phải làm trước khi thu phí.
- `landing/index.html`: trang ngắn chỉ để tải app và nhập mã (Firebase Hosting).

## Bổ sung lần 8 (10/11/2026): các mục còn lại từ đợt rà

- **Huyết áp**: bấm vào số để gõ thẳng, giữ nút + / − để số chạy nhanh, xem 3 lần đo trước kèm câu "cao/thấp hơn lần trước". Nút "🩺 Ghi huyết áp" trên trang chủ bố mẹ.
- **Nhắc đo huyết áp** mỗi ngày (con chọn 07:00 / 08:00 / 20:00 hoặc không nhắc trong Cài đặt). Bấm thông báo mở thẳng màn nhập.
- **Máy bố mẹ tắt thông báo**: trang chủ bố mẹ hiện thẻ đỏ "Máy chưa bật chuông nhắc thuốc" kèm nút bật. Nhịp "còn sống" gửi kèm cờ này nên máy con có cảnh báo "Máy của bố đang tắt thông báo" (mỗi ngày một lần).
- **Lịch khám**: sửa, xóa (hỏi lại), chọn ngày bằng nút (14 ngày tới) và giờ hay khám, ô bệnh viện (chọn lại nơi đã khám), nút "🗺 Chỉ đường" mở Google Maps.
- **Thuốc theo đợt / cách ngày / theo thứ**: chọn "Dùng lâu dài" hoặc 5/7/10/14/30 ngày, hết đợt máy tự dừng nhắc và không báo "sắp hết thuốc". Có thuốc không uống hằng ngày thì máy bố mẹ đặt nhắc cho từng ngày (7 ngày tới, chạy nền đặt lại mỗi ngày).
- **Tóm tắt buổi tối cho con** lúc 20:00 (giờ nơi bố mẹ sống), không kêu: "Bố Hùng: thuốc 2/3 lần (chưa uống 19:00), báo ổn lúc 07:10, huyết áp 130/80". Tắt được trong Cài đặt. Máy con đọc dữ liệu mới nhất từ máy chủ trước khi tóm tắt.
- **Người nhận cảnh báo**: sửa, đổi thứ tự (↑ ↓), báo số điện thoại sai và không cho lưu.
- **Hướng dẫn "giữ app chạy"** hiện theo loại máy của bố mẹ (iPhone / Android), không theo máy của con.
- **Tin gửi mã kết nối** có 3 bước làm và link tải app (`EXPO_PUBLIC_DOWNLOAD_URL`; chưa có link thì ghi "người gửi sẽ gửi file cài", không bịa link).
- Cài đặt đổi chữ "không di chuyển" thành "Không nhận được tín hiệu từ máy bố mẹ" (app không đo việc đi lại).

Đã chạy: typecheck, lint, 93 kiểm thử app, `npm run e2e` 46/46, `test:rules` 20/20, `npm run e2e:sync` 19/19. **Cần điện thoại thật**: chuông nhắc đo huyết áp, tóm tắt 20:00 khi chạy nền (iPhone không đảm bảo giờ chạy nền), thẻ "chưa bật chuông" khi tắt thông báo.

## Bổ sung lần 7 (10/11/2026): gói an toàn khi dùng hằng ngày

Từ đợt rà toàn bộ app (chỗ có thể làm bố mẹ uống sai thuốc, hoặc cả nhà không biết khi có chuyện):

- **Không uống thuốc sớm**: còn hơn 60 phút tới giờ uống thì màn thuốc chỉ báo "CHƯA ĐẾN GIỜ · lần tới lúc 20:00", không có nút "Đã uống", không đọc "đến giờ uống thuốc". Trước đây mở app lúc 10h có thể bấm "Đã uống" cho thuốc 20h.
- **"Hết thuốc / không uống được"**: hỏi lý do (Hết thuốc / Không uống được / Bấm nhầm), báo ngay cho con. Hết thuốc thì số viên còn lại về 0. Máy con hiện cảnh báo "Bố không uống thuốc 07:00 · Hết thuốc: …" thay cho "trễ thuốc".
- **Bấm nhầm thì hoàn tác**: "Đã uống" và "ổn" có 6 giây "Bấm nhầm, hoàn tác" trước khi ghi. Bấm "ổn" nhiều lần trong 10 phút chỉ tính một lần.
- **Nửa viên**: chọn nhanh nửa viên, 1, 1 viên rưỡi, 2 viên, hoặc gõ số lẻ. App hiện và đọc "nửa viên", "1 viên rưỡi".
- **Nút "📞 Gọi con …"** trên trang chủ bố mẹ, tách khỏi SOS.
- **Con ghi hộ** "Bố đã uống rồi (con hỏi qua điện thoại)" ngay trên cảnh báo trễ thuốc.
- **Thử chuông**: "Thử chuông nhắc thuốc" ở bước cấp quyền của bố mẹ; "Thử chuông cảnh báo / SOS" ở bước tạo mã và trong Cài đặt của con. Chuông kêu sau 3 giây.
- **SOS**: ghi đúng "Đã mở số của Hà, nếu chưa nghe chuông bấm nút gọi màu xanh" và đọc to câu đó, vì trình gọi điện có thể chỉ hiện số. Vị trí lấy vị trí hiện tại (chờ tối đa 6 giây), lâu quá mới dùng vị trí cũ (chỉ nhận nếu dưới 30 phút).

Đã chạy: typecheck, lint, 84 kiểm thử app, `npm run e2e` 42/42 (có hoàn tác "ổn", "Đã ghi" khi uống thuốc, chặn uống sớm), `test:rules` 18/18, `npm run e2e:sync` 19/19. **Cần điện thoại thật**: thử chuông, đọc to khi SOS, vị trí.

## Bổ sung lần 6 (10/11/2026): thông báo hai chiều, cỡ chữ cho bố mẹ

Trang xem trước (duyệt trước khi làm): https://claude.ai/artifact/1KS8hCHJLUFoUfYMtNTPUm

- **Máy con xin quyền thông báo** ở bước tạo mã và trên trang chủ (thẻ vàng nếu chưa bật, nút "Mở Cài đặt" nếu đã chặn). Trước đây máy con không bao giờ xin quyền, nên không nhận được cảnh báo nào.
- **Ba mức thông báo**, mỗi mức một kênh Android (`src/domain/levels.ts`):

  | Mức | Dùng cho | Âm thanh | Rung |
  |---|---|---|---|
  | Khẩn cấp (kênh `sos`) | SOS | Âm riêng `assets/sounds/sos.wav`, dài | Rung dài 4 lần; xin vượt chế độ Không làm phiền (người dùng phải cho phép) |
  | Cần chú ý (`canh-bao`) | Trễ thuốc, không khỏe, huyết áp cao, mất tín hiệu, lời nhắn, lịch khám, con đã thấy SOS | Âm thường | Rung 2 lần |
  | Thông tin (`thong-tin`) | Pin yếu, đổi lịch thuốc / lịch khám | Không kêu | Không rung |

  iPhone: SOS dùng âm riêng nhưng **không kêu khi máy để im lặng** (cần Apple duyệt quyền Critical Alerts, chưa xin).
- **Màn hình SOS đỏ toàn trang trên máy con**: gọi bố mẹ, nút "Con đã thấy, đang xử lý", vị trí, gọi hàng xóm, 115.
- **"Con đã thấy"**: con bấm thì máy bố mẹ hiện thẻ xanh "Con Hà đã thấy SOS" (trên màn SOS và trang chủ) và nhận thông báo.
- **Nhắn bố mẹ**: 5 câu có sẵn theo cách xưng hô hoặc tự viết (tối đa 100 chữ). Máy bố mẹ hiện chữ thật to, tự đọc to, bấm "Đã xem"; máy con thấy "Bố đã xem lúc …".
- **Nhắc lịch khám cho bố mẹ**: 19:00 tối hôm trước và 2 tiếng trước giờ khám (thông báo trên máy, không cần mạng).
- **Con đổi lịch thuốc / lịch khám khi máy bố mẹ không mở app**: máy bố mẹ tự cập nhật giờ nhắc khi chạy nền (15–60 phút), báo nhẹ "Con vừa cập nhật lịch…". Cảnh báo trễ thuốc cũng dùng lịch mới.
- **Cỡ chữ máy bố mẹ**: nút "Aa Chữ to hơn" trên trang chủ, 4 mức (Lớn, Rất lớn, Cực lớn, Khổng lồ). Lưu theo từng bố/mẹ nên con chỉnh hộ được ở trang chi tiết của bố/mẹ. App vẫn theo cỡ chữ đã chỉnh trong cài đặt điện thoại.
- Chính sách quyền riêng tư lên phiên bản 2 (thêm lời nhắn và "đã thấy"): mở app sẽ hỏi đồng ý lại.

Đã chạy: typecheck, lint, 81 kiểm thử app, 5 logic máy chủ, `npm run e2e` 41/41, `test:rules` 17/17, `npm run e2e:sync` 19/19 (có thêm: con nhắn → bố đã xem; bố SOS → con "đã thấy" → máy bố thấy). **Chưa kiểm tra được** (cần điện thoại thật): âm SOS, rung, kênh thông báo, vượt chế độ im lặng, thông báo khi máy khóa.

## Bổ sung lần 5 (10/11/2026): mất tín hiệu, pin yếu, người nhà cùng theo dõi, bảo mật

- **Máy con tự báo khi máy bố mẹ mất tín hiệu** (quá số giờ con đặt, mặc định 3 giờ) **hoặc pin còn ≤ 15%**. Máy con chạy nền, đọc nhịp "còn sống" của máy bố mẹ và tự hiện thông báo, nên vẫn báo được khi máy bố mẹ đã tắt / hết pin. Miễn phí (không cần Cloud Functions). Bấm vào thông báo mở thẳng chi tiết cảnh báo.
- **Mời anh chị em cùng theo dõi:** màn hình đầu có lựa chọn "Người nhà mời tôi cùng theo dõi"; tab Gia đình có mục "Người cùng theo dõi" và nút gửi mã qua Zalo.
- **Bảo mật:** chỉ máy của con hoặc máy quản lý xóa được dữ liệu; vai trò của máy lấy theo yêu cầu vào gia đình đã được Đồng ý (máy bố mẹ không tự đổi thành máy con).
- **Thư viện:** cập nhật bản vá trong cùng phiên bản (Expo 57.0.32, Firebase 13.2.0); lỗ hổng đã biết 31 → 23 (còn lại cần lên phiên bản lớn hoặc nằm trong công cụ build).

Đã chạy: 71 kiểm thử app, 5 logic máy chủ, typecheck, lint, đóng gói Android/web, `npm run e2e` 38/38, `npm --prefix functions run test:rules` 16/16, `npm run e2e:sync` 17/17 (chạy lại trên emulator ngày 10/11/2026, đều đạt).

## Kiểm tra lần 4 (1/11/2026): hướng dẫn, cỡ chữ, bản cài, đồng bộ miễn phí

56 kiểm thử app + 5 logic máy chủ + 8 luật bảo mật đạt; typecheck, lint sạch; đóng gói Android / iOS / web không lỗi; thử sinh mã native Android (`expo prebuild`) thành công; `npm run e2e` 34/34; `npm run e2e:sync` 8/8 (chạy 3 lần liên tiếp).

Lỗi phát hiện khi chạy thử 2 máy và đã sửa:

| Lỗi | Ảnh hưởng | Đã sửa |
|---|---|---|
| App tắt / tải lại giữa lúc đang lưu → lần mở sau gửi lệnh xóa bố/mẹ, thuốc, nhật ký lên máy chủ | **Mất dữ liệu cả gia đình**, máy bố kẹt "Đang tải" (xảy ra ngẫu nhiên) | Chỉ xóa trên máy chủ thứ người dùng bấm xóa; có kiểm thử |
| Máy bố mở lại app ngay sau khi được đồng ý (dữ liệu chưa về) → về màn chọn vai trò; màn hình bố mẹ trắng khi chưa có dữ liệu | Tưởng chưa kết nối | Vào thẳng màn hình bố mẹ, hiện "Đang tải dữ liệu từ máy của con…" |
| Mã đã dùng vẫn hiện, không có nút tạo mã mới | Không thêm được máy thứ hai | Ẩn mã đã dùng / hết hạn, luôn có nút tạo mã |
| Dòng "Chưa có máy chủ đồng bộ" hiện cả khi đã kết nối; nút đổi vai trò / nạp dữ liệu mẫu hiện trên gia đình thật | Hiểu nhầm, dễ bấm nhầm làm rối dữ liệu | Chỉ hiện khi chưa kết nối |

## Sửa lỗi lần 3 (1/11/2026): trang dùng thử báo "not found" và lỗi điều hướng

Chạy thử lại theo **hành trình người dùng thật** (31 bước, mỗi bước kiểm tra màn hình đang hiện trước mắt), trên máy chủ thử giống Artifact (chỉ phục vụ 1 đường dẫn): **31/31 đạt**, không có lỗi trang.

| Lỗi | Ảnh hưởng | Đã sửa |
|---|---|---|
| Trang dùng thử đổi đường dẫn thật khi chuyển màn hình | Tải lại trang / có bản cập nhật → "not found" | Đường dẫn ảo trong bộ nhớ (`scripts/make-test-page.py`) |
| "Quay lại" ở màn hình con về Trang chủ thay vì màn trước | Lạc đường | Thanh tab quay lại theo lịch sử |
| Mở thẳng màn hình (từ thông báo, tải lại) bấm "Quay lại"/"Đã uống" không làm gì | Bố mẹ bị kẹt | Không có màn trước thì về trang chủ đúng vai trò |
| Màn "Hôm nay bố thấy thế nào?" và màn nhắc thuốc không có nút Quay lại | Bố mẹ không biết thoát | Thêm nút |
| Nút Quay lại chỉ là "‹" | Người lớn tuổi không hiểu | Thành "‹ Quay lại" |
| Đổi vai trò xong không về được màn hình con | Tưởng mất dữ liệu | Nút "Tiếp tục với gia đình đã có" |

Chạy thử tự động: `npm run e2e` (build bản web, tạo trang dùng thử, bấm qua 31 bước như người dùng; cần `npm i -D playwright && npx playwright install chromium` trên máy mới). Làm trang dùng thử: `npm run test-page` → `.e2e/artifact/an-tam.html`.

## Kiểm tra lần build này (1/11/2026, lần 2)

47 bài kiểm thử app + 5 logic máy chủ đạt; typecheck, lint sạch; đóng gói Android / iOS / web không lỗi; chạy thử 30 bước qua mọi màn hình (kể cả SOS, mua thêm thuốc, bảng 30 ngày), không có lỗi console.

Lỗi phát hiện thêm và đã sửa:
- **SOS có thể báo "Đã gửi"** khi tin nhắn mới chỉ được mở ra (cuộc gọi chen vào trước khi bấm Gửi).
- **Bấm thông báo nhắc thuốc chỉ mở trang đầu**, chưa có nút "Đã uống" trên thông báo; không nhắc lại khi bố mẹ chưa bấm.
- **Tỷ lệ uống thuốc 30 ngày ra 20%** vì tính cả những ngày app chưa dùng (thuốc nhập từ bản cũ): giờ chỉ tính từ ngày đầu có nhật ký → 90%.
- Tab Thuốc còn dòng cũ "Quét đơn thuốc bằng AI: sẽ có ở bản sau" dù đã có nút Quét đơn: đã bỏ.

Lưu ý: nút "Đã uống" trên thông báo, tự nhắc lại và tự đọc to chỉ chạy trên điện thoại thật (bản cài), không xem được trên trang dùng thử web. Logic đã có kiểm thử.

## Kiểm tra lần build trước (1/11/2026, lần 1)

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

**Nên làm thêm (chưa làm, cần Lan chốt):** chữ to hơn cho màn hình của con khi con cũng lớn tuổi (tùy chọn cỡ chữ); hướng dẫn lần đầu 3 bước cho bố mẹ.

## Máy chủ đồng bộ

Cấu trúc:

| File | Việc |
|---|---|
| `src/domain/syncdiff.ts` | Phần thuần: tính cần ghi gì lên máy chủ, gộp dữ liệu máy chủ về máy |
| `src/services/sync.ts` | Giao diện `FamilySync` |
| `src/services/firebaseSync.ts` | Cài `FamilySync` bằng Firebase (Auth ẩn danh, Firestore): đồng bộ, xin vào gia đình, đồng ý / từ chối |
| `src/services/push.ts`, `src/domain/pushRules.ts` | Máy bố mẹ tự gửi thông báo cho con qua Expo Push |
| `src/services/background.native.ts`, `src/services/checkAndAlert.ts`, `src/domain/background.ts` | Chạy nền trên máy bố mẹ: còn sống + pin, trễ thuốc, chưa điểm danh |
| `src/services/syncEngine.ts` | Nối kho dữ liệu của app với máy chủ |
| `src/services/memorySync.ts` | Máy chủ giả trong bộ nhớ, dùng cho kiểm thử |
| `firestore.rules` | Luật bảo mật: chỉ người trong gia đình đọc/ghi được; chỉ thêm được máy đã xin vào và được đồng ý |
| `functions/` | (Để dành, gói Blaze) Cloud Functions kiểm tra cảnh báo định kỳ |

Các bước chạy thật (gói miễn phí Spark):

1. Tạo dự án ở [Firebase console](https://console.firebase.google.com), giữ gói **Spark** (miễn phí, không cần thẻ).
2. Bật **Authentication › Sign-in method › Anonymous** và **Email/Password**, tạo **Firestore** (khu vực `asia-southeast1`).
3. Thêm **Web app**, chép cấu hình vào file `.env` (mẫu ở `.env.example`); khi build bằng EAS thì thêm các biến này bằng `eas env:create` (xem mục *Cài lên điện thoại thật*).
4. Đưa luật bảo mật lên:

   ```bash
   npx firebase-tools login
   ```

   ```bash
   npx firebase-tools use --add
   ```

   ```bash
   npx firebase-tools deploy --only firestore
   ```

5. Thông báo đẩy cho con: `npx eas-cli@latest init` (thêm mã dự án vào `app.json`), rồi dùng bản cài (không chạy trong Expo Go).

Cloud Functions trong `functions/` (gói Blaze) để dành cho khi cần cảnh báo đúng giờ hơn; luồng ghép máy hiện tại không cần chúng.

## Kiểm tra

```bash
npm test            # 66 bài kiểm thử: lịch thuốc, cảnh báo, xưng hô, mã kết nối, đồng bộ hai máy, đọc đơn thuốc, tóm tắt buổi khám, múi giờ
npm --prefix functions test         # 5 bài kiểm thử logic máy chủ
npm --prefix functions run test:rules   # 13 bài kiểm thử luật bảo mật (cần Java, chạy trên Firestore Emulator)
npm run e2e         # chạy thử 37 bước như người dùng trên trang giống Artifact
npm run e2e:sync    # chạy thử nhiều máy (con, bố, máy lạ, máy mới) 17 bước qua Firebase Emulator (chạy emulator auth,firestore trước)
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
