// Gửi thông báo đẩy qua dịch vụ Expo Push (máy con dùng Expo push token).
// https://docs.expo.dev/push-notifications/sending-notifications/
import { levelOf, pushOptions } from '../../src/domain/levels';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Gửi cho các mã nhận; trả về những mã đã hỏng (máy gỡ app) để xóa. */
export async function sendPush(tokens: string[], msg: PushMessage): Promise<string[]> {
  if (!tokens.length) return [];
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(
      tokens.map((to) => ({ to, ...msg, ...pushOptions(levelOf(msg.data?.kind as string | undefined)) })),
    ),
  });
  if (!res.ok) throw new Error(`Expo push lỗi ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
  return (json.data ?? [])
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? tokens[i] : undefined))
    .filter((t): t is string => !!t);
}
