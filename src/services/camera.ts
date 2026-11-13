// Chụp ảnh bằng camera (hoặc chọn ảnh có sẵn), có giải thích trước khi xin quyền.
// Ảnh viên thuốc được thu nhỏ còn khoảng 15 KB và lưu thẳng trong dữ liệu thuốc (Firestore),
// vì kho ảnh Firebase Storage cần gói trả phí.
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { explainThenAsk } from './permission';

export type PhotoSource = 'camera' | 'library';

const WHY = {
  pill: 'An Tâm dùng camera để chụp viên thuốc. Ảnh hiện trên máy bố mẹ khi đến giờ uống, để bố mẹ nhận ra đúng viên.',
  rx: 'An Tâm dùng camera để chụp đơn thuốc. Máy tự đọc chữ trên đơn ngay trên điện thoại, ảnh không gửi đi đâu.',
};

async function pick(source: PhotoSource, purpose: 'pill' | 'rx'): Promise<string | undefined> {
  if (source === 'camera') {
    const ok = await explainThenAsk({
      what: 'camera',
      why: WHY[purpose],
      get: ImagePicker.getCameraPermissionsAsync,
      request: ImagePicker.requestCameraPermissionsAsync,
    });
    if (!ok) return undefined;
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    // Ảnh viên thuốc: cho cắt vuông quanh viên thuốc. Đơn thuốc: giữ nguyên để đọc đủ chữ.
    allowsEditing: purpose === 'pill',
    aspect: purpose === 'pill' ? [1, 1] : undefined,
  };
  // Chọn ảnh có sẵn: Android 13+ và iPhone dùng bộ chọn ảnh của hệ thống, không cần xin quyền.
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return undefined;
  return res.assets[0].uri;
}

/** Chụp ảnh viên thuốc, trả về ảnh nhỏ dạng data URI (JPEG ~240px), hoặc undefined nếu hủy / không có quyền. */
export async function pillPhoto(source: PhotoSource): Promise<string | undefined> {
  const uri = await pick(source, 'pill');
  if (!uri) return undefined;
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 240 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) return undefined;
  return `data:image/jpeg;base64,${out.base64}`;
}

/** Chụp đơn thuốc, trả về ảnh (uri trên máy) đã thu về rộng tối đa 1600px để đọc chữ nhanh hơn. */
export async function rxPhoto(source: PhotoSource): Promise<string | undefined> {
  const uri = await pick(source, 'rx');
  if (!uri) return undefined;
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return out.uri;
}

/** Giới hạn độ dài ảnh lưu trong dữ liệu thuốc (khớp firestore.rules). */
export const MAX_PHOTO_CHARS = 60000;
