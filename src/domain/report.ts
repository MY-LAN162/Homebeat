// Bảng tóm tắt N ngày để đưa bác sĩ xem: huyết áp, uống thuốc, triệu chứng.
// Chỉ dùng dữ liệu đã ghi trong app, không suy đoán bệnh.
import { hasHealth, healthLines } from './health';
import { displayName } from './address';
import { isBpHigh } from './alerts';
import { activeMedsOn, slotsForDay } from './schedule';
import type { AppData, Member } from './types';
import { addDays, atTime, dateKey } from './time';

export interface DoctorReport {
  days: number;
  from: Date;
  to: Date;
  bp: {
    readings: { at: string; sys: number; dia: number; pulse: number; high: boolean }[];
    avgSys?: number;
    avgDia?: number;
    maxSys?: number;
    maxDia?: number;
    highCount: number;
  };
  adherence: { taken: number; scheduled: number; onTime: number; pct?: number };
  missedByMed: { name: string; missed: number }[];
  moods: { good: number; tired: number; unwell: number };
  symptoms: { name: string; count: number }[];
  meds: { name: string; times: string[]; pills: number; afterMeal?: boolean }[];
}

/** Các lần uống đã qua giờ trong N ngày: đã uống / đúng giờ / theo từng thuốc. */
function doseStats(data: AppData, memberId: string, now: Date, days: number) {
  let taken = 0;
  let scheduled = 0;
  let onTime = 0;
  const missed = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = addDays(now, -i);
    const active = activeMedsOn(data.medications, data.doseLogs, memberId, dateKey(day));
    for (const slot of slotsForDay(active, data.doseLogs, memberId, day, now, Number.MAX_SAFE_INTEGER)) {
      if (slot.status === 'upcoming') continue;
      scheduled += 1;
      const logs = data.doseLogs.filter((l) => l.memberId === memberId && l.date === slot.date && l.time === slot.time);
      if (slot.status === 'taken') {
        taken += 1;
        const first = logs.filter((l) => l.status === 'taken').map((l) => new Date(l.at).getTime()).sort()[0];
        if (first != null && first - atTime(day, slot.time).getTime() <= data.settings.lateMinutes * 60_000) onTime += 1;
      }
      for (const med of slot.meds) {
        if (!logs.some((l) => l.medId === med.id && l.status === 'taken')) missed.set(med.name, (missed.get(med.name) ?? 0) + 1);
      }
    }
  }
  return { taken, scheduled, onTime, missed };
}

export function doctorReport(data: AppData, memberId: string, now: Date, days = 30): DoctorReport {
  const from = addDays(now, -(days - 1));
  from.setHours(0, 0, 0, 0);
  const since = from.toISOString();
  const readings = data.bpReadings
    .filter((r) => r.memberId === memberId && r.at >= since)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((r) => ({ at: r.at, sys: r.sys, dia: r.dia, pulse: r.pulse, high: isBpHigh(r.sys, r.dia, data.settings) }));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined);
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : undefined);

  const st = doseStats(data, memberId, now, days);
  const checkins = data.checkins.filter((c) => c.memberId === memberId && c.at >= since);
  const symptoms = new Map<string, number>();
  for (const c of checkins) for (const s of c.symptoms) symptoms.set(s, (symptoms.get(s) ?? 0) + 1);

  return {
    days,
    from,
    to: now,
    bp: {
      readings,
      avgSys: avg(readings.map((r) => r.sys)),
      avgDia: avg(readings.map((r) => r.dia)),
      maxSys: max(readings.map((r) => r.sys)),
      maxDia: max(readings.map((r) => r.dia)),
      highCount: readings.filter((r) => r.high).length,
    },
    adherence: {
      taken: st.taken,
      scheduled: st.scheduled,
      onTime: st.onTime,
      pct: st.scheduled ? Math.round((st.taken / st.scheduled) * 100) : undefined,
    },
    missedByMed: [...st.missed.entries()].map(([name, missed]) => ({ name, missed })).sort((a, b) => b.missed - a.missed),
    moods: {
      good: checkins.filter((c) => c.mood === 'good').length,
      tired: checkins.filter((c) => c.mood === 'tired').length,
      unwell: checkins.filter((c) => c.mood === 'unwell').length,
    },
    symptoms: [...symptoms.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    meds: data.medications
      .filter((m) => m.memberId === memberId)
      .map((m) => ({ name: m.name, times: m.times, pills: m.pillsPerDose, afterMeal: m.afterMeal })),
  };
}

const dm = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** Văn bản gửi bác sĩ / cả nhà qua Zalo, tin nhắn. */
export function reportText(member: Member, r: DoctorReport): string {
  const L = [`Tình hình ${displayName(member)} từ ${dm(r.from)} đến ${dm(r.to)} (${r.days} ngày), ghi bằng app An Tâm`];
  if (hasHealth(member)) L.push('', 'HỒ SƠ', ...healthLines(member, r.to).filter((l) => !l.startsWith('Địa chỉ')).map((l) => `• ${l}`));
  L.push('', 'HUYẾT ÁP');
  if (r.bp.readings.length) {
    L.push(`• ${r.bp.readings.length} lần đo, trung bình ${r.bp.avgSys}/${r.bp.avgDia}, cao nhất ${r.bp.maxSys}/${r.bp.maxDia}`);
    L.push(`• ${r.bp.highCount} lần từ mức cảnh báo trở lên`);
    for (const x of r.bp.readings.slice(-10)) L.push(`  ${dm(new Date(x.at))}: ${x.sys}/${x.dia}, mạch ${x.pulse}${x.high ? ' (cao)' : ''}`);
  } else L.push('• Chưa đo lần nào');
  L.push('', 'UỐNG THUỐC');
  if (r.adherence.scheduled) {
    L.push(`• Uống ${r.adherence.taken}/${r.adherence.scheduled} lần (${r.adherence.pct}%), đúng giờ ${r.adherence.onTime} lần`);
    for (const x of r.missedByMed.filter((m) => m.missed > 0)) L.push(`• Bỏ lỡ ${x.name}: ${x.missed} lần`);
  } else L.push('• Chưa có lịch thuốc');
  L.push('', 'SỨC KHỎE TỰ BÁO');
  L.push(`• Khỏe ${r.moods.good} ngày, hơi mệt ${r.moods.tired} ngày, không khỏe ${r.moods.unwell} ngày`);
  if (r.symptoms.length) L.push(`• Triệu chứng: ${r.symptoms.map((s) => `${s.name} (${s.count} lần)`).join(', ')}`);
  L.push('', 'THUỐC ĐANG DÙNG');
  for (const m of r.meds) L.push(`• ${m.name}: ${m.pills} viên × ${m.times.join(', ')}${m.afterMeal ? ', sau ăn' : ''}`);
  return L.join('\n');
}
