// Đường dẫn không có trong app (link cũ, link hỏng, trang dùng thử): quay về trang đầu.
import { Redirect } from 'expo-router';

export default function NotFound() {
  return <Redirect href="/" />;
}
