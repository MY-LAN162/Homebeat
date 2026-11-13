// Tin nhắn gửi mã kết nối qua Zalo / tin nhắn: có cách tải app và từng bước, để người nhận tự làm được.
import { formatCode } from './pairing';
import type { Member } from './types';

/** Link tải app (điền khi app đã lên cửa hàng, hoặc link file cài .apk). Trống thì nhắn "nhờ người gửi file cài". */
export const DOWNLOAD_URL = process.env.EXPO_PUBLIC_DOWNLOAD_URL ?? '';

const howToGet = (url: string) =>
  url ? `1. Tải app An Tâm: ${url}` : '1. Cài app An Tâm (người gửi tin này sẽ gửi file cài hoặc cài giúp).';

/** Trang web của An Tâm (vd https://an-tam.web.app). Có thì tin nhắn dẫn tới trang tải app kèm sẵn mã. */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? '';

/** Tin gửi cho máy của bố/mẹ. */
export function parentInviteText(m: Member, code: string, url = DOWNLOAD_URL, web = WEB_URL): string {
  const c = m.call.toLowerCase();
  return [
    `${m.self} cài An Tâm để nhắc ${c} uống thuốc và báo cho ${m.self.toLowerCase()} khi cần.`,
    web ? `1. Mở trang này để tải app (mã đã có sẵn trên trang): ${web.replace(/\/$/, '')}/tai?ma=${code}` : howToGet(url),
    `2. Mở app, bấm “Tôi là bố, mẹ”.`,
    `3. Nhập mã: ${formatCode(code)} (dùng trong 24 giờ).`,
    `Xong ${c} chờ ${m.self.toLowerCase()} bấm Đồng ý là dùng được.`,
  ].join('\n');
}

/** Tin mời anh chị em / máy mới của con. */
export function familyInviteText(code: string, url = DOWNLOAD_URL): string {
  return [
    'Mời bạn cùng theo dõi bố mẹ trên An Tâm.',
    howToGet(url),
    '2. Mở app, bấm “Người nhà mời tôi cùng theo dõi”.',
    `3. Nhập mã: ${formatCode(code)} (dùng trong 1 giờ). Mình bấm Đồng ý là xong.`,
  ].join('\n');
}
