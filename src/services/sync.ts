// Đồng bộ dữ liệu giữa máy của bố mẹ và máy của con.
//
// TRẠNG THÁI: CHƯA LÀM. Bản hiện tại lưu dữ liệu trên từng máy, nên:
//  - Máy bố mẹ: nhắc thuốc, điểm danh, SOS (gọi điện + SMS kèm vị trí) chạy được độc lập.
//  - Máy con: chưa nhận được dữ liệu thật từ máy bố mẹ. Phải nối máy chủ thì mới theo dõi từ xa được.
//
// Bước tiếp theo: cài một FamilySync dùng máy chủ (ví dụ Firebase Firestore + Cloud Messaging,
// hoặc Supabase), rồi gọi nó từ src/state/store.tsx thay cho AsyncStorage.
import type { AppData, BpReading, Checkin, DoseLog, SosEvent } from '../domain/types';

export interface FamilySync {
  /** Đăng nhập / tạo gia đình, trả về mã gia đình. */
  connect(familyId?: string): Promise<string>;
  /** Đổi mã 6 số lấy quyền vào gia đình (máy bố mẹ). */
  redeemPairingCode(code: string): Promise<{ familyId: string; memberId: string }>;
  /** Đẩy sự kiện từ máy bố mẹ lên. */
  pushEvent(e: { kind: 'dose'; log: DoseLog } | { kind: 'checkin'; c: Checkin } | { kind: 'bp'; r: BpReading } | { kind: 'sos'; e: SosEvent }): Promise<void>;
  /** Máy bố mẹ báo "còn sống" định kỳ (pin, thời điểm). */
  heartbeat(memberId: string, battery?: number): Promise<void>;
  /** Máy con nghe thay đổi của cả gia đình. Trả về hàm hủy. */
  subscribe(onData: (data: Partial<AppData>) => void): () => void;
}
