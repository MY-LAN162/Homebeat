// Che màn hình khi app đang khóa (máy của con đã bật "Khóa app"): lúc mở app và khi quay lại app
// sau hơn 1 phút. Máy bố mẹ không bao giờ khóa, để SOS luôn bấm được ngay.
import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { unlock } from '../services/lock';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, H1, T } from './ui';

const RELOCK_MS = 60_000;

export function LockGate() {
  const { ready, data } = useStore();
  const enabled = ready && !!data.appLock && data.role === 'child';
  const [locked, setLocked] = useState(true);
  const leftAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') leftAt.current = Date.now();
      if (s === 'active' && leftAt.current && Date.now() - leftAt.current > RELOCK_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  const tryUnlock = async () => {
    if (await unlock()) setLocked(false);
  };
  // Tự hỏi vân tay ngay khi khóa (không cần bấm nút).
  useEffect(() => {
    if (!enabled || !locked) return;
    void unlock().then((ok) => {
      if (ok) setLocked(false);
    });
  }, [enabled, locked]);

  if (!enabled || !locked) return null;
  return (
    <View
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}
    >
      <H1 size={26}>An Tâm đang khóa</H1>
      <T size={16} color={colors.muted} style={{ textAlign: 'center' }}>Mở bằng vân tay, khuôn mặt hoặc mã mở máy của bạn.</T>
      <Btn label="Mở khóa" onPress={tryUnlock} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
