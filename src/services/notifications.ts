// Nhắc uống thuốc bằng thông báo cục bộ trên máy của bố mẹ (không cần internet).
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { medPrompt } from '../domain/address';
import { LEVEL_CHANNEL, levelOf, SOS_SOUND, type NotifyLevel } from '../domain/levels';
import { followUps, visitReminders } from '../domain/reminders';
import { slotsForDay } from '../domain/schedule';
import type { AppData } from '../domain/types';
import { toMinutes } from '../domain/time';

const CHANNEL = 'thuoc';
const supported = Platform.OS !== 'web';
/** Nhóm thông báo nhắc thuốc, có nút "Đã uống" ngay trên thông báo. */
export const DOSE_CATEGORY = 'nhac-thuoc';
export const TAKEN_ACTION = 'da-uong';

export function setupNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    // Đang mở app: mức "Thông tin" chỉ nằm trong danh sách, không bật lên, không kêu.
    handleNotification: async (n) => {
      const quiet = levelOf((n.request.content.data as { kind?: string } | undefined)?.kind) === 'info';
      return { shouldShowBanner: !quiet, shouldShowList: true, shouldPlaySound: !quiet, shouldSetBadge: false };
    },
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
    // Ba mức cảnh báo (xem domain/levels.ts). Kênh Android đã tạo thì không đổi được âm/rung nữa,
    // nên mỗi mức một kênh riêng; người dùng tự chỉnh thêm trong Cài đặt điện thoại được.
    Notifications.setNotificationChannelAsync(LEVEL_CHANNEL.urgent, {
      name: 'SOS khẩn cấp',
      description: 'Bố mẹ bấm SOS. Âm báo riêng, rung dài.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 400, 1000, 400, 1000, 400, 1000],
      sound: SOS_SOUND,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => undefined);
    Notifications.setNotificationChannelAsync(LEVEL_CHANNEL.warn, {
      name: 'Cảnh báo cần chú ý',
      description: 'Trễ thuốc, không khỏe, huyết áp cao, mất tín hiệu, lời nhắn, lịch khám.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    }).catch(() => undefined);
    Notifications.setNotificationChannelAsync(LEVEL_CHANNEL.info, {
      name: 'Thông tin',
      description: 'Pin yếu, sắp hết thuốc, đổi lịch thuốc. Không kêu, không rung.',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
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
    content: { title, body, data, sound: soundOf(levelOf(data.kind)) },
    trigger: Platform.OS === 'android' ? { channelId: LEVEL_CHANNEL[levelOf(data.kind)] } : null,
  });
}

export async function askPermission(): Promise<boolean> {
  if (!supported) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Báo nhẹ cho bố mẹ (vd con vừa đổi lịch thuốc): mức Thông tin, không kêu. */
export async function showNotice(title: string, body: string): Promise<void> {
  if (!supported || !(await hasPermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind: 'schedule' } },
    trigger: Platform.OS === 'android' ? { channelId: LEVEL_CHANNEL.info } : null,
  });
}

/** Máy này có thông báo không (bản trình duyệt thì không). */
const soundOf = (l: NotifyLevel) => (l === 'urgent' ? SOS_SOUND : l === 'warn' ? 'default' : undefined);

export const notificationsSupported = supported;

/** Tình trạng quyền thông báo: 'granted' đã cho; 'ask' còn hỏi được; 'blocked' đã chặn, phải vào Cài đặt mở lại. */
export async function permissionState(): Promise<'granted' | 'ask' | 'blocked'> {
  if (!supported) return 'blocked';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'ask' : 'blocked';
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
  for (const v of visitReminders(data, member.id, now)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: v.title, body: v.body, data: { kind: 'visit', memberId: member.id }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: v.at, channelId: LEVEL_CHANNEL.warn },
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
