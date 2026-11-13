// Máy bố mẹ: con đổi điện thoại thì làm gì. Máy bố mẹ KHÔNG tạo mã và KHÔNG duyệt máy mới:
// kẻ gian hay gọi điện giả làm con, nhờ bố mẹ "đọc mã rồi bấm Đồng ý" để vào xem và sửa dữ liệu.
import { router } from 'expo-router';
import { View } from 'react-native';
import { Back, Btn, Card, H1, Screen, SpeakButton, T } from '../../components/ui';
import { goBack } from '../../services/nav';
import { useCurrentMember } from '../../state/store';
import { colors } from '../../theme';

export default function ParentDevices() {
  const m = useCurrentMember();
  const kids = m?.self.toLowerCase() ?? 'con';
  const callName = m?.call.toLowerCase() ?? 'bố mẹ';
  const warn = `Không đọc mã số nào cho người gọi điện thoại, kể cả người xưng là ${kids}. An Tâm và các ${kids} không bao giờ hỏi mã qua điện thoại.`;

  return (
    <Screen>
      <Back onPress={() => goBack('/parent')} />
      <H1 size={28}>{kids === 'cháu' ? 'Cháu' : 'Con'} đổi điện thoại?</H1>
      <Card style={{ gap: 10, borderWidth: 3, borderColor: colors.red }}>
        <T size={22} weight="700" color={colors.red}>⚠ Cẩn thận lừa đảo</T>
        <T size={19} style={{ lineHeight: 28 }}>{warn}</T>
        <SpeakButton text={warn} label="Đọc to" />
      </Card>
      <Card style={{ gap: 8 }}>
        <T size={19} style={{ lineHeight: 28 }}>
          {callName === 'bố mẹ' ? 'Bố mẹ' : callName.charAt(0).toUpperCase() + callName.slice(1)} không cần làm gì trên máy này. Trên máy mới, các {kids} tự làm một trong hai cách:
        </T>
        <T size={18} style={{ lineHeight: 26 }}>1. Chọn “Đổi điện thoại? Lấy lại gia đình” và đăng nhập email đã liên kết.</T>
        <T size={18} style={{ lineHeight: 26 }}>2. Nhờ anh chị em mở An Tâm › Gia đình › “Tạo mã mời người nhà”.</T>
      </Card>
      <View style={{ flex: 1 }} />
      <Btn variant="ghost" label="Quyền riêng tư" size={16} onPress={() => router.push('/privacy')} />
    </Screen>
  );
}
