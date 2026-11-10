// Kiểm tra số điện thoại Việt Nam đơn giản: 9–11 chữ số (chấp nhận +84, dấu cách, dấu chấm).
export function validPhone(p?: string): boolean {
  const d = (p ?? '').replace(/^\+84/, '0').replace(/\D/g, '');
  return d.length >= 9 && d.length <= 11;
}
