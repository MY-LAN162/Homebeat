// Bản web: không có chạy nền (trang web không chạy khi đã đóng). Xem background.native.ts.
export const BACKGROUND_TASK = 'an-tam-chay-nen';

export async function setBackgroundEnabled(_on: boolean): Promise<boolean> {
  return false;
}
