// Khi nào máy bố mẹ tự gửi thông báo đẩy cho các con, và nội dung gửi. Không cần máy chủ riêng.
import { displayName } from './address';
import { isBpHigh } from './alerts';
import type { NotifyLevel } from './levels';
import type { AlertSettings, Member, Mood } from './types';

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Mức thông báo. Trống thì tính theo data.kind (xem levels.ts). */
  level?: NotifyLevel;
}

export function sosPush(m: Member, at: Date, loc?: { lat: number; lng: number }): PushMessage {
  const t = at.toTimeString().slice(0, 5);
  const where = loc ? ` Vị trí: https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}` : '';
  return {
    title: `🆘 ${displayName(m)} bấm SOS`,
    body: `Lúc ${t}. Gọi ngay cho ${m.call.toLowerCase()}.${where}`,
    data: { kind: 'sos', memberId: m.id },
    level: 'urgent',
  };
}

/** Máy bố mẹ: con đã thấy SOS. */
export function sosAckPush(m: Member, by: string): PushMessage {
  return {
    title: `${m.self} ${by} đã thấy`,
    body: `${m.self} đang gọi cho ${m.call.toLowerCase()}. ${m.call} giữ máy bên cạnh nhé.`,
    data: { kind: 'sos-ack', memberId: m.id },
    level: 'warn',
  };
}

/** Máy bố mẹ: lời nhắn của con. */
export function messagePush(m: Member, from: string, text: string): PushMessage {
  return {
    title: `${m.self} ${from} nhắn ${m.call.toLowerCase()}`,
    body: `“${text}”`,
    data: { kind: 'message', memberId: m.id },
    level: 'warn',
  };
}

/** Bố mẹ bấm "Hết thuốc / không uống được": báo con ngay. */
export function skipPush(m: Member, time: string, reason: 'out' | 'unable', medNames: string[]): PushMessage {
  return {
    title: `${displayName(m)} không uống thuốc ${time}`,
    body: reason === 'out' ? `Hết thuốc: ${medNames.join(', ')}. Cần mua thêm.` : `${m.call} báo không uống được. Nên gọi hỏi thăm.`,
    data: { kind: 'skipped-dose', memberId: m.id },
    level: 'warn',
  };
}

/** Chỉ báo khi "không khỏe" (mức cần chú ý); "hơi mệt" chỉ hiện trong app. */
export function checkinPush(m: Member, mood: Mood, symptoms: string[]): PushMessage | undefined {
  if (mood !== 'unwell') return undefined;
  return {
    title: `${displayName(m)} báo "không khỏe"`,
    body: symptoms.length ? `Triệu chứng: ${symptoms.join(', ')}. Nên gọi hỏi thăm.` : 'Nên gọi hỏi thăm.',
    data: { kind: 'unwell', memberId: m.id },
  };
}

export function bpPush(m: Member, sys: number, dia: number, s: Pick<AlertSettings, 'bpSys' | 'bpDia'>): PushMessage | undefined {
  if (!isBpHigh(sys, dia, s)) return undefined;
  return {
    title: `Huyết áp ${displayName(m)}: ${sys}/${dia}`,
    body: `Từ mức ${s.bpSys}/${s.bpDia} đã đặt trở lên. Nên gọi hỏi thăm.`,
    data: { kind: 'bp-high', memberId: m.id },
  };
}
