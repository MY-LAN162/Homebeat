// Quy tắc cảnh báo cho con. Chỉ dựa trên dữ liệu đã có, không suy đoán bệnh.
import { displayName } from './address';
import { daysOfStock, slotsForDay } from './schedule';
import type { AppData, Member } from './types';
import { atTime, dateKey, formatDuration, inWindow } from './time';

export type AlertLevel = 'urgent' | 'warn' | 'info';

export type AlertKind = 'sos' | 'late-dose' | 'no-checkin' | 'unwell' | 'bp-high' | 'low-stock' | 'no-signal';

export interface FamilyAlert {
  memberId: string;
  level: AlertLevel;
  kind: AlertKind;
  title: string;
  detail?: string;
}

const LEVEL_ORDER: Record<AlertLevel, number> = { urgent: 0, warn: 1, info: 2 };

export function isBpHigh(sys: number, dia: number, s: { bpSys: number; bpDia: number }): boolean {
  return sys >= s.bpSys || dia >= s.bpDia;
}

export function memberAlerts(data: AppData, member: Member, now: Date): FamilyAlert[] {
  const s = data.settings;
  const today = dateKey(now);
  const name = displayName(member);
  const out: FamilyAlert[] = [];
  const isToday = (iso: string) => dateKey(new Date(iso)) === today;

  const sos = data.sosEvents.filter((e) => e.memberId === member.id && !e.cancelled && isToday(e.at));
  if (sos.length) {
    const last = sos[sos.length - 1];
    out.push({
      memberId: member.id,
      level: 'urgent',
      kind: 'sos',
      title: `${name} bấm SOS`,
      detail: `Lúc ${new Date(last.at).toTimeString().slice(0, 5)}`,
    });
  }

  for (const slot of slotsForDay(data.medications, data.doseLogs, member.id, now, now, s.lateMinutes)) {
    if (slot.status === 'late') {
      out.push({
        memberId: member.id,
        level: 'warn',
        kind: 'late-dose',
        title: `${name} chưa uống thuốc ${slot.time}`,
        detail: `Đã trễ ${formatDuration(slot.minutesLate)}`,
      });
    }
  }

  const todaysCheckins = data.checkins.filter((c) => c.memberId === member.id && isToday(c.at));
  if (!todaysCheckins.length && now >= atTime(now, s.checkinBy)) {
    out.push({
      memberId: member.id,
      level: 'warn',
      kind: 'no-checkin',
      title: `${name} chưa điểm danh hôm nay`,
      detail: `Quá ${s.checkinBy} chưa bấm "ổn"`,
    });
  }
  const lastCheckin = todaysCheckins[todaysCheckins.length - 1];
  if (lastCheckin && lastCheckin.mood !== 'good') {
    out.push({
      memberId: member.id,
      level: lastCheckin.mood === 'unwell' ? 'warn' : 'info',
      kind: 'unwell',
      title: `${name} báo ${lastCheckin.mood === 'unwell' ? '"không khỏe"' : '"hơi mệt"'}`,
      detail: lastCheckin.symptoms.length ? lastCheckin.symptoms.join(', ') : undefined,
    });
  }

  const bp = data.bpReadings.filter((r) => r.memberId === member.id && isToday(r.at));
  const lastBp = bp[bp.length - 1];
  if (lastBp && isBpHigh(lastBp.sys, lastBp.dia, s)) {
    out.push({
      memberId: member.id,
      level: 'warn',
      kind: 'bp-high',
      title: `Huyết áp ${lastBp.sys}/${lastBp.dia}`,
      detail: `Từ mức ${s.bpSys}/${s.bpDia} con đã đặt`,
    });
  }

  if (member.lastSeenAt) {
    const mins = (now.getTime() - new Date(member.lastSeenAt).getTime()) / 60000;
    const sleeping = s.excludeSleep && inWindow(now, s.sleepStart, s.sleepEnd);
    if (mins >= s.stillHours * 60 && !sleeping) {
      out.push({
        memberId: member.id,
        level: 'warn',
        kind: 'no-signal',
        title: `Mất tín hiệu từ máy của ${member.call.toLowerCase()} ${formatDuration(mins)}`,
        detail: member.battery != null ? `Pin lần cuối ${member.battery}%` : undefined,
      });
    }
  }

  for (const med of data.medications.filter((m) => m.memberId === member.id)) {
    const days = daysOfStock(med);
    if (days != null && days <= 5) {
      out.push({
        memberId: member.id,
        level: 'info',
        kind: 'low-stock',
        title: `${med.name} còn ${days} ngày`,
        detail: 'Nên mua thêm',
      });
    }
  }
  return out;
}

export function familyAlerts(data: AppData, now: Date): FamilyAlert[] {
  return data.members
    .flatMap((m) => memberAlerts(data, m, now))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export type MemberStatus = 'ok' | 'attention' | 'urgent';

export function memberStatus(alerts: FamilyAlert[]): MemberStatus {
  if (alerts.some((a) => a.level === 'urgent')) return 'urgent';
  if (alerts.some((a) => a.level === 'warn')) return 'attention';
  return 'ok';
}
