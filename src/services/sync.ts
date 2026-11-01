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

/** Yêu cầu vào gia đình của một máy mới (máy bố mẹ), chờ người trong gia đình đồng ý. */
export interface JoinRequest {
  uid: string;
  /** Máy xin vào làm máy của bố/mẹ nào ('' nếu là máy của con). */
  memberId: string;
  /** 'parent': máy của bố/mẹ; 'child': máy mới của con (vd đổi điện thoại). */
  role: Role;
  code: string;
  status: 'pending' | 'approved' | 'denied';
  /** "iPhone", "Điện thoại Android"... */
  device?: string;
  at?: string;
}

export interface FamilySync {
  /** Đăng nhập (ẩn danh), trả về mã người dùng. Gọi nhiều lần vẫn là một người. */
  signIn(): Promise<string>;
  /** Máy con tạo gia đình mới, trả về mã gia đình. */
  createFamily(): Promise<string>;
  /** Tạo mã 6 số: cho máy của một bố/mẹ (role 'parent'), hoặc cho máy mới của con (role 'child', memberId ''). */
  createPairingCode(familyId: string, memberId: string, role?: Role): Promise<Pairing>;
  /**
   * Máy bố mẹ nhập mã 6 số: gửi yêu cầu vào gia đình (chưa vào ngay, chờ con bấm Đồng ý).
   * Lỗi thì ném SyncError ('format' | 'wrong' | 'expired' | 'network').
   */
  requestJoin(code: string): Promise<{ familyId: string; memberId: string; role: Role }>;
  /** Email đã liên kết với tài khoản của máy này (để khôi phục khi đổi máy), nếu có. */
  linkedEmail(): Promise<string | undefined>;
  /** Liên kết email + mật khẩu với tài khoản hiện tại. Lỗi thì ném Error với code của Firebase. */
  linkEmail(email: string, password: string): Promise<void>;
  /** Máy mới: đăng nhập bằng email đã liên kết, tìm lại gia đình. undefined nếu không thấy gia đình nào. */
  restoreWithEmail(email: string, password: string): Promise<{ familyId: string; role: Role; memberId?: string } | undefined>;
  /** Máy bố mẹ theo dõi yêu cầu của mình. 'gone' = yêu cầu đã bị xóa. Trả về hàm hủy. */
  watchJoinRequest(familyId: string, onStatus: (s: JoinRequest['status'] | 'gone') => void): () => void;
  /** Máy con nghe các yêu cầu đang chờ. Trả về hàm hủy. */
  subscribeJoinRequests(familyId: string, onList: (list: JoinRequest[]) => void): () => void;
  /** Máy con đồng ý / từ chối. Đồng ý thì thêm máy đó vào gia đình và xóa mã đã dùng. */
  decideJoin(familyId: string, req: JoinRequest, approve: boolean): Promise<void>;
  /** Mã nhận thông báo đẩy của các máy con (để máy bố mẹ tự gửi cảnh báo, không cần máy chủ riêng). */
  childPushTokens(familyId: string): Promise<string[]>;
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
