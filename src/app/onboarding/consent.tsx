// Xin đồng ý trước khi dùng (thông tin sức khỏe là dữ liệu cá nhân nhạy cảm).
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, H1, Screen, T } from '../../components/ui';
import { PRIVACY_SUMMARY } from '../../domain/privacy';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function Consent() {
  const { acceptPrivacy } = useStore();
  const [ok, setOk] = useState(false);
  return (
    <Screen>
      <View style={{ height: 16 }} />
      <H1 size={28}>Trước khi bắt đầu</H1>
      <T size={17} color={colors.muted}>An Tâm giữ thông tin sức khỏe của bố mẹ. Xin đọc qua cách app dùng thông tin này:</T>
      <Card style={{ gap: 10 }}>
        {PRIVACY_SUMMARY.map((s) => (
          <T key={s} size={16}>• {s}</T>
        ))}
        <Btn variant="ghost" label="Xem đầy đủ chính sách quyền riêng tư" height={44} size={15} onPress={() => router.push('/privacy')} />
      </Card>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ok }}
        accessibilityLabel="Tôi đồng ý"
        onPress={() => setOk((x) => !x)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 4 }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: ok ? colors.green : colors.chipLine,
            backgroundColor: ok ? colors.green : colors.white,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          {ok && <T size={18} weight="700" color={colors.white}>✓</T>}
        </View>
        <T size={16} style={{ flex: 1 }}>
          Tôi đồng ý. Nếu tôi cài cho bố mẹ, tôi đã giải thích và hỏi ý kiến bố mẹ.
        </T>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Btn
        label="Đồng ý và tiếp tục"
        height={64}
        size={20}
        disabled={!ok}
        onPress={() => {
          acceptPrivacy();
          router.replace('/');
        }}
      />
    </Screen>
  );
}
