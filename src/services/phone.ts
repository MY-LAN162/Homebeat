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
    const last = await Location.getLastKnownPositionAsync();
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return undefined;
  }
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Mở tin nhắn SMS soạn sẵn tới những người nhận cảnh báo. */
export async function smsCaregivers(caregivers: Caregiver[], message: string): Promise<boolean> {
  const to = caregivers.map((c) => c.phone).filter(Boolean);
  if (!to.length || Platform.OS === 'web') return false;
  if (!(await SMS.isAvailableAsync())) return false;
  await SMS.sendSMSAsync(to, message);
  return true;
}
