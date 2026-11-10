# Chính sách quyền riêng tư — An Tâm

Phiên bản 2, cập nhật 01/11/2026. **Bản nháp — cần luật sư xem lại trước khi phát hành** (thông tin sức khỏe là dữ liệu cá nhân nhạy cảm theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân).

## Tóm tắt

- An Tâm lưu thông tin sức khỏe của bố mẹ (thuốc, giờ uống, huyết áp, điểm danh, triệu chứng) và vị trí khi bấm SOS.
- Chỉ các máy trong gia đình mà bạn bấm "Đồng ý" mới xem được. Nhóm làm app không bán, không quảng cáo bằng dữ liệu này.
- Dữ liệu lưu trên điện thoại và trên máy chủ Google Firebase (khu vực Singapore) để các máy đồng bộ với nhau.
- Bạn có thể xóa toàn bộ dữ liệu gia đình bất cứ lúc nào trong Cài đặt.

## 1. Chúng tôi thu thập gì

- Tên, cách xưng hô, số điện thoại của bố mẹ và người nhận cảnh báo (do con nhập).
- Thuốc, giờ uống, việc đã uống / bỏ qua, số viên còn lại.
- Điểm danh mỗi ngày, mức khỏe và triệu chứng bố mẹ tự báo; số đo huyết áp, nhịp tim.
- Vị trí của bố mẹ, chỉ khi bố mẹ bấm SOS.
- Lời nhắn con gửi bố mẹ, lúc bố mẹ bấm "Đã xem", và tên người con bấm "Đã thấy" khi bố mẹ bấm SOS.
- Lịch khám, câu hỏi cho bác sĩ. Lời bác sĩ đã ghi chỉ giữ trên máy ghi, trừ khi bạn bấm chia sẻ với cả nhà.
- Mức pin và thời điểm máy bố mẹ còn hoạt động (để báo khi máy mất tín hiệu).
- Mã nhận thông báo của máy (để gửi cảnh báo), loại máy (Android / iPhone).
- Email, nếu bạn tự liên kết để khôi phục khi đổi máy.
- Số lần dùng từng tính năng: chỉ lưu trên máy, chỉ gửi đi khi bạn tự bấm "Gửi".

## 2. Dùng để làm gì

- Nhắc bố mẹ uống thuốc; báo cho con khi bố mẹ trễ thuốc, chưa điểm danh, huyết áp cao, báo không khỏe, bấm SOS hoặc máy mất tín hiệu.
- Hiển thị tình hình cho các máy trong gia đình; lập bảng tóm tắt để đưa bác sĩ xem khi bạn yêu cầu.
- Không dùng để quảng cáo, không bán, không đưa cho bên khác vì mục đích thương mại.

## 3. Lưu ở đâu, ai xem được

- Trên điện thoại của từng người trong gia đình.
- Trên máy chủ Google Firebase (Firestore, khu vực Singapore), dữ liệu được mã hóa khi truyền và khi lưu theo tiêu chuẩn của Google.
- Chỉ các máy đã được người trong gia đình bấm "Đồng ý" mới đọc được. Luật bảo mật trên máy chủ chặn mọi người khác.

## 4. Bên thứ ba liên quan

- Google Firebase: lưu trữ và đồng bộ dữ liệu.
- Expo (và Apple / Google): chuyển thông báo đẩy tới máy con; nội dung thông báo (vd "Bố chưa uống thuốc 12:00") đi qua các dịch vụ này.
- Bản chạy trên trình duyệt: nhận giọng nói dùng dịch vụ của trình duyệt (Chrome gửi âm thanh lên máy chủ của Google).
- Link vị trí SOS mở bằng Google Maps.

## 5. Lưu bao lâu

- Cho đến khi bạn xóa. App chỉ tải về máy dữ liệu 30 ngày gần nhất để máy nhẹ.
- Khi máy quản lý gia đình bấm "Xóa toàn bộ dữ liệu gia đình", dữ liệu trên máy chủ bị xóa và không khôi phục được.

## 6. Quyền của bạn

- Xem và sửa dữ liệu ngay trong app.
- Gỡ một máy khỏi gia đình (máy quản lý), hoặc tự rời khỏi gia đình.
- Xóa toàn bộ dữ liệu gia đình trên máy chủ, và xóa dữ liệu trên máy của mình.
- Rút lại đồng ý: xóa dữ liệu và gỡ app.
- Con là người cài đặt cho bố mẹ: hãy giải thích và hỏi ý kiến bố mẹ trước khi dùng.

## 7. Liên hệ

- Thắc mắc về dữ liệu: [email liên hệ của nhóm phát triển].

_File này được tạo tự động từ `src/domain/privacy.ts` (lệnh `npm run privacy-md`). Sửa nội dung ở đó, không sửa trực tiếp file này._
