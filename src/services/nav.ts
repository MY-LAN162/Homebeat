// "Quay lại" an toàn: có màn hình trước thì về đó; không có (mở thẳng từ thông báo, link, tải lại trang)
// thì về trang chủ đúng vai trò, để nút bấm không bao giờ "không làm gì".
import { router, type Href } from 'expo-router';

export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
