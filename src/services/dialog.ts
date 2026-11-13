// Hộp thoại vẽ ngay trong app (DialogHost ở src/components/DialogHost.tsx), dùng được cả trên
// điện thoại lẫn bản web và trang dùng thử (trang dùng thử không hiện được alert/confirm của trình duyệt).

export interface DialogRequest {
  title: string;
  message?: string;
  /** Nút đồng ý. Không có nút hủy nếu chỉ là thông báo. */
  okLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

type Listener = (d: DialogRequest | undefined) => void;
let listener: Listener | undefined;
const queue: DialogRequest[] = [];

function show(d: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({ ...d, resolve });
    if (queue.length === 1) listener?.(queue[0]);
  });
}

/** DialogHost gọi khi người dùng bấm một nút. */
export function answer(ok: boolean) {
  const d = queue.shift();
  d?.resolve(ok);
  listener?.(queue[0]);
}

export function subscribeDialogs(l: Listener): () => void {
  listener = l;
  l(queue[0]);
  return () => {
    if (listener === l) listener = undefined;
  };
}

/** Báo một thông tin, có nút "Đã hiểu". */
export function notify(title: string, message?: string) {
  void show({ title, message, okLabel: 'Đã hiểu' });
}

/** Hỏi lại trước khi làm việc không hoàn tác được. Trả về true nếu người dùng đồng ý. */
export function confirm(title: string, message: string, okLabel: string): Promise<boolean> {
  return show({ title, message, okLabel, cancelLabel: 'Hủy', danger: true });
}

/** Hỏi có / không, không phải việc nguy hiểm (nút chính màu xanh). */
export function ask(title: string, message: string, okLabel: string, cancelLabel = 'Để sau'): Promise<boolean> {
  return show({ title, message, okLabel, cancelLabel });
}
