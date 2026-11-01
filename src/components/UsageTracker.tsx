// Đếm số lần mở từng màn hình (chỉ lưu trên máy, xem src/services/usage.ts).
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { track } from '../services/usage';

export function UsageTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path) track(`screen:${path.replace(/\/member\/[^/]+$/, '/member')}`);
  }, [path]);
  return null;
}
