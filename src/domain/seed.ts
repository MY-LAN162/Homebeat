// Dữ liệu mẫu để thử app trên một máy. Không phải dữ liệu thật.
import type { AppData } from './types';
import { DEFAULT_SETTINGS } from './types';
import { addDays, atTime, dateKey } from './time';

/** Lịch sử 6 ngày trước để biểu đồ và tỷ lệ uống thuốc có số liệu. */
function history(now: Date): Pick<AppData, 'doseLogs' | 'checkins' | 'bpReadings'> {
  const doseLogs: AppData['doseLogs'] = [];
  const checkins: AppData['checkins'] = [];
  const bpReadings: AppData['bpReadings'] = [];
  const boSys = [138, 142, 151, 140, 136, 133];
  const plan: [string, string, string][] = [
    ['bo', 'amlo', '07:00'], ['bo', 'metf', '07:00'], ['bo', 'metf', '12:00'], ['bo', 'asp', '12:00'], ['bo', 'metf', '19:00'],
    ['me', 'me1', '07:30'], ['me', 'me2', '20:00'],
  ];
  for (let i = 6; i >= 1; i--) {
    const day = addDays(now, -i);
    const date = dateKey(day);
    for (const [memberId, medId, time] of plan) {
      // Mẫu: bố quên 1 lần trưa, mẹ quên 2 lần tối.
      const missed = (memberId === 'bo' && time === '12:00' && i === 3) || (memberId === 'me' && time === '20:00' && (i === 2 || i === 5));
      if (missed) continue;
      doseLogs.push({ memberId, medId, date, time, status: 'taken', at: atTime(day, time).toISOString() });
    }
    checkins.push({ memberId: 'bo', at: atTime(day, '07:10').toISOString(), mood: 'good', symptoms: [] });
    checkins.push({ memberId: 'me', at: atTime(day, '08:00').toISOString(), mood: i === 1 ? 'tired' : 'good', symptoms: i === 1 ? ['Đau đầu'] : [] });
    bpReadings.push({ memberId: 'bo', at: atTime(day, '08:00').toISOString(), sys: boSys[6 - i], dia: 85, pulse: 76 });
  }
  return { doseLogs, checkins, bpReadings };
}

export function demoData(now: Date): AppData {
  const today = dateKey(now);
  const morning = atTime(now, '07:12').toISOString();
  const past = history(now);
  return {
    version: 1,
    role: 'child',
    currentMemberId: 'bo',
    members: [
      { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con', phone: '' },
      { id: 'me', name: 'Thu', call: 'Mẹ', self: 'Con', phone: '' },
    ],
    caregivers: [
      { id: 'ha', name: 'Hà', phone: '', order: 1 },
      { id: 'minh', name: 'Anh Minh', phone: '', order: 2 },
      { id: 'bay', name: 'Cô Bảy (hàng xóm)', phone: '', order: 3, sosOnly: true },
    ],
    medications: [
      { id: 'amlo', memberId: 'bo', name: 'Amlodipine 5mg', purpose: 'Huyết áp', pillsPerDose: 1, times: ['07:00'], afterMeal: true, stockPills: 4 },
      { id: 'metf', memberId: 'bo', name: 'Metformin 500mg', purpose: 'Tiểu đường', pillsPerDose: 1, times: ['07:00', '12:00', '19:00'], afterMeal: true, stockPills: 78 },
      { id: 'asp', memberId: 'bo', name: 'Aspirin 81mg', pillsPerDose: 1, times: ['12:00'], afterMeal: true, stockPills: 30 },
      { id: 'me1', memberId: 'me', name: '[Thuốc tim mạch]', pillsPerDose: 1, times: ['07:30'], afterMeal: true, stockPills: 12 },
      { id: 'me2', memberId: 'me', name: '[Thuốc mỡ máu]', pillsPerDose: 1, times: ['20:00'], stockPills: 3 },
    ],
    doseLogs: [
      ...past.doseLogs,
      { memberId: 'bo', medId: 'amlo', date: today, time: '07:00', status: 'taken', at: morning },
      { memberId: 'bo', medId: 'metf', date: today, time: '07:00', status: 'taken', at: morning },
    ],
    checkins: [...past.checkins, { memberId: 'bo', at: morning, mood: 'good', symptoms: [] }],
    bpReadings: [...past.bpReadings, { memberId: 'bo', at: atTime(now, '08:00').toISOString(), sys: 135, dia: 85, pulse: 76 }],
    sosEvents: [],
    messages: [
      { id: 'msg1', memberId: 'bo', from: 'Hà', text: 'Cuối tuần con về thăm bố mẹ', at: atTime(now, '06:30').toISOString(), seenAt: atTime(now, '07:15').toISOString() },
    ],
    appointments: [
      {
        id: 'ap1',
        memberId: 'bo',
        title: 'Tái khám tim mạch',
        at: atTime(addDays(now, 4), '08:00').toISOString(),
        companion: 'Hà',
        questions: ['Bố hay chóng mặt khi đứng dậy. Có phải do thuốc không?'],
      },
    ],
    settings: DEFAULT_SETTINGS,
  };
}
