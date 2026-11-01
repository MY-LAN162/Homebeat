// Chính sách quyền riêng tư đầy đủ (mở từ màn hình xin đồng ý và từ Cài đặt).
import { View } from 'react-native';
import { Back, Card, H1, Screen, T } from '../components/ui';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../domain/privacy';
import { goBack } from '../services/nav';
import { colors } from '../theme';

export default function Privacy() {
  return (
    <Screen>
      <Back onPress={() => goBack('/')} />
      <H1 size={24}>Quyền riêng tư</H1>
      <T size={13} color={colors.muted}>Cập nhật {PRIVACY_UPDATED}</T>
      {PRIVACY_SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: 6 }}>
          <T size={16} weight="700">{s.title}</T>
          <View style={{ gap: 4 }}>
            {s.items.map((it) => (
              <T key={it} size={15}>• {it}</T>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
