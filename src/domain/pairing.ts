// Mã kết nối 6 số để ghép máy của bố mẹ với gia đình.
import type { Pairing } from './types';

export const PAIRING_HOURS = 24;

export function generateCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += Math.floor(random() * 10).toString();
  return code;
}

export function createPairing(memberId: string, now: Date, random?: () => number): Pairing {
  return {
    code: generateCode(random),
    memberId,
    expiresAt: new Date(now.getTime() + PAIRING_HOURS * 3600_000).toISOString(),
  };
}

/** "482913" -> "482 913" */
export function formatCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export type PairResult =
  | { ok: true; memberId: string }
  /** too-many: nhập sai quá nhiều lần; network: không gọi được máy chủ. */
  | { ok: false; reason: 'format' | 'wrong' | 'expired' | 'too-many' | 'network' };

export function checkCode(input: string, pairing: Pairing | undefined, now: Date): PairResult {
  const code = input.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'format' };
  if (!pairing || pairing.code !== code) return { ok: false, reason: 'wrong' };
  if (now.getTime() > new Date(pairing.expiresAt).getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, memberId: pairing.memberId };
}
