import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Platform } from 'react-native';
import type { Caregiver } from '../domain/types';

/** Mở trình gọi điện. Trả về false nếu không có số. */
export async function call(phone?: string): Promise<boolean> {
  const p = phone?.replace(/[^\d+]/g, '');
  if (!p) return false;
  await Linking.openURL(`tel:${p}`);
  return true;
}

export async function getLocation(): Promise<{ lat: number; lng: number } | undefined> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return undefined;
    // Ưu tiên vị trí hiện tại (chờ tối đa 6 giây); lâu quá mới dùng vị trí cũ nhất máy còn nhớ (chỉ nhận nếu < 30 phút).
    const now = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    const pos = now ?? (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 }));
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined;
  } catch {
    return undefined;
  }
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Mở tin nhắn SMS soạn sẵn tới những người nhận cảnh báo.
 * - 'sent': chắc chắn đã gửi (chỉ iPhone báo được);
 * - 'opened': đã mở tin nhắn nhưng không biết đã bấm Gửi chưa (Android luôn như vậy);
 * - 'cancelled': người dùng bỏ không gửi;
 * - 'unavailable': không có số hoặc máy không gửi được tin nhắn.
 */
export async function smsCaregivers(caregivers: Caregiver[], message: string): Promise<'sent' | 'opened' | 'cancelled' | 'unavailable'> {
  const to = caregivers.map((c) => c.phone).filter(Boolean);
  if (!to.length || Platform.OS === 'web') return 'unavailable';
  if (!(await SMS.isAvailableAsync())) return 'unavailable';
  const { result } = await SMS.sendSMSAsync(to, message);
  return result === 'sent' ? 'sent' : result === 'cancelled' ? 'cancelled' : 'opened';
}
