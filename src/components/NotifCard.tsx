// Máy của con: xin quyền thông báo, giải thích trước vì sao cần.
// Thiếu quyền này thì máy con KHÔNG nhận được cảnh báo (bố mẹ quên thuốc, bấm SOS, máy bố mẹ mất tín hiệu).
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { askPermission, notificationsSupported, permissionState } from '../services/notifications';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { TestBell } from './TestBell';
import { Banner, Btn, Card, T } from './ui';

type State = 'granted' | 'ask' | 'blocked' | undefined;

/**
 * `onboarding`: hiện cả khi đã bật (dấu ✓) và trên bản trình duyệt (giải thích).
 * Mặc định (trang chủ): chỉ hiện khi máy chưa cho phép thông báo.
 */
export function NotifCard({ onboarding }: { onboarding?: boolean }) {
  const { refreshDevice } = useStore();
  const [st, setSt] = useState<State>();

  const check = useCallback(() => {
    permissionState()
      .then(setSt)
      .catch(() => setSt('blocked'));
  }, []);

  useEffect(() => {
    if (!notificationsSupported) return;
    check();
    // Quay lại từ Cài đặt: kiểm tra lại.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (st === 'granted') refreshDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);

  if (!notificationsSupported) {
    if (!onboarding) return null;
    return (
      <Banner tone="blue">
        <T size={14} color={colors.blueDark}>
          Bản cài trên điện thoại sẽ hỏi “Cho phép An Tâm gửi thông báo?” ở bước này. Bạn cần bấm “Cho phép” để nhận cảnh báo
          khi bố mẹ quên thuốc hoặc bấm SOS.
        </T>
      </Banner>
    );
  }
  if (!st) return null;
  if (st === 'granted') {
    return onboarding ? (
      <>
        <Banner tone="green">
          <T size={15} weight="700" color={colors.greenDark}>✓ Đã bật thông báo: máy này sẽ nhận cảnh báo về bố mẹ</T>
        </Banner>
        <TestBell kinds={['warn', 'urgent']} />
      </>
    ) : null;
  }

  return (
    <Card style={{ gap: 8, backgroundColor: colors.amberSoft }}>
      <T size={17} weight="700" color={colors.amberDark}>
        {onboarding ? 'Bật thông báo để nhận cảnh báo' : 'Máy này chưa nhận được cảnh báo'}
      </T>
      <T size={15} color={colors.amberDark}>
        Khi bố mẹ quên thuốc, không khỏe, bấm SOS hoặc máy bố mẹ mất tín hiệu, An Tâm sẽ báo ngay cho bạn.
        {st === 'ask'
          ? ' Bấm nút dưới, điện thoại sẽ hỏi: chọn “Cho phép”.'
          : ' Thông báo đang bị tắt: vào Cài đặt › Thông báo, bật cho An Tâm.'}
      </T>
      {st === 'ask' ? (
        <Btn
          label="Bật thông báo"
          onPress={async () => {
            await askPermission().catch(() => false);
            check();
          }}
        />
      ) : (
        <Btn label="Mở Cài đặt" onPress={() => void Linking.openSettings()} />
      )}
    </Card>
  );
}
