// Hồ sơ sức khỏe của bố mẹ: bệnh nền, dị ứng thuốc, nhóm máu, bảo hiểm y tế, nơi khám quen.
// Dùng khi bấm SOS (đưa cho người cấp cứu xem), trong báo cáo cho bác sĩ, và để cảnh báo dị ứng khi thêm thuốc.
// Cảnh báo dị ứng chỉ là gợi ý để con hỏi lại bác sĩ / dược sĩ, không thay lời khuyên y tế.

import { fold } from './rx';
import type { Member } from './types';

export const CONDITIONS = [
  'Huyết áp cao',
  'Tiểu đường',
  'Tim mạch',
  'Mỡ máu cao',
  'Tai biến (đột quỵ)',
  'Hen, phổi',
  'Thận',
  'Xương khớp',
  'Gút',
  'Dạ dày',
  'Trí nhớ kém',
  'Parkinson',
] as const;

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
export const RH = ['+', '-'] as const;

/** Các trường sức khỏe trên Member. */
export type HealthInfo = Pick<Member, 'birthYear' | 'conditions' | 'allergies' | 'bloodType' | 'insurance' | 'hospital' | 'address'>;
export const HEALTH_KEYS: (keyof HealthInfo)[] = ['birthYear', 'conditions', 'allergies', 'bloodType', 'insurance', 'hospital', 'address'];

/** Bỏ trường trống để không lưu chuỗi rỗng. */
/** Độ dài tối đa từng mục (khớp firestore.rules): dài hơn thì máy chủ từ chối. */
const MAX = { allergies: 300, bloodType: 4, insurance: 20, hospital: 120, address: 200 } as const;

export function cleanHealth(h: HealthInfo, now = new Date()): HealthInfo {
  const out: HealthInfo = {};
  const year = h.birthYear && Number.isInteger(h.birthYear) && h.birthYear >= 1900 && h.birthYear <= now.getFullYear() ? h.birthYear : undefined;
  if (year) out.birthYear = year;
  const conds = [...new Set((h.conditions ?? []).map((c) => c.trim().slice(0, 60)).filter(Boolean))].slice(0, 20);
  if (conds.length) out.conditions = conds;
  for (const k of ['allergies', 'bloodType', 'insurance', 'hospital', 'address'] as const) {
    const v = h[k]?.trim().slice(0, MAX[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** Patch để lưu: trường bị xóa trống phải được gỡ (undefined) chứ không giữ giá trị cũ. */
export function healthPatch(h: HealthInfo): Partial<Member> {
  const c = cleanHealth(h);
  const p: Partial<Member> = {};
  for (const k of HEALTH_KEYS) (p as Record<string, unknown>)[k] = c[k];
  return p;
}

export function ageOf(m: Pick<Member, 'birthYear'>, now: Date): number | undefined {
  return m.birthYear ? now.getFullYear() - m.birthYear : undefined;
}

export function hasHealth(m: Member): boolean {
  return HEALTH_KEYS.some((k) => {
    const v = m[k];
    return Array.isArray(v) ? v.length > 0 : v != null && v !== '';
  });
}

/** Các dòng ngắn gọn để hiện cho người cấp cứu / bác sĩ. Chỉ gồm những gì đã điền. */
export function healthLines(m: Member, now: Date): string[] {
  const L: string[] = [];
  const age = ageOf(m, now);
  if (age) L.push(`Tuổi: ${age} (sinh năm ${m.birthYear})`);
  if (m.conditions?.length) L.push(`Bệnh nền: ${m.conditions.join(', ')}`);
  L.push(`Dị ứng thuốc: ${m.allergies?.trim() || 'chưa ghi'}`);
  if (m.bloodType) L.push(`Nhóm máu: ${m.bloodType}`);
  if (m.insurance) L.push(`Thẻ BHYT: ${m.insurance}`);
  if (m.hospital) L.push(`Nơi khám quen: ${m.hospital}`);
  if (m.address) L.push(`Địa chỉ nhà: ${m.address}`);
  return L;
}

/** Nhóm thuốc hay gây dị ứng: dị ứng tên nhóm thì cảnh báo cả các thuốc trong nhóm. */
const GROUPS: { names: string[]; drugs: string[] }[] = [
  {
    names: ['penicillin', 'penicilin', 'peni', 'khang sinh nhom beta', 'beta lactam'],
    drugs: ['penicillin', 'amoxicillin', 'amoxicilin', 'ampicillin', 'augmentin', 'cloxacillin', 'oxacillin', 'piperacillin', 'klamentin', 'curam'],
  },
  {
    names: ['cephalosporin', 'cefalosporin'],
    drugs: ['cefuroxim', 'cefixim', 'cefaclor', 'cefalexin', 'cephalexin', 'cefadroxil', 'ceftriaxon', 'cefpodoxim', 'cefdinir', 'zinnat'],
  },
  {
    names: ['sulfa', 'sulfamid', 'sulfonamid'],
    drugs: ['sulfamethoxazol', 'cotrimoxazol', 'co-trimoxazol', 'bactrim', 'biseptol'],
  },
  {
    names: ['aspirin', 'nsaid', 'khang viem khong steroid', 'giam dau khang viem'],
    drugs: ['aspirin', 'aspegic', 'ibuprofen', 'diclofenac', 'meloxicam', 'naproxen', 'piroxicam', 'celecoxib', 'etoricoxib', 'ketoprofen', 'mobic', 'voltaren'],
  },
  { names: ['paracetamol', 'acetaminophen'], drugs: ['paracetamol', 'acetaminophen', 'panadol', 'efferalgan', 'hapacol', 'tylenol'] },
  { names: ['codein', 'codeine', 'morphin', 'opioid'], drugs: ['codein', 'codeine', 'morphin', 'tramadol', 'efferalgan codein'] },
  { names: ['iod', 'iot', 'thuoc can quang'], drugs: ['iod', 'povidon', 'betadine'] },
  { names: ['statin'], drugs: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin'] },
  { names: ['ace', 'uc che men chuyen'], drugs: ['enalapril', 'captopril', 'perindopril', 'lisinopril', 'ramipril', 'coversyl'] },
];

/** Tách chuỗi dị ứng "Penicillin, aspirin; hải sản" thành từng mục đã bỏ dấu. */
export function allergyItems(allergies: string | undefined): string[] {
  return (allergies ?? '')
    .split(/[,;/\n]|\bva\b|\bvà\b/i)
    .map((s) => fold(s).replace(/^(di ung|thuoc)\s+/, '').trim())
    .filter((s) => s.length >= 3);
}

/**
 * Thuốc có thể trùng với dị ứng đã ghi không? Trả về mục dị ứng bị trùng, hoặc undefined.
 * So theo tên thuốc trực tiếp, và theo nhóm (dị ứng penicillin → cảnh báo amoxicillin).
 */
export function allergyMatch(medName: string, allergies: string | undefined): string | undefined {
  const med = fold(medName);
  if (!med.trim()) return undefined;
  const raw = (allergies ?? '').split(/[,;/\n]/).map((s) => s.trim()).filter(Boolean);
  const items = allergyItems(allergies);
  for (const a of items) {
    const label = raw.find((r) => fold(r).includes(a)) ?? a;
    if (a.length >= 4 && med.includes(a)) return label;
    const first = med.split(/\s+/)[0];
    if (first.length >= 4 && a.includes(first)) return label;
    for (const g of GROUPS) {
      const inGroup = g.names.some((n) => a.includes(n)) || g.drugs.some((d) => a.includes(d));
      if (inGroup && g.drugs.some((d) => med.includes(d))) return label;
    }
  }
  return undefined;
}
