// Chuyển lời nói thành chữ (tiếng Việt) trên điện thoại: dùng bộ nhận giọng nói có sẵn của
// Android (Google) / iPhone (Apple) qua thư viện expo-speech-recognition. Miễn phí.
// Bản web dùng src/services/listen.ts (Web Speech API của trình duyệt).
// Cần bản cài (development build / APK), không chạy trong Expo Go.
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { explainThenAsk } from './permission';

export function canListen(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Chưa cho phép dùng micro.',
  'service-not-allowed': 'Máy chưa bật dịch vụ nhận giọng nói (Android: cài hoặc bật ứng dụng Google).',
  'language-not-supported': 'Máy chưa hỗ trợ nhận giọng nói tiếng Việt.',
  network: 'Mất mạng, chưa chuyển giọng nói thành chữ được. Đang thử lại...',
  'audio-capture': 'Không thu được âm thanh từ micro.',
  busy: 'Micro đang được ứng dụng khác dùng.',
};

/**
 * Bắt đầu nghe. `onText(final, interim)`: final là câu đã chốt (cộng dồn), interim là câu đang nói.
 * Trả về hàm dừng. Lần đầu sẽ giải thích rồi mới xin quyền micro.
 */
export function startListening(onText: (finalText: string, interim: string) => void, onError?: (msg: string, fatal?: boolean) => void): () => void {
  let stopped = false;
  let done = '';
  const subs: { remove(): void }[] = [];

  const begin = () => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
    } catch {
      onError?.('Chưa bật được micro. Thử lại sau.', true);
    }
  };

  (async () => {
    const ok = await explainThenAsk({
      what: 'micro',
      why: 'An Tâm dùng micro để ghi lời bác sĩ dặn thành chữ, giúp bạn không quên. Chữ chỉ lưu trên máy này, trừ khi bạn bấm chia sẻ với cả nhà.',
      get: () => ExpoSpeechRecognitionModule.getPermissionsAsync(),
      request: () => ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    });
    if (!ok) {
      stopped = true;
      onError?.('Chưa cho phép dùng micro. Bạn vẫn có thể gõ tay vào ô bên dưới.', true);
      return;
    }
    if (stopped) return;
    subs.push(
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        const text = e.results[0]?.transcript?.trim() ?? '';
        if (e.isFinal) {
          if (text) done += `${text.replace(/[.!?…]+$/, "")}.\n`;
          onText(done, '');
        } else onText(done, text);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'speech-timeout') return;
        const fatal = e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported';
        if (fatal) stopped = true;
        onError?.(ERRORS[e.error] ?? 'Chưa nhận được giọng nói. Đang thử lại...', fatal);
      }),
      // Máy tự dừng sau một lúc im lặng (hoặc giới hạn thời gian của máy): tự bật lại cho đến khi bấm dừng.
      ExpoSpeechRecognitionModule.addListener('end', () => {
        if (!stopped) setTimeout(() => !stopped && begin(), 300);
      }),
    );
    begin();
  })();

  return () => {
    stopped = true;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* đã dừng */
    }
    setTimeout(() => subs.forEach((s) => s.remove()), 1500);
  };
}
