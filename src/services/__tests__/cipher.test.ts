import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, fromBase64, PREFIX, toBase64 } from '../cipher';

const rnd = (n: number) => new Uint8Array(randomBytes(n));

describe('mã hóa dữ liệu trên máy', () => {
  it('mã hóa rồi giải mã ra đúng như cũ (có tiếng Việt)', () => {
    const key = rnd(32);
    const text = JSON.stringify({ members: [{ name: 'Hùng', call: 'Bố' }], bp: [151, 85] });
    const enc = encrypt(text, key, rnd);
    expect(enc.startsWith(PREFIX)).toBe(true);
    expect(enc).not.toContain('Hùng');
    expect(decrypt(enc, key)).toBe(text);
  });
  it('mỗi lần mã hóa ra chuỗi khác nhau', () => {
    const key = rnd(32);
    expect(encrypt('a', key, rnd)).not.toBe(encrypt('a', key, rnd));
  });
  it('sai khóa hoặc dữ liệu bị sửa thì không giải mã được', () => {
    const enc = encrypt('bí mật', rnd(32), rnd);
    expect(() => decrypt(enc, rnd(32))).toThrow();
    const key = rnd(32);
    const e2 = encrypt('bí mật', key, rnd);
    const tampered = e2.slice(0, -4) + (e2.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    expect(() => decrypt(tampered, key)).toThrow();
  });
  it('dữ liệu cũ chưa mã hóa vẫn đọc được', () => {
    expect(decrypt('{"a":1}', rnd(32))).toBe('{"a":1}');
  });
  it('base64 đúng với mọi độ dài', () => {
    for (let n = 0; n < 40; n++) {
      const b = rnd(n);
      expect(Array.from(fromBase64(toBase64(b)))).toEqual(Array.from(b));
      expect(toBase64(b)).toBe(Buffer.from(b).toString('base64'));
    }
  });
});
