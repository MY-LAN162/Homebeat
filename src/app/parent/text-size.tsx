// Bố mẹ tự chọn cỡ chữ: bấm một mức là thấy ngay. Lưu vào thông tin của bố/mẹ nên con cũng chỉnh hộ được.
import { View } from 'react-native';
import { Back, Btn, Card, H1, Screen, T, TextScale } from '../../components/ui';
import { PARENT_SIZES } from '../../domain/textSize';
import { goBack } from '../../services/nav';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

export default function TextSize() {
  const { updateMember } = useStore();
  const m = useCurrentMember();
  if (!m) return null;
  const cur = m.textScale ?? 1;
  return (
    <Screen>
      <Back onPress={() => goBack('/parent')} />
      <H1>Chọn cỡ chữ</H1>
      <T size={18} color={colors.muted}>Bấm vào cỡ {m.call.toLowerCase()} đọc dễ nhất. Chữ trong app đổi ngay.</T>
      {PARENT_SIZES.map((s) => (
        <TextScale.Provider key={s.k} value={s.k}>
          <Card style={{ gap: 8, borderWidth: 3, borderColor: cur === s.k ? colors.green : 'transparent' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={20} weight="700" style={{ flex: 1 }}>{s.label}</T>
              {cur === s.k && <T size={16} weight="700" color={colors.greenDark}>✓ Đang dùng</T>}
            </View>
            <T size={18}>Đến giờ uống thuốc rồi {m.call.toLowerCase()} ơi</T>
            {cur !== s.k && <Btn label={`Dùng cỡ ${s.label}`} height={52} size={18} onPress={() => updateMember(m.id, { textScale: s.k })} />}
          </Card>
        </TextScale.Provider>
      ))}
      <Btn variant="secondary" label="Xong" height={64} size={22} onPress={() => goBack('/parent')} />
    </Screen>
  );
}
