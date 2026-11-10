// Trang chủ bố mẹ: máy đang tắt thông báo thì hiện thẻ đỏ to, vì khi đó máy KHÔNG kêu nhắc uống thuốc.
// (Máy con cũng được báo qua nhịp "còn sống".)
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { askPermission, notificationsSupported, permissionState, rescheduleMedReminders } from '../services/notifications';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, Card, T } from './ui';

export function ParentNotifCard() {
  const { data } = useStore();
  const [st, setSt] = useState<'granted' | 'ask' | 'blocked'>();
  const check = useCallback(() => {
    permissionState().then(setSt).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!notificationsSupported) return;
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);
  if (!notificationsSupported || !st || st === 'granted') return null;
  return (
    <Card style={{ gap: 10, backgroundColor: colors.redSoft, borderWidth: 3, borderColor: colors.red }}>
      <T size={22} weight="700" color={colors.redDark}>Máy chưa bật chuông nhắc thuốc</T>
      <T size={18} color={colors.redDark}>Đến giờ uống thuốc máy sẽ không kêu. Bấm nút dưới để bật.</T>
      {st === 'ask' ? (
        <Btn
          variant="danger"
          label="Bật chuông nhắc thuốc"
          height={64}
          size={21}
          onPress={async () => {
            const ok = await askPermission().catch(() => false);
            if (ok) rescheduleMedReminders(data).catch(() => undefined);
            check();
          }}
        />
      ) : (
        <Btn variant="danger" label="Mở Cài đặt để bật" height={64} size={21} onPress={() => void Linking.openSettings()} />
      )}
    </Card>
  );
}
