// Hộp thư chờ: thông báo đẩy (SOS, không khỏe, huyết áp cao...) chưa gửi được vì mất mạng thì giữ lại để gửi sau.
// Hàm thuần, phần lưu / gửi ở services/outbox.ts.
import type { PushMessage } from './pushRules';

export interface OutboxItem {
  id: string;
  familyId: string;
  /** Gửi cho các máy con, hoặc cho máy của một bố/mẹ. */
  to: 'children' | { memberId: string };
  msg: PushMessage;
  /** Lúc việc xảy ra (ISO). */
  at: string;
  tries: number;
}

/** Quá lâu thì thôi gửi (tin cũ dễ gây hiểu nhầm). SOS giữ lâu hơn. */
export function maxAgeMinutes(msg: PushMessage): number {
  return msg.data.kind === 'sos' ? 12 * 60 : 6 * 60;
}

/** Bỏ tin quá cũ, giữ tối đa 30 tin. */
export function pruneOutbox(items: OutboxItem[], now: Date): OutboxItem[] {
  return items.filter((i) => (now.getTime() - new Date(i.at).getTime()) / 60000 <= maxAgeMinutes(i.msg)).slice(-30);
}

/** Tin gửi trễ: ghi rõ giờ xảy ra để người nhận không tưởng là vừa mới. */
export function lateCopy(item: OutboxItem, now: Date): PushMessage {
  const mins = (now.getTime() - new Date(item.at).getTime()) / 60000;
  if (mins < 3) return item.msg;
  const t = new Date(item.at).toTimeString().slice(0, 5);
  return { ...item.msg, body: `${item.msg.body} (Xảy ra lúc ${t}, gửi trễ vì máy mất mạng.)` };
}
