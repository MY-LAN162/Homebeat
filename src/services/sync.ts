// Đồng bộ dữ liệu giữa máy của bố mẹ và máy của con.
//
// - Bản cài thật: src/services/firebaseSync.ts (Firebase Auth ẩn danh + Firestore + Cloud Functions).
// - Bản trong bộ nhớ để kiểm thử: src/services/memorySync.ts.
// - SyncEngine (src/services/syncEngine.ts) nối FamilySync với kho dữ liệu của app.
//
// Chưa điền cấu hình Firebase (.env) thì app chạy như trước: chỉ lưu trên máy.
import type { RemoteSnapshot, SyncWrite } from '../domain/syncdiff';
import type { Billing, ReferralUse } from '../domain/billing';
import type { AlertSettings, AppData, Pairing, Role } from '../domain/types';

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

/** Một máy trong gia đình. */
export interface FamilyDevice {
  uid: string;
  role?: Role;
  memberId?: string;
  platform?: string;
  /** Máy của người tạo gia đình (chủ): chỉ máy này gỡ được máy khác. */
  owner: boolean;
  /** Máy đang dùng. */
  me: boolean;
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
  /** Mã nhận thông báo đẩy của các máy bố mẹ của một người (để con báo "Con đã thấy", gửi lời nhắn). */
  parentPushTokens(familyId: string, memberId: string): Promise<string[]>;
  /** Danh sách máy trong gia đình. */
  listDevices(familyId: string): Promise<FamilyDevice[]>;
  /** Chủ gia đình gỡ một máy (máy mất, máy lạ), hoặc máy tự rời. */
  removeDevice(familyId: string, uid: string): Promise<void>;
  /** Chủ chuyển quyền chủ cho máy khác. */
  transferOwner(familyId: string, uid: string): Promise<void>;
  /** Máy quản lý xóa toàn bộ dữ liệu gia đình trên máy chủ (không khôi phục được). */
  deleteFamily(familyId: string): Promise<void>;
  /** Ghi các thay đổi lên máy chủ. */
  apply(familyId: string, writes: SyncWrite[]): Promise<void>;
  /** Máy bố mẹ báo "còn sống" (thời điểm, pin). */
  /** `notifOff`: máy bố mẹ đang tắt thông báo (sẽ không kêu nhắc thuốc), để máy con báo. */
  heartbeat(familyId: string, memberId: string, battery?: number, notifOff?: boolean): Promise<void>;
  /** Đọc một lần nhịp "còn sống" mới nhất của các máy bố mẹ (máy con dùng khi chạy nền). */
  readHeartbeats(familyId: string): Promise<Record<string, { at: string; battery?: number; notifOff?: boolean }>>;
  /** Đọc một lần lịch thuốc và cài đặt mới nhất (máy bố mẹ chạy nền: cập nhật giờ nhắc khi con đổi lịch). */
  readSchedule(familyId: string): Promise<{ medications: AppData['medications']; appointments: AppData['appointments']; settings?: AlertSettings }>;
  /** Đọc một lần sự kiện từ `sinceIso` (uống thuốc, điểm danh, huyết áp): máy con làm tóm tắt buổi tối khi chạy nền. */
  readEvents(familyId: string, sinceIso: string): Promise<Pick<AppData, 'doseLogs' | 'checkins' | 'bpReadings'>>;
  /** Gói cước của gia đình (families/{id}/meta/billing) và các lượt giới thiệu thành công. Trả về hàm hủy. */
  watchBilling(familyId: string, onData: (b: Billing | undefined, uses: ReferralUse[]) => void): () => void;
  /** Tạo gói dùng thử và mã giới thiệu cho gia đình (một lần). Mã trùng thì thử mã khác. Trả về bản đã lưu. */
  initBilling(familyId: string, trialStart: string): Promise<Billing>;
  /** Cập nhật gói (mã giới thiệu đã nhập, gói đã trả). */
  updateBilling(familyId: string, patch: Partial<Billing>): Promise<void>;
  /** Mã giới thiệu có thật không (của một gia đình khác). */
  refCodeExists(code: string): Promise<boolean>;
  /** Gia đình được giới thiệu vừa trả phí lần đầu: ghi một lượt cho gia đình đã giới thiệu. */
  recordReferralPaid(referrerCode: string, myCode: string, paidAt: string): Promise<void>;
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
