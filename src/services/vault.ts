// Bản web: trình duyệt không có vùng bảo mật giữ khóa, nên lưu như thường (xem vault.native.ts cho điện thoại).
import AsyncStorage from '@react-native-async-storage/async-storage';

export const readSecure = (name: string) => AsyncStorage.getItem(name);
export const writeSecure = (name: string, value: string) => AsyncStorage.setItem(name, value);
export const encryptedAtRest = false;
