// Máy bố mẹ: báo "còn sống" và tự báo cho con khi trễ thuốc / chưa điểm danh.
// Máy con: tự kiểm tra nhịp "còn sống" của máy bố mẹ, báo khi mất tín hiệu hoặc pin yếu
// (vẫn báo được khi máy bố mẹ đã tắt, hết pin, mất mạng — lúc đó máy bố mẹ không tự báo được).
// Gọi khi chạy nền (background.native.ts) và 15 phút một lần khi đang mở app.
// Đọc dữ liệu đã lưu trên máy, nên chạy được cả khi app không mở.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { backgroundPushes, childMissedAlerts, childSignalAlerts, eveningSummary, scheduleKey, scheduleNotice, SUMMARY_AT, withSchedule } from '../domain/background';
import { mergeRemote } from '../domain/syncdiff';
import { dateKey, minutesOfDay, toMinutes } from '../domain/time';
import { toZone } from '../domain/tz';
import { emptyData, type AppData } from '../domain/types';
import { BG_LAST_KEY, BG_SCHED_KEY, BG_SENT_KEY, BG_SIGNAL_KEY, BG_SUMMARY_KEY, DATA_KEY } from '../state/keys';
import { getFamilySync } from './firebaseSync';
import { hasPermission, rescheduleMedReminders, showAlertNow, showNotice } from './notifications';
import { flushOutbox } from './outbox';
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
    const data: AppData = { ...emptyData(), ...(JSON.parse(raw) as AppData) };
    // Thông báo đẩy chưa gửi được lúc mất mạng (SOS...): gửi lại trước tiên.
    const s0 = getFamilySync();
    if (s0 && data.familyId && !data.demo) await flushOutbox(s0, now).catch(() => undefined);
    if (data.role === 'child' && data.familyId && !data.demo) {
      await checkSignals(data, now);
      return;
    }
    if (data.role !== 'parent' || !data.currentMemberId || !data.familyId || data.demo) return;
    const sync = getFamilySync();
    if (!sync) return;
    await sync.signIn();
    const notifOff = Platform.OS === 'web' ? undefined : !(await hasPermission().catch(() => true));
    await sync.heartbeat(data.familyId, data.currentMemberId, await batteryPercent(), notifOff).catch(() => undefined);
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
  // Trễ thuốc / chưa điểm danh mà máy bố mẹ không báo được: máy con tự báo (đọc dữ liệu mới nhất từ máy chủ).
  let fresh = data;
  const remote = await sync.readSchedule(data.familyId).catch(() => undefined);
  if (remote) fresh = { ...fresh, medications: remote.medications, appointments: remote.appointments ?? fresh.appointments, settings: remote.settings ?? fresh.settings };
  const events = await sync.readEvents(data.familyId, new Date(now.getTime() - 30 * 3600_000).toISOString()).catch(() => undefined);
  if (events) fresh = mergeRemote(fresh, events);
  const b = childMissedAlerts(fresh, now, r.sent);
  for (const a of b.alerts) await showAlertNow(a.title, a.body, a.data);
  await AsyncStorage.setItem(BG_SIGNAL_KEY, JSON.stringify(b.sent));
  await maybeEveningSummary(data, now).catch(() => undefined);
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
  const n = scheduleNotice(data, old ?? undefined);
  if (notice && old !== null && n) await showNotice(n.title, n.body);
}

/** Máy con: sau 20:00 (giờ nơi bố mẹ sống), mỗi ngày một lần, hiện tóm tắt ngày của bố mẹ (im lặng). */
async function maybeEveningSummary(data: AppData, now: Date): Promise<void> {
  if (data.eveningSummary === false || !data.familyId) return;
  const local = toZone(now, data.settings.timeZone);
  if (minutesOfDay(local) < toMinutes(SUMMARY_AT)) return;
  const today = dateKey(local);
  if ((await AsyncStorage.getItem(BG_SUMMARY_KEY)) === today) return;
  const sync = getFamilySync();
  if (!sync) return;
  // Dữ liệu trên máy có thể cũ (con chưa mở app): đọc sự kiện 30 giờ qua từ máy chủ.
  const fresh = await sync.readEvents(data.familyId, new Date(now.getTime() - 30 * 3600_000).toISOString()).catch(() => undefined);
  const merged = fresh ? mergeRemote(data, fresh) : data;
  const s = eveningSummary(merged, now);
  if (s) await showAlertNow(s.title, s.body, { kind: 'summary', memberId: data.members[0]?.id ?? '' });
  await AsyncStorage.setItem(BG_SUMMARY_KEY, today);
}
