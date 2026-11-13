// Ba mức thông báo của An Tâm. Mỗi mức một kênh (Android) với âm thanh, rung riêng,
// để nghe tiếng là biết việc gấp hay không.
import type { AlertKind } from './alerts';

export type NotifyLevel = 'urgent' | 'warn' | 'info';

/** Kênh thông báo Android theo mức (tên kênh phải trùng chỗ tạo kênh trong services/notifications.ts). */
export const LEVEL_CHANNEL: Record<NotifyLevel, string> = { urgent: 'sos', warn: 'canh-bao', info: 'thong-tin' };

/** Âm báo SOS riêng (assets/sounds/sos.wav, khai báo trong plugin expo-notifications ở app.json). */
export const SOS_SOUND = 'sos.wav';

/** Mức của từng loại cảnh báo / thông báo. */
export function levelOf(kind: AlertKind | string | undefined): NotifyLevel {
  if (kind === 'sos') return 'urgent';
  if (kind === 'low-battery' || kind === 'low-stock' || kind === 'tired' || kind === 'schedule' || kind === 'summary') return 'info';
  return 'warn';
}

/** Phần gửi kèm cho dịch vụ Expo Push theo mức: kênh, âm thanh, độ ưu tiên. */
// iPhone: SOS là "time-sensitive" để vẫn hiện khi đang bật chế độ Tập trung / Không làm phiền
// (cần quyền com.apple.developer.usernotifications.time-sensitive trong app.json).
export function pushOptions(level: NotifyLevel): {
  channelId: string;
  sound: string | null;
  priority: 'high' | 'normal';
  interruptionLevel?: 'passive' | 'time-sensitive';
} {
  if (level === 'urgent') return { channelId: LEVEL_CHANNEL.urgent, sound: SOS_SOUND, priority: 'high', interruptionLevel: 'time-sensitive' };
  if (level === 'warn') return { channelId: LEVEL_CHANNEL.warn, sound: 'default', priority: 'high' };
  return { channelId: LEVEL_CHANNEL.info, sound: null, priority: 'normal', interruptionLevel: 'passive' };
}
