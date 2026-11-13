import { allergyMatch, cleanHealth, hasHealth, healthLines, healthPatch } from '../health';
import type { Member } from '../types';

const BO: Member = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };

describe('hồ sơ sức khỏe', () => {
  it('bỏ trường trống, năm sinh sai', () => {
    expect(cleanHealth({ birthYear: 1800, allergies: '  ', conditions: ['Tiểu đường', ' ', 'Tiểu đường'], bloodType: 'O+' })).toEqual({
      conditions: ['Tiểu đường'],
      bloodType: 'O+',
    });
  });
  it('patch gỡ trường đã xóa', () => {
    const p = healthPatch({ allergies: '' });
    expect('allergies' in p && p.allergies === undefined).toBe(true);
  });
  it('dòng cho người cấp cứu: luôn nói về dị ứng', () => {
    const m = { ...BO, birthYear: 1954, conditions: ['Huyết áp cao'], bloodType: 'O+' };
    const L = healthLines(m, new Date(2026, 10, 13));
    expect(L).toContain('Tuổi: 72 (sinh năm 1954)');
    expect(L).toContain('Dị ứng thuốc: chưa ghi');
    expect(L).toContain('Nhóm máu: O+');
    expect(hasHealth(BO)).toBe(false);
    expect(hasHealth(m)).toBe(true);
  });
});

describe('cảnh báo dị ứng', () => {
  it('trùng tên trực tiếp, không phân biệt dấu và hoa thường', () => {
    expect(allergyMatch('Aspirin 81mg', 'aspirin')).toBe('aspirin');
    expect(allergyMatch('Paracetamol 500mg', 'Dị ứng Paracetamol')).toBe('Dị ứng Paracetamol');
  });
  it('trùng theo nhóm: penicillin → amoxicillin, augmentin', () => {
    expect(allergyMatch('Amoxicillin 500mg', 'Penicillin, hải sản')).toBe('Penicillin');
    expect(allergyMatch('Augmentin 625mg', 'penicilin')).toBe('penicilin');
    expect(allergyMatch('Ibuprofen 400mg', 'Aspirin')).toBe('Aspirin');
  });
  it('không báo nhầm', () => {
    expect(allergyMatch('Amlodipine 5mg', 'Penicillin, hải sản')).toBeUndefined();
    expect(allergyMatch('Metformin 500mg', '')).toBeUndefined();
    expect(allergyMatch('Metformin 500mg', undefined)).toBeUndefined();
    expect(allergyMatch('', 'Penicillin')).toBeUndefined();
  });
});
