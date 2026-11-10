// Nút "Thử chuông": nghe chuông thật ngay lúc cài đặt, phát hiện sớm máy chặn thông báo.
import { useState } from 'react';
import { notificationsSupported, testNotification } from '../services/notifications';
import { track } from '../services/usage';
import { colors } from '../theme';
import { Btn, T } from './ui';

const LABEL = { dose: '🔔 Thử chuông nhắc thuốc', warn: '🔔 Thử chuông cảnh báo', urgent: '🆘 Thử chuông SOS' };

export function TestBell({ kinds, big }: { kinds: ('dose' | 'warn' | 'urgent')[]; big?: boolean }) {
  const [msg, setMsg] = useState<string>();
  if (!notificationsSupported) return null;
  return (
    <>
      {kinds.map((k) => (
        <Btn
          key={k}
          variant="secondary"
          label={LABEL[k]}
          height={big ? 60 : 48}
          size={big ? 19 : 16}
          onPress={async () => {
            const ok = await testNotification(k).catch(() => false);
            track(`test_bell_${k}`);
            setMsg(ok ? 'Chuông sẽ kêu sau 3 giây. Có thể khóa màn hình để nghe như thật.' : 'Máy chưa cho phép thông báo nên chưa kêu được. Bật thông báo trước nhé.');
          }}
        />
      ))}
      {msg && <T size={big ? 17 : 14} color={colors.muted}>{msg}</T>}
    </>
  );
}
