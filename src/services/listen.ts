// Chuyển lời nói thành chữ (tiếng Việt), miễn phí, chạy bằng dịch vụ có sẵn của máy.
// - Bản web (Chrome, Edge, Safari): Web Speech API.
// - Bản cài trên điện thoại: src/services/listen.native.ts (nhận dạng giọng nói của Android / iPhone).
import { Platform } from 'react-native';

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function ctor(): (new () => Rec) | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function canListen(): boolean {
  return !!ctor();
}

/**
 * Bắt đầu nghe. `onText(final, interim)`: final là câu đã chốt (cộng dồn), interim là câu đang nói.
 * Trả về hàm dừng.
 */
export function startListening(onText: (finalText: string, interim: string) => void, onError?: (msg: string, fatal?: boolean) => void): () => void {
  const C = ctor();
  if (!C) {
    onError?.('Máy này chưa hỗ trợ chuyển giọng nói thành chữ.');
    return () => undefined;
  }
  let stopped = false;
  let done = '';
  const rec = new C();
  rec.lang = 'vi-VN';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) done += `${r[0].transcript.trim()}.\n`;
      else interim += r[0].transcript;
    }
    onText(done, interim);
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed') {
      stopped = true;
      onError?.('Chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang để cho phép, hoặc gõ tay.', true);
    }
    else if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.('Mất kết nối nhận giọng nói, đang thử lại...');
  };
  // Trình duyệt tự dừng sau một lúc im lặng: tự bật lại cho đến khi người dùng bấm dừng.
  rec.onend = () => {
    if (!stopped) {
      try {
        rec.start();
      } catch {
        /* đã chạy */
      }
    }
  };
  rec.start();
  return () => {
    stopped = true;
    rec.stop();
  };
}
