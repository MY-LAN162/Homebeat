// Múi giờ: tính giờ theo nơi bố mẹ sống, kể cả khi điện thoại của con ở nước khác.

export const TIME_ZONES: { id: string; label: string }[] = [
  { id: 'Asia/Ho_Chi_Minh', label: 'Việt Nam' },
  { id: 'Asia/Bangkok', label: 'Thái Lan, Campuchia, Lào' },
  { id: 'Asia/Singapore', label: 'Singapore, Malaysia' },
  { id: 'Asia/Taipei', label: 'Đài Loan' },
  { id: 'Asia/Seoul', label: 'Hàn Quốc' },
  { id: 'Asia/Tokyo', label: 'Nhật Bản' },
  { id: 'Australia/Sydney', label: 'Úc (Sydney, Melbourne)' },
  { id: 'Europe/Berlin', label: 'Đức, Pháp, Séc, Ba Lan' },
  { id: 'Europe/London', label: 'Anh' },
  { id: 'America/New_York', label: 'Mỹ (bờ Đông)' },
  { id: 'America/Los_Angeles', label: 'Mỹ (California, bờ Tây)' },
  { id: 'America/Toronto', label: 'Canada (Toronto)' },
];

/**
 * Ngày giờ "như đồng hồ treo tường" ở múi giờ `tz`: các hàm getHours(), getDate()... của kết quả
 * trả về giờ ở nơi đó. Chỉ dùng để so giờ / ngày, không dùng để tính khoảng thời gian thật.
 */
export function toZone(d: Date, tz?: string): Date {
  if (!tz) return d;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  } catch {
    return d;
  }
}

/** Múi giờ của điện thoại này, vd "Asia/Ho_Chi_Minh". */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** "GMT+7" */
export function offsetLabel(tz: string, at: Date = new Date()): string {
  const diff = Math.round((toZone(at, tz).getTime() - toZone(at, 'UTC').getTime()) / 60000);
  const h = Math.trunc(diff / 60);
  const m = Math.abs(diff % 60);
  return `GMT${diff >= 0 ? '+' : '-'}${Math.abs(h)}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function zoneLabel(tz?: string): string {
  if (!tz) return 'Theo giờ điện thoại';
  const z = TIME_ZONES.find((x) => x.id === tz);
  return `${z?.label ?? tz} (${offsetLabel(tz)})`;
}
