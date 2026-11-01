// Đi khám: gợi ý câu hỏi cho bác sĩ và tóm tắt buổi khám.
// Không dùng AI: gợi ý dựa trên dữ liệu đã ghi trong app, tóm tắt bằng cách lọc câu theo từ khóa.
import { isBpHigh } from './alerts';
import { adherence } from './schedule';
import { fold } from './rx';
import type { AppData, Medication } from './types';
import { addDays } from './time';

/** Câu hỏi gợi ý từ nhật ký 7 ngày gần nhất. Mỗi câu kèm lý do (lấy từ dữ liệu nào). */
export function suggestQuestions(data: AppData, memberId: string, now: Date): { q: string; why: string }[] {
  const out: { q: string; why: string }[] = [];
  const member = data.members.find((m) => m.id === memberId);
  const call = member?.call.toLowerCase() ?? 'bố';
  const since = addDays(now, -7).toISOString();

  const bps = data.bpReadings.filter((r) => r.memberId === memberId && r.at >= since);
  const high = bps.filter((r) => isBpHigh(r.sys, r.dia, data.settings));
  if (high.length) {
    const max = high.reduce((a, b) => (b.sys > a.sys ? b : a));
    out.push({
      q: `Huyết áp tuần này có ${high.length} lần cao, cao nhất ${max.sys}/${max.dia}. Có cần chỉnh liều thuốc không?`,
      why: `${high.length}/${bps.length} lần đo vượt mức ${data.settings.bpSys}/${data.settings.bpDia}`,
    });
  }

  const adh = adherence(data.medications, data.doseLogs, memberId, now, 7);
  const missed = adh.scheduled - adh.taken;
  if (adh.scheduled > 0 && missed >= 2) {
    out.push({
      q: `${capital(call)} quên thuốc ${missed} lần trong 7 ngày qua. Có thể gộp hoặc giảm số lần uống trong ngày không?`,
      why: `Uống ${adh.taken}/${adh.scheduled} lần`,
    });
  }

  const counts = new Map<string, number>();
  for (const c of data.checkins.filter((c) => c.memberId === memberId && c.at >= since)) {
    for (const s of c.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  for (const [s, n] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
    out.push({ q: `${capital(call)} bị "${s.toLowerCase()}" ${n} lần gần đây. Có phải do thuốc không?`, why: `Báo ${n} lần khi điểm danh` });
  }

  const meds = data.medications.filter((m) => m.memberId === memberId);
  if (meds.length >= 4) {
    out.push({ q: `${capital(call)} đang uống ${meds.length} loại thuốc. Các thuốc này uống chung có sao không?`, why: `${meds.length} thuốc trong app` });
  }
  return out;
}

/** Đồ cần mang theo (mặc định, con sửa được). */
export const BRING_LIST = ['Sổ khám bệnh, thẻ bảo hiểm y tế, căn cước', 'Đơn thuốc và vỏ thuốc đang dùng', 'Kết quả xét nghiệm lần trước'];

export interface MedChange {
  name: string;
  from?: string;
  to: string;
  /** Thuốc trong app khớp tên (nếu có). */
  medId?: string;
  sentence: string;
}

export interface VisitSummary {
  /** Bác sĩ nói gì (các câu còn lại có nội dung khám). */
  notes: string[];
  medChanges: MedChange[];
  todos: string[];
  /** Ngày tái khám nếu nghe thấy ("tái khám ngày 28/10"). */
  nextVisit?: { day: number; month: number; sentence: string };
}

const TODO_WORDS = /\b(nho|phai|xet nghiem|do huyet ap|kieng|han che|tap the duc|uong them|mua them)\b/;
const NOTE_WORDS = /\b(huyet ap|tim|phoi|duong huyet|mo mau|chong mat|dau|on dinh|binh thuong|cao|thap|tot|kem)\b/;

/** Tách lời nói thành câu. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

/** Tóm tắt buổi khám từ chữ đã ghi (lời nói → chữ, hoặc con tự ghi). */
export function summarizeVisit(transcript: string, meds: Medication[]): VisitSummary {
  const res: VisitSummary = { notes: [], medChanges: [], todos: [] };
  for (const s of sentences(transcript)) {
    const f = fold(s);
    let used = false;

    // Đổi liều: có tên thuốc (trong app) hoặc có "mg", kèm "tăng/giảm/đổi/lên/xuống/chuyển".
    const doses = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|ml)\b/gi)].map((m) => `${m[1]}${m[2].toLowerCase()}`);
    if (/\b(tang|giam|doi|len|xuong|chuyen|thay)\b/.test(f) && doses.length) {
      const med = meds.find((m) => f.includes(fold(m.name.split(/\s+/)[0])));
      const nameMatch = /([A-Z][a-zA-Z]{3,})/.exec(s);
      const name = med?.name.split(/\s+/)[0] ?? nameMatch?.[1];
      if (name) {
        res.medChanges.push({
          name,
          from: doses.length > 1 ? doses[0] : undefined,
          to: doses[doses.length - 1],
          medId: med?.id,
          sentence: s,
        });
        used = true;
      }
    }

    const nv = /tai kham.*?(\d{1,2})\s*[/-]\s*(\d{1,2})/.exec(f) ?? /tai kham.*?ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})/.exec(f);
    if (nv) {
      res.nextVisit = { day: Number(nv[1]), month: Number(nv[2]), sentence: s };
      used = true;
    }
    if (!used && TODO_WORDS.test(f)) {
      res.todos.push(s);
      used = true;
    }
    if (!used && NOTE_WORDS.test(f)) res.notes.push(s);
  }
  return res;
}

/** Áp dụng đổi liều vào tên thuốc: "Amlodipine 5mg" → "Amlodipine 10mg". */
export function applyMedChange(med: Medication, change: MedChange): Medication {
  const re = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|ml)\b/i;
  const name = re.test(med.name) ? med.name.replace(re, change.to) : `${med.name} ${change.to}`;
  return { ...med, name };
}

/** Văn bản gửi cho cả nhà (Zalo, tin nhắn). */
export function summaryText(title: string, when: string, s: VisitSummary): string {
  const lines = [`Tóm tắt buổi khám: ${title} (${when})`];
  if (s.notes.length) lines.push('', 'Bác sĩ nói:', ...s.notes.map((x) => `• ${x}`));
  if (s.medChanges.length) lines.push('', 'Thay đổi thuốc:', ...s.medChanges.map((c) => `• ${c.name}: ${c.from ? `${c.from} → ` : ''}${c.to}`));
  if (s.todos.length) lines.push('', 'Việc cần làm:', ...s.todos.map((x) => `• ${x}`));
  if (s.nextVisit) lines.push('', `Tái khám: ${s.nextVisit.day}/${s.nextVisit.month}`);
  lines.push('', '(Tóm tắt tự động từ ghi âm, hãy hỏi lại bác sĩ nếu chưa rõ.)');
  return lines.join('\n');
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lời thoại mẫu để thử khi chưa ghi âm được (bản web, máy chưa cho phép micro). */
export const SAMPLE_TRANSCRIPT = `Huyết áp của bác còn hơi cao, cần kiểm soát tốt hơn.
Chóng mặt khi đứng dậy có thể do đứng lên quá nhanh, bác nên ngồi dậy từ từ.
Tim và phổi nghe bình thường.
Tôi tăng Amlodipine từ 5mg lên 10mg, uống buổi sáng.
Bác nhớ đo huyết áp mỗi sáng và ghi lại.
Cần xét nghiệm máu trước lần tái khám.
Hẹn tái khám ngày 28/10.`;
