// Mã hóa dữ liệu lưu trên máy bằng XChaCha20-Poly1305 (@noble/ciphers, thư viện mã nguồn mở đã được kiểm định).
// Hàm thuần: khóa và nguồn số ngẫu nhiên do bên gọi đưa vào (vault.ts), để kiểm thử được.
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils';

/** Tiền tố đánh dấu dữ liệu đã mã hóa (dữ liệu cũ chưa mã hóa vẫn đọc được, lần ghi sau sẽ mã hóa). */
export const PREFIX = 'enc1:';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return out;
}

export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) |
      (B64.indexOf(clean[i + 3] ?? 'A') & 63);
    out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export function encrypt(plain: string, key: Uint8Array, random: (n: number) => Uint8Array): string {
  const nonce = random(24);
  const ct = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(plain));
  const all = new Uint8Array(nonce.length + ct.length);
  all.set(nonce, 0);
  all.set(ct, nonce.length);
  return PREFIX + toBase64(all);
}

/** Giải mã. Dữ liệu chưa mã hóa (bản cũ) trả về nguyên văn. Sai khóa / bị sửa thì ném lỗi. */
export function decrypt(stored: string, key: Uint8Array): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const all = fromBase64(stored.slice(PREFIX.length));
  return bytesToUtf8(xchacha20poly1305(key, all.slice(0, 24)).decrypt(all.slice(24)));
}
