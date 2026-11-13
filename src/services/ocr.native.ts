// Đọc chữ trên ảnh đơn thuốc ngay trên điện thoại, miễn phí, không gửi ảnh đi đâu:
// Android dùng Google ML Kit (có sẵn trong Google Play services), iPhone dùng Apple Vision.
// Cần bản cài (development build / APK), không chạy trong Expo Go.
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

export function canReadText(): boolean {
  try {
    return isSupported;
  } catch {
    return false;
  }
}

/** Trả về các khối chữ theo thứ tự trên ảnh. */
export async function readTextFromImage(uri: string): Promise<string[]> {
  return extractTextFromImage(uri);
}
