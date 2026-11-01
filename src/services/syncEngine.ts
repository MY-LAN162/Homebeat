// Nối kho dữ liệu của app với máy chủ:
//  - Dữ liệu trên máy đổi → so với bản máy chủ đã có (`base`) → ghi phần khác lên.
//  - Máy chủ gửi về → cập nhật `base` → báo cho kho dữ liệu gộp vào.
// `acked` là bản máy chủ đã xác nhận, lưu lại trên máy. Tắt app khi chưa gửi xong thì
// lần mở sau so với `acked` và gửi lại phần còn thiếu.
import { diffData, mergeRemote, type RemoteSnapshot, type SharedData } from '../domain/syncdiff';
import type { FamilySync } from './sync';

export interface EngineOptions {
  sync: FamilySync;
  familyId: string;
  /** Bản máy chủ đã xác nhận lần trước (đọc từ máy), hoặc mốc rỗng. */
  base: SharedData;
  onRemote: (snap: RemoteSnapshot) => void;
  /** Lưu bản đã xác nhận để lần mở app sau dùng làm mốc. */
  saveAcked: (b: SharedData) => void;
  onError?: (e: Error) => void;
}

export class SyncEngine {
  private base: SharedData;
  private acked: SharedData;
  private unsub?: () => void;
  private chain: Promise<void> = Promise.resolve();

  constructor(private o: EngineOptions) {
    this.base = o.base;
    this.acked = o.base;
  }

  /**
   * Gửi phần trên máy còn khác máy chủ TRƯỚC, rồi mới nghe máy chủ. Nếu nghe trước, bản đầu tiên
   * từ máy chủ (chưa có thay đổi của máy này) sẽ ghi đè mất dữ liệu chưa gửi, vd gia đình vừa tạo.
   */
  start(data: SharedData) {
    void this.push(data);
    this.unsub = this.o.sync.subscribe(
      this.o.familyId,
      (snap, pending) => {
        this.base = mergeRemote(this.base, snap);
        if (!pending) {
          this.acked = mergeRemote(this.acked, snap);
          this.o.saveAcked(this.acked);
        }
        this.o.onRemote(snap);
      },
      this.o.onError,
    );
  }

  stop() {
    this.unsub?.();
    this.unsub = undefined;
  }

  /** Gửi thay đổi trên máy. Gọi mỗi khi dữ liệu đổi; không đổi gì thì không ghi. */
  push(data: SharedData): Promise<void> {
    const writes = diffData(this.base, data);
    if (!writes.length) return this.chain;
    this.base = data;
    const run = async () => {
      await this.o.sync.apply(this.o.familyId, writes);
      this.acked = data;
      this.o.saveAcked(data);
    };
    this.chain = this.chain.then(run).catch((e: Error) => {
      // Ghi lỗi (vd bị từ chối quyền): lùi mốc về bản đã xác nhận để lần sau gửi lại.
      this.base = this.acked;
      this.o.onError?.(e);
    });
    return this.chain;
  }

  /** Chờ các lần ghi đang chạy xong (dùng trong kiểm thử). */
  flush(): Promise<void> {
    return this.chain;
  }
}
