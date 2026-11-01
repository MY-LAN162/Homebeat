// Bản nháp tạm giữa hai màn hình (không lưu lại): đơn thuốc vừa đọc, chờ con xác nhận.
import type { RxItem } from '../domain/rx';

let rxDraft: { memberId: string; items: RxItem[] } | undefined;

export function setRxDraft(d: typeof rxDraft) {
  rxDraft = d;
}
export function getRxDraft() {
  return rxDraft;
}
