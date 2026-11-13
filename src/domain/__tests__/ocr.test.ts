import { cleanOcr, parsePrescription } from '../rx';

// Chữ giống như máy đọc từ ảnh: mất dấu, khối chữ rời, lỗi "rng"/"mq", có phần đầu đơn.
const BLOCKS = [
  'BENH VIEN DA KHOA TINH\nDON THUOC',
  'Ho ten: Nguyen Van Hung Tuoi: 72\nChan doan: Tang huyet ap, dai thao duong typ 2',
  '1) Amlodipin 5rng',
  'SL: 30 vien',
  'Sang 1 vien, sau an',
  '2) METFORMIN 500 mq x 60 vien',
  'Ngay uong 2 lan, sang 1 vien, toi 1 vien sau an',
  'Loi dan: Tai kham sau 30 ngay',
];

describe('đọc đơn từ ảnh', () => {
  it('sửa lỗi đọc chữ hay gặp', () => {
    expect(cleanOcr(['Amlodipin 5rng', 'Metformin 500 mq', 'Aspirin 8O mg'])).toBe('Amlodipin 5mg\nMetformin 500mg\nAspirin 80 mg');
  });
  it('tách được thuốc, bỏ qua phần đầu đơn', () => {
    const items = parsePrescription(cleanOcr(BLOCKS));
    expect(items.map((i) => i.name)).toEqual(['Amlodipin 5mg', 'METFORMIN 500mg']);
    expect(items[0].parts).toEqual(['Sáng']);
    expect(items[0].totalPills).toBe(30);
    expect(items[0].afterMeal).toBe(true);
    expect(items[1].parts).toEqual(['Sáng', 'Tối']);
    expect(items[1].totalPills).toBe(60);
  });
});
