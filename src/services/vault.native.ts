// Lưu dữ liệu nhạy cảm trên máy ở dạng mã hóa. Khóa mã hóa nằm trong vùng bảo mật của điện thoại
// (Keychain trên iPhone, Keystore trên Android), không nằm cùng chỗ với dữ liệu.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { decrypt, encrypt, fromBase64, PREFIX, toBase64 } from './cipher';

const KEY_NAME = 'antam-data-key-v1';
// Đọc được sau lần mở khóa máy đầu tiên, để phần chạy nền (khi màn hình khóa) vẫn đọc được dữ liệu.
const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

let keyPromise: Promise<Uint8Array | undefined> | undefined;

function getKey(): Promise<Uint8Array | undefined> {
  keyPromise ??= (async () => {
    try {
      let b64 = await SecureStore.getItemAsync(KEY_NAME, OPTS);
      if (!b64) {
        b64 = toBase64(Crypto.getRandomBytes(32));
        await SecureStore.setItemAsync(KEY_NAME, b64, OPTS);
      }
      return fromBase64(b64);
    } catch {
      return undefined;
    }
  })();
  return keyPromise;
}

/** Đọc. Dữ liệu cũ chưa mã hóa vẫn đọc được. Không giải mã được (mất khóa) thì coi như chưa có (sẽ tải lại từ máy chủ). */
export async function readSecure(name: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(name);
  if (raw == null) return null;
  const key = await getKey();
  if (!key) return raw.startsWith(PREFIX) ? null : raw;
  try {
    return decrypt(raw, key);
  } catch {
    return null;
  }
}

export async function writeSecure(name: string, value: string): Promise<void> {
  const key = await getKey();
  await AsyncStorage.setItem(name, key ? encrypt(value, key, Crypto.getRandomBytes) : value);
}

export const encryptedAtRest = true;
