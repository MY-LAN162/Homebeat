// Nhắc uống thuốc bằng thông báo cục bộ trên máy của bố mẹ (không cần internet).
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { medPrompt } from '../domain/address';
import { followUps } from '../domain/reminders';
import { slotsForDay } from '../domain/schedule';
import type { AppData } from '../domain/types';
import { toMinutes } from '../domain/time';

const CHANNEL = 'thuoc';
/** Kênh cho cảnh báo máy chủ gửi về máy con (phải trùng channelId trong functions/src/push.ts). */
export const ALERT_CHANNEL = 'canh-bao';
const supported = Platform.OS !== 'web';
/** Nhóm thông báo nhắc thuốc, có nút "Đã uống" ngay trên thông báo. */
export const DOSE_CATEGORY = 'nhac-thuoc';
export const TAKEN_ACTION = 'da-uong';

export function setupNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  // Nút "Đã uống" trên thông báo: bấm là mở app và ghi nhận luôn (mở app để chắc chắn ghi được,
  // kể cả khi app đã bị tắt hẳn).
  Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    { identifier: TAKEN_ACTION, buttonTitle: 'Đã uống', options: { opensAppToForeground: true } },
  ]).catch(() => undefined);
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Nhắc uống thuốc',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    }).catch(() => undefined);
    Notifications.setNotificationChannelAsync(ALERT_CHANNEL, {
      name: 'Cảnh báo về bố mẹ',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 600, 200, 600],
      sound: 'default',
    }).catch(() => undefined);
  }
}

/**
 * Mã nhận thông báo đẩy của máy này (Expo push token), để máy chủ gửi cảnh báo cho con.
 * Cần mã dự án EAS (app.json › extra.eas.projectId) và đã cho phép thông báo. Thiếu thì trả undefined.
 */
export async function getPushToken(): Promise<string | undefined> {
  if (!supported) return undefined;
  if (!(await hasPermission())) return undefined;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return undefined;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Hiện ngay một cảnh báo trên máy này (máy con tự báo mất tín hiệu, pin yếu; không cần internet để hiện). */
export async function showAlertNow(title: string, body: string, data: Record<string, string>): Promise<void> {
  if (!supported || !(await hasPermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: ALERT_CHANNEL } : null,
  });
}

export async function askPermission(): Promise<boolean> {
  if (!supported) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Đặt lại toàn bộ lịch nhắc cho người đang dùng máy này:
 *  - nhắc hằng ngày đúng giờ uống;
 *  - nhắc lại 2 lần nếu chưa bấm "Đã uống" (trước khi báo cho con), cho hôm nay và ngày mai.
 * Gọi lại mỗi khi mở app, đổi lịch thuốc hoặc bấm "Đã uống", nên lần đã uống không bị nhắc lại.
 */
export async function rescheduleMedReminders(data: AppData): Promise<number> {
  if (!supported || data.role !== 'parent' || !data.currentMemberId) return 0;
  const member = data.members.find((m) => m.id === data.currentMemberId);
  if (!member) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  const slots = slotsForDay(data.medications, [], member.id, now, now, data.settings.lateMinutes);
  for (const slot of slots) {
    const mins = toMinutes(slot.time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: medPrompt(member),
        body: `${slot.time} · ${slot.meds.map((m) => m.name).join(', ')} · ${slot.pills} viên`,
        data: { kind: 'dose', time: slot.time },
        categoryIdentifier: DOSE_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        channelId: CHANNEL,
      },
    });
  }
  for (const f of followUps(data, member.id, now)) {
    const slot = slotsForDay(data.medications, data.doseLogs, member.id, f.at, now, data.settings.lateMinutes).find((s) => s.time === f.time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Nhắc lại: ${medPrompt(member)}`,
        body: `Thuốc ${f.time}${slot ? ` · ${slot.pills} viên` : ''}. Uống xong ${member.call.toLowerCase()} bấm "Đã uống" nhé.`,
        data: { kind: 'dose', time: f.time, date: f.date, followUp: f.n },
        categoryIdentifier: DOSE_CATEGORY,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: f.at, channelId: CHANNEL },
    });
  }
  return slots.length;
}

/** "Nhắc lại sau 15 phút" */
export async function snooze(title: string, body: string, time?: string, minutes = 15) {
  if (!supported) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind: 'dose', time, snooze: true }, categoryIdentifier: DOSE_CATEGORY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: CHANNEL,
    },
  });
}
