import * as Speech from 'expo-speech';

/** Đọc to bằng giọng tiếng Việt, chậm hơn bình thường một chút cho người lớn tuổi. */
export function stopSpeaking() {
  Speech.stop();
}

export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'vi-VN', rate: 0.85 });
}
