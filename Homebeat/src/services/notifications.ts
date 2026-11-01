// Nhắc uống thuốc bằng thông báo cục bộ trên máy của bố mẹ (không cần internet).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { medPrompt } from '../domain/address';
import { slotsForDay } from '../domain/schedule';
import type { AppData } from '../domain/types';
import { toMinutes } from '../domain/time';

const CHANNEL = 'thuoc';
const supported = Platform.OS !== 'web';

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
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Nhắc uống thuốc',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    }).catch(() => undefined);
  }
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

/** Đặt lại toàn bộ lịch nhắc hằng ngày cho người đang dùng máy này. */
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
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        channelId: CHANNEL,
      },
    });
  }
  return slots.length;
}

/** "Nhắc lại sau 15 phút" */
export async function snooze(title: string, body: string, minutes = 15) {
  if (!supported) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind: 'snooze' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: CHANNEL,
    },
  });
}
