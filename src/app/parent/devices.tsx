// Máy bố mẹ: con đổi điện thoại → bố mẹ tạo mã, con nhập trên máy mới, bố mẹ bấm Đồng ý.
import { useState } from 'react';
import { View } from 'react-native';
import { JoinRequests } from '../../components/JoinRequests';
import { Back, Btn, Card, H1, Screen, SpeakButton, T } from '../../components/ui';
import { formatCode } from '../../domain/pairing';
import { notify } from '../../services/dialog';
import { goBack } from '../../services/nav';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ParentDevices() {
  const { data, now, newChildPairing } = useStore();
  const m = useCurrentMember();
  const [busy, setBusy] = useState(false);
  const kids = m?.self.toLowerCase() ?? 'con';
  const p = data.childPairing && new Date(data.childPairing.expiresAt) > now ? data.childPairing : undefined;
  const connected = !!data.familyId && !data.demo;

  return (
    <Screen>
      <Back onPress={() => goBack('/parent')} />
      <H1 size={28}>{kids === 'cháu' ? 'Cháu' : 'Con'} đổi điện thoại?</H1>
      {!connected ? (
        <T size={19}>Máy này chưa kết nối với máy của các {kids}. Nhờ {kids} cài giúp trước.</T>
      ) : (
        <>
          <T size={19} style={{ lineHeight: 28 }}>
            Bấm nút xanh để có mã 6 số. Đọc mã cho {kids} nhập trên máy mới. Máy này sẽ hiện “Có máy mới xin vào gia đình”: bấm Đồng ý.
          </T>
          <JoinRequests big />
          {p ? (
            <Card style={{ alignItems: 'center', gap: 8 }}>
              <T size={16} color={colors.muted}>Mã cho máy mới của {kids}</T>
              <T size={46} weight="700" color={colors.green} style={{ letterSpacing: 6 }}>{formatCode(p.code)}</T>
              <SpeakButton text={`Mã là: ${p.code.split('').join(', ')}`} label="Đọc mã" />
            </Card>
          ) : null}
          <View style={{ flex: 1 }} />
          <Btn
            label={busy ? 'Đang tạo mã...' : p ? 'Tạo mã khác' : `Tạo mã cho máy mới của ${kids}`}
            height={72}
            size={21}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await newChildPairing();
              } catch {
                notify('Chưa tạo được mã', 'Kiểm tra mạng (wifi, 4G) rồi thử lại.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}
