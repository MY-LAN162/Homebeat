// Khóa app bằng vân tay / khuôn mặt / mã mở máy (của điện thoại).
import * as LocalAuthentication from 'expo-local-authentication';

/** Máy có hỗ trợ và đã cài vân tay / khuôn mặt / mã mở máy chưa. */
export async function canLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function unlock(): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Mở khóa An Tâm', cancelLabel: 'Hủy', disableDeviceFallback: false });
    return r.success;
  } catch {
    return false;
  }
}
