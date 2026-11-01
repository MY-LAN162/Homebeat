// Đồng bộ dữ liệu giữa máy của bố mẹ và máy của con.
//
// - Bản cài thật: src/services/firebaseSync.ts (Firebase Auth ẩn danh + Firestore + Cloud Functions).
// - Bản trong bộ nhớ để kiểm thử: src/services/memorySync.ts.
// - SyncEngine (src/services/syncEngine.ts) nối FamilySync với kho dữ liệu của app.
//
// Chưa điền cấu hình Firebase (.env) thì app chạy như trước: chỉ lưu trên máy.
import type { RemoteSnapshot, SyncWrite } from '../domain/syncdiff';
import type { Pairing, Role } from '../domain/types';

/** Lỗi khi bố mẹ nhập mã kết nối. */
export type RedeemError = 'format' | 'wrong' | 'expired' | 'too-many' | 'network';

export class SyncError extends Error {
  constructor(public reason: RedeemError, message?: string) {
    super(message ?? reason);
  }
}

export interface DeviceInfo {
  role: Role;
  /** Máy bố mẹ: bố/mẹ nào dùng máy này. */
  memberId?: string;
  /** Mã nhận thông báo đẩy (Expo push token). Máy con cần để nhận cảnh báo. */
  pushToken?: string;
  platform?: string;
}

export interface FamilySync {
  /** Đăng nhập (ẩn danh), trả về mã người dùng. Gọi nhiều lần vẫn là một người. */
  signIn(): Promise<string>;
  /** Máy con tạo gia đình mới, trả về mã gia đình. */
  createFamily(): Promise<string>;
  /** Máy con tạo mã 6 số cho một bố/mẹ. */
  createPairingCode(familyId: string, memberId: string): Promise<Pairing>;
  /** Máy bố mẹ đổi mã 6 số lấy quyền vào gia đình. Lỗi thì ném SyncError. */
  redeemPairingCode(code: string): Promise<{ familyId: string; memberId: string }>;
  /** Ghi các thay đổi lên máy chủ. */
  apply(familyId: string, writes: SyncWrite[]): Promise<void>;
  /** Máy bố mẹ báo "còn sống" (thời điểm, pin). */
  heartbeat(familyId: string, memberId: string, battery?: number): Promise<void>;
  /** Ghi thông tin máy này (vai trò, mã nhận thông báo). */
  registerDevice(familyId: string, info: DeviceInfo): Promise<void>;
  /**
   * Nghe thay đổi của cả gia đình. `pending` = bản này còn thay đổi của chính máy chưa lên tới máy chủ.
   * Trả về hàm hủy.
   */
  subscribe(
    familyId: string,
    onData: (snap: RemoteSnapshot, pending: boolean) => void,
    onError?: (e: Error) => void,
  ): () => void;
}
