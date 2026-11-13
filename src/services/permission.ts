// Xin quyền (camera, micro) theo cách dễ hiểu cho người lớn tuổi:
// 1. Lần đầu: giải thích bằng lời của app TRƯỚC khi máy hiện hộp thoại hệ thống.
// 2. Đã từ chối nhưng còn hỏi lại được: giải thích lại rồi hỏi.
// 3. Đã chặn hẳn ("Không hỏi lại"): chỉ đường mở Cài đặt để bật.
import { Linking, Platform } from 'react-native';
import { ask } from './dialog';

export interface PermState {
  granted: boolean;
  canAskAgain: boolean;
  /** Chưa hỏi lần nào. */
  undetermined?: boolean;
}

export async function explainThenAsk(opts: {
  get: () => Promise<PermState>;
  request: () => Promise<PermState>;
  /** "camera", "micro" */
  what: string;
  /** Câu giải thích: dùng để làm gì. */
  why: string;
}): Promise<boolean> {
  const { get, request, what, why } = opts;
  let st: PermState;
  try {
    st = await get();
  } catch {
    return false;
  }
  if (st.granted) return true;
  if (!st.canAskAgain && Platform.OS !== 'web') {
    const open = await ask(
      `${cap(what)} đang bị tắt cho An Tâm`,
      `${why}\n\nMở Cài đặt › Quyền (Permissions) › bật ${what}, rồi quay lại app.`,
      'Mở Cài đặt',
    );
    if (open) void Linking.openSettings();
    return false;
  }
  const ok = await ask(`Cho An Tâm dùng ${what}?`, `${why}\n\nBấm "Tiếp tục", rồi chọn "Cho phép" ở hộp thoại tiếp theo.`, 'Tiếp tục');
  if (!ok) return false;
  try {
    st = await request();
  } catch {
    return false;
  }
  if (st.granted) return true;
  if (!st.canAskAgain && Platform.OS !== 'web') {
    const open = await ask(
      `Chưa dùng được ${what}`,
      `Bạn đã chọn "Không cho phép". Muốn dùng lại, mở Cài đặt › Quyền › bật ${what}.`,
      'Mở Cài đặt',
    );
    if (open) void Linking.openSettings();
  }
  return false;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
