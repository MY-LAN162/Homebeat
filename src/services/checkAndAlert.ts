// Máy bố mẹ: báo "còn sống" và tự báo cho con khi trễ thuốc / chưa điểm danh.
// Gọi khi chạy nền (background.native.ts) và 15 phút một lần khi đang mở app.
// Đọc dữ liệu đã lưu trên máy, nên chạy được cả khi app không mở.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { backgroundPushes } from '../domain/background';
import type { AppData } from '../domain/types';
import { BG_LAST_KEY, BG_SENT_KEY, DATA_KEY } from '../state/keys';
import { getFamilySync } from './firebaseSync';
import { sendPush } from './push';

let running = false;

/** Pin còn bao nhiêu % (để con biết khi máy bố mẹ mất tín hiệu có phải do hết pin). */
async function batteryPercent(): Promise<number | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : undefined;
  } catch {
    return undefined;
  }
}

export async function checkAndAlert(now = new Date()): Promise<void> {
  if (running) return;
  running = true;
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as AppData;
    if (data.role !== 'parent' || !data.currentMemberId || !data.familyId || data.demo) return;
    const sync = getFamilySync();
    if (!sync) return;
    await sync.signIn();
    await sync.heartbeat(data.familyId, data.currentMemberId, await batteryPercent()).catch(() => undefined);
    const sent = JSON.parse((await AsyncStorage.getItem(BG_SENT_KEY)) ?? '[]') as string[];
    const r = backgroundPushes(data, now, sent);
    if (r.pushes.length) {
      const tokens = await sync.childPushTokens(data.familyId);
      // Gửi được ít nhất một máy mới ghi là đã báo; mất mạng thì lần sau thử lại.
      let delivered = 0;
      for (const p of r.pushes) delivered += await sendPush(tokens, p);
      if (!delivered && tokens.length) return;
    }
    await AsyncStorage.setItem(BG_SENT_KEY, JSON.stringify(r.sent));
    await AsyncStorage.setItem(BG_LAST_KEY, now.toISOString());
  } finally {
    running = false;
  }
}
