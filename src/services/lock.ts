// Bản web: không có khóa vân tay (xem lock.native.ts).
export async function canLock(): Promise<boolean> {
  return false;
}
export async function unlock(): Promise<boolean> {
  return true;
}
