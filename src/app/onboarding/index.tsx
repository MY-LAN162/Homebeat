import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Banner, Btn, H1, Screen, T } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function RoleCard({ title, sub, onPress, strong }: { title: string; sub: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 22,
        padding: 20,
        borderWidth: 2,
        borderColor: strong ? colors.green : colors.chipLine,
        opacity: pressed ? 0.85 : 1,
        gap: 4,
      })}
    >
      <T size={21} weight="700">{title}</T>
      <T size={16} color={colors.muted}>{sub}</T>
    </Pressable>
  );
}

export default function RoleScreen() {
  const { data, loadDemo, setRole } = useStore();
  const hasFamily = data.members.length > 0;
  return (
    <Screen>
      <View style={{ height: 24 }} />
      <H1 size={32}>Chào mừng đến với An Tâm</H1>
      <T size={18} color={colors.muted}>
        Giúp con cái yên tâm khi bố mẹ ở xa, và giúp bố mẹ không quên thuốc.
      </T>
      <T size={20} weight="700" style={{ marginTop: 12 }}>
        Ai đang dùng điện thoại này?
      </T>
      {hasFamily && (
        <Btn
          label={`Tiếp tục với gia đình đã có (${data.members.map((m) => m.call.toLowerCase()).join(', ')})`}
          onPress={() => {
            setRole('child');
            router.replace('/child');
          }}
        />
      )}
      <RoleCard strong title="Tôi là con, cháu" sub="Theo dõi, nhắc thuốc cho bố mẹ" onPress={() => router.push('/onboarding/invite')} />
      <RoleCard title="Tôi là bố, mẹ" sub="Con đã gửi mã kết nối cho tôi" onPress={() => router.push('/onboarding/pair')} />
      <Btn variant="ghost" label="Đổi điện thoại? Lấy lại gia đình đã có" onPress={() => router.push('/onboarding/restore')} />
      <View style={{ flex: 1 }} />
      <Banner tone="blue">
        <T size={15} color={colors.blueDark}>
          Nên để con cài đặt trước, rồi cài giúp trên máy của bố mẹ. Bố mẹ chỉ cần nhập mã 6 số.
        </T>
      </Banner>
      <Btn
        variant="ghost"
        label="Dùng thử với dữ liệu mẫu"
        onPress={() => {
          loadDemo();
          router.replace('/child');
        }}
      />
    </Screen>
  );
}
