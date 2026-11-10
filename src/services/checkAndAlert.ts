// Máy bố mẹ: báo "còn sống" và tự báo cho con khi trễ thuốc / chưa điểm danh.
// Máy con: tự kiểm tra nhịp "còn sống" của máy bố mẹ, báo khi mất tín hiệu hoặc pin yếu
// (vẫn báo được khi máy bố mẹ đã tắt, hết pin, mất mạng — lúc đó máy bố mẹ không tự báo được).
// Gọi khi chạy nền (background.native.ts) và 15 phút một lần khi đang mở app.
// Đọc dữ liệu đã lưu trên máy, nên chạy được cả khi app không mở.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { backgroundPushes, childSignalAlerts, scheduleKey, scheduleNotice, withSchedule } from '../domain/background';
import type { AppData } from '../domain/types';
import { BG_LAST_KEY, BG_SCHED_KEY, BG_SENT_KEY, BG_SIGNAL_KEY, DATA_KEY } from '../state/keys';
import { getFamilySync } from './firebaseSync';
import { rescheduleMedReminders, showAlertNow, showNotice } from './notifications';
import { sendPush } from './push';
import { readSecure } from './vault';

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
    const raw = await readSecure(DATA_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as AppData;
    if (data.role === 'child' && data.familyId && !data.demo) {
      await checkSignals(data, now);
      return;
    }
    if (data.role !== 'parent' || !data.currentMemberId || !data.familyId || data.demo) return;
    const sync = getFamilySync();
    if (!sync) return;
    await sync.signIn();
    await sync.heartbeat(data.familyId, data.currentMemberId, await batteryPercent()).catch(() => undefined);
    // Con đổi lịch thuốc khi máy bố mẹ không mở app: đọc lịch mới, đặt lại giờ nhắc, báo nhẹ cho bố mẹ.
    const remote = await sync.readSchedule(data.familyId).catch(() => undefined);
    const fresh = remote ? withSchedule(data, remote) : data;
    if (remote) await updateReminders(fresh);
    const sent = JSON.parse((await AsyncStorage.getItem(BG_SENT_KEY)) ?? '[]') as string[];
    const r = backgroundPushes(fresh, now, sent);
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

/** Máy con: đọc nhịp "còn sống" mới nhất, tự hiện thông báo mất tín hiệu / pin yếu trên máy mình. */
async function checkSignals(data: AppData, now: Date): Promise<void> {
  const sync = getFamilySync();
  if (!sync || !data.familyId) return;
  await sync.signIn();
  const heartbeats = await sync.readHeartbeats(data.familyId);
  const sent = JSON.parse((await AsyncStorage.getItem(BG_SIGNAL_KEY)) ?? '[]') as string[];
  const r = childSignalAlerts(data, heartbeats, now, sent);
  for (const a of r.alerts) await showAlertNow(a.title, a.body, a.data);
  await AsyncStorage.setItem(BG_SIGNAL_KEY, JSON.stringify(r.sent));
  await AsyncStorage.setItem(BG_LAST_KEY, now.toISOString());
}

/**
 * Đặt lại giờ nhắc khi lịch thuốc khác lần trước. Gọi cả khi mở app (store) và khi chạy nền.
 * `notice`: báo cho bố mẹ biết lịch vừa đổi (chạy nền: con đổi lịch lúc bố mẹ không mở app).
 */
export async function updateReminders(data: AppData, notice = true): Promise<void> {
  const key = scheduleKey(data);
  const old = await AsyncStorage.getItem(BG_SCHED_KEY);
  if (old === key) return;
  await rescheduleMedReminders(data);
  await AsyncStorage.setItem(BG_SCHED_KEY, key);
  const n = scheduleNotice(data);
  if (notice && old !== null && n) await showNotice(n.title, n.body);
}
