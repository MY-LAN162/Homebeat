// Gửi thông báo đẩy tới máy các con qua dịch vụ Expo Push (miễn phí), gửi thẳng từ điện thoại,
// không cần máy chủ riêng. Máy con cần có mã nhận thông báo (đã đăng ký khi mở app, xem store.tsx).
import type { PushMessage } from '../domain/pushRules';
import { levelOf, pushOptions } from '../domain/levels';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Gửi; trả về số máy gửi thành công. Không bao giờ ném lỗi (mất mạng thì trả 0). */
export async function sendPush(tokens: string[], msg: PushMessage): Promise<number> {
  return (await sendPushDetailed(tokens, msg)).sent;
}

/**
 * Như sendPush, kèm `reached`: đã tới được dịch vụ Expo hay chưa.
 * Chưa tới được (mất mạng, dịch vụ lỗi) thì nên gửi lại; tới rồi mà máy nhận báo lỗi (máy đã gỡ app...) thì thôi.
 */
export async function sendPushDetailed(tokens: string[], msg: PushMessage): Promise<{ sent: number; reached: boolean }> {
  const sent = await post(tokens, msg);
  return { sent: Math.max(0, sent), reached: sent >= 0 };
}

/** Số máy gửi thành công; -1 nếu chưa tới được dịch vụ. */
async function post(tokens: string[], msg: PushMessage): Promise<number> {
  if (!tokens.length) return 0;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => {
          const { level, ...rest } = msg;
          return { to, ...rest, ...pushOptions(level ?? levelOf(msg.data.kind as string)) };
        }),
      ),
    });
    if (!res.ok) return -1;
    const json = (await res.json()) as { data?: { status: string }[] };
    return (json.data ?? []).filter((t) => t.status === 'ok').length;
  } catch {
    return -1;
  }
}
