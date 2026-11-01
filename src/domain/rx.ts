// Đọc đơn thuốc từ chữ (chữ lấy từ ảnh chụp, hoặc con gõ / dán vào).
// Không dùng AI: chỉ tách theo quy tắc. Dòng nào không chắc thì đánh dấu để con kiểm tra lại.
// Bước "ảnh → chữ" làm trên điện thoại (ML Kit / Apple Vision, miễn phí) ở bản triển khai thật.

export type DayPart = 'Sáng' | 'Trưa' | 'Chiều' | 'Tối';
export const DAY_PARTS: DayPart[] = ['Sáng', 'Trưa', 'Chiều', 'Tối'];
/** Giờ uống mặc định cho từng buổi (con sửa được sau). */
export const PART_TIME: Record<DayPart, string> = { Sáng: '07:00', Trưa: '12:00', Chiều: '17:00', Tối: '19:00' };

export interface RxItem {
  name: string;
  /** "5mg", "500 mg"... nếu có. */
  strength?: string;
  pillsPerDose: number;
  parts: DayPart[];
  afterMeal?: boolean;
  days?: number;
  /** Tổng số viên trên đơn (nếu ghi). */
  totalPills?: number;
  /** Những điểm chưa chắc, để hiện cho con kiểm tra. */
  doubts: string[];
  /** Dòng gốc trên đơn. */
  source: string;
}

/** Bỏ dấu tiếng Việt và viết thường, để so khớp chữ dễ hơn. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const STRENGTH = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|g|ml|iu|ui)\b/i;
/** Dòng bắt đầu bằng số thứ tự "1." "2)" "3/" hoặc gạch đầu dòng. */
const NUMBERED = /^\s*(?:\d{1,2}\s*[.)/-]|[-•*])\s*/;
const PART_WORDS: [DayPart, RegExp][] = [
  ['Sáng', /\bsang\b/],
  ['Trưa', /\btrua\b/],
  ['Chiều', /\bchieu\b/],
  ['Tối', /\btoi\b/],
];
const NUMBER_WORDS: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, nua: 0.5 };

function toNumber(s: string): number {
  const f = fold(s);
  if (f in NUMBER_WORDS) return NUMBER_WORDS[f];
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : NaN;
  }
  return Number(s.replace(',', '.'));
}

/** Dòng này có phải tên thuốc không (có hàm lượng, hoặc có số thứ tự và chữ cái). */
function looksLikeDrug(line: string): boolean {
  if (STRENGTH.test(line)) return true;
  return NUMBERED.test(line) && /[a-zA-Z]{4,}/.test(line) && !isDoseLine(line);
}

/** Dòng hướng dẫn liều: "Ngày uống 2 lần, sáng 1 viên, tối 1 viên, sau ăn". */
function isDoseLine(line: string): boolean {
  const f = fold(line);
  return /\b(uong|ngay|lan|vien|sau an|truoc an|sang|trua|toi)\b/.test(f) && !STRENGTH.test(line);
}

function cleanName(line: string): string {
  let s = line.replace(NUMBERED, '');
  const m = STRENGTH.exec(s);
  if (m) s = s.slice(0, m.index + m[0].length);
  // Bỏ phần "SL: 30 viên", "x 30" ở cuối tên.
  s = s.replace(/\s+(?:sl|so luong|x)\s*[:.]?\s*\d+.*$/i, '');
  return s.replace(/\s+/g, ' ').replace(/[,;:]+$/, '').trim();
}

function applyDose(item: RxItem, text: string) {
  const f = fold(text);
  // "sáng 1 viên", "tối 1/2 viên"
  let perPart: number | undefined;
  for (const [part, re] of PART_WORDS) {
    if (!re.test(f)) continue;
    if (!item.parts.includes(part)) item.parts.push(part);
    const m = new RegExp(`${re.source.replace(/\\b/g, '')}\\s*[:]?\\s*(\\d+(?:[.,/]\\d+)?|mot|hai|ba|nua)\\s*vien`).exec(f);
    if (m) perPart = toNumber(m[1]);
  }
  // "mỗi lần 1 viên", "lần 2 viên", "1 viên/lần"
  const per =
    /(?:moi lan|lan)\s*[:]?\s*(\d+(?:[.,/]\d+)?|mot|hai|ba|nua)\s*vien/.exec(f) ??
    /(\d+(?:[.,/]\d+)?|mot|hai|ba|nua)\s*vien\s*\/\s*lan/.exec(f);
  if (per) perPart = toNumber(per[1]);
  if (perPart != null && !Number.isNaN(perPart)) item.pillsPerDose = perPart;

  // "ngày 2 lần" khi không ghi buổi: sáng / sáng+tối / sáng+trưa+tối
  const times = /ngay\s*(?:uong\s*)?(\d|mot|hai|ba)\s*lan/.exec(f);
  if (times && !item.parts.length) {
    const n = toNumber(times[1]);
    item.parts.push(...((n >= 3 ? ['Sáng', 'Trưa', 'Tối'] : n === 2 ? ['Sáng', 'Tối'] : ['Sáng']) as DayPart[]));
    item.doubts.push('Đơn chỉ ghi số lần/ngày, chưa ghi buổi: đã chọn buổi theo mặc định');
  }
  if (/sau (khi )?an/.test(f)) item.afterMeal = true;
  if (/truoc (khi )?an/.test(f)) item.afterMeal = false;
  const days = /(\d+)\s*ngay\b/.exec(f.replace(/ngay\s*(?:uong\s*)?\d\s*lan/, ''));
  if (days) item.days = Number(days[1]);
  const total = /(?:sl|so luong|x)\s*[:.]?\s*(\d+)\s*(?:vien)?/.exec(f) ?? /\b(\d{2,3})\s*vien\b/.exec(f);
  if (total) item.totalPills = Number(total[1]);
}

/** Tách chữ của đơn thuốc thành danh sách thuốc. */
export function parsePrescription(text: string): RxItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items: RxItem[] = [];
  let cur: RxItem | undefined;
  for (const line of lines) {
    if (looksLikeDrug(line)) {
      const name = cleanName(line);
      const sm = STRENGTH.exec(line);
      cur = {
        name,
        strength: sm ? `${sm[1]}${sm[2].toLowerCase()}` : undefined,
        pillsPerDose: 1,
        parts: [],
        doubts: [],
        source: line,
      };
      items.push(cur);
      // Hướng dẫn liều có thể nằm cùng dòng sau tên thuốc.
      const rest = sm ? line.slice((sm.index ?? 0) + sm[0].length) : '';
      if (rest && isDoseLine(rest)) applyDose(cur, rest);
    } else if (cur && isDoseLine(line)) {
      cur.source += `\n${line}`;
      applyDose(cur, line);
    }
  }
  for (const it of items) {
    if (!it.parts.length) it.doubts.push('Chưa đọc được uống buổi nào');
    if (!it.strength) it.doubts.push('Chưa đọc được hàm lượng (mg)');
    if (it.name.length < 3) it.doubts.push('Tên thuốc ngắn bất thường');
  }
  return items;
}

/** Thuốc đã có trong danh sách (trùng chữ đầu của tên, vd "Amlodipin" và "Amlodipine 5mg"). */
export function findExisting<M extends { name: string }>(it: Pick<RxItem, 'name'>, meds: M[]): M | undefined {
  const head = (s: string) => fold(s).split(/[\s\d]+/)[0] ?? '';
  const a = head(it.name);
  if (a.length < 4) return undefined;
  return meds.find((m) => {
    const b = head(m.name);
    return b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
  });
}

/** Đổi thành thuốc trong app. */
export function rxToMedication(it: RxItem, memberId: string) {
  return {
    memberId,
    name: it.name,
    pillsPerDose: it.pillsPerDose,
    times: DAY_PARTS.filter((p) => it.parts.includes(p)).map((p) => PART_TIME[p]),
    afterMeal: it.afterMeal,
    stockPills: it.totalPills,
  };
}

/** Đơn mẫu để thử khi chưa có ảnh chụp. */
export const SAMPLE_RX = `PHÒNG KHÁM ĐA KHOA
ĐƠN THUỐC
1. Amlodipine 5mg  SL: 30 viên
   Ngày uống 1 lần, sáng 1 viên, sau ăn, 30 ngày
2. Metformin 500mg  SL: 60 viên
   Sáng 1 viên, tối 1 viên, sau ăn
3. Aspirin 81mg
   Uống trưa, sau ăn`;
