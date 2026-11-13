// Đọc chữ trên ảnh đơn thuốc. Bản web chưa đọc được (chỉ dùng đơn mẫu hoặc gõ / dán chữ);
// bản cài trên điện thoại dùng src/services/ocr.native.ts.
export function canReadText(): boolean {
  return false;
}

export async function readTextFromImage(_uri: string): Promise<string[]> {
  throw new Error('Bản web chưa đọc chữ trên ảnh được');
}
