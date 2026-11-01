import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Back, Btn, H1, Screen, T } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const PAIR_ERRORS = {
  format: 'Mã chưa đúng. Bố mẹ kiểm tra lại với con nhé.',
  wrong: 'Mã chưa đúng. Bố mẹ kiểm tra lại với con nhé.',
  expired: 'Mã đã hết hạn. Nhờ con tạo mã mới.',
  'too-many': 'Nhập sai nhiều lần quá. Chờ 10 phút rồi thử lại nhé.',
  network: 'Chưa kết nối được. Bố mẹ kiểm tra mạng (wifi, 4G) rồi thử lại.',
} as const;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'];

export default function PairScreen() {
  const { pair } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const press = (k: string) => {
    setError(undefined);
    if (k === 'clear') setCode('');
    else if (k === 'del') setCode((c) => c.slice(0, -1));
    else setCode((c) => (c.length < 6 ? c + k : c));
  };

  const submit = async () => {
    setBusy(true);
    const r = await pair(code);
    setBusy(false);
    if (r.ok) router.replace('/onboarding/permissions');
    else setError(PAIR_ERRORS[r.reason]);
  };

  return (
    <Screen>
      <Back onPress={() => router.back()} />
      <H1 size={30}>Nhập mã con gửi</H1>
      <T size={18} color={colors.muted}>Mã gồm 6 số, con gửi qua Zalo hoặc tin nhắn.</T>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityLabel={`Đã nhập ${code.length} trên 6 số`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={{
              width: 48,
              height: 64,
              borderRadius: 14,
              backgroundColor: colors.white,
              borderWidth: code[i] || i === code.length ? 3 : 2,
              borderColor: code[i] ? colors.green : i === code.length ? colors.blue : colors.chipLine,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.ink }}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {KEYS.map((k) => {
          const label = k === 'clear' ? 'Xóa hết' : k === 'del' ? 'Xóa 1 số' : k;
          const digit = k.length === 1;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={digit ? `Số ${k}` : label}
              onPress={() => press(k)}
              style={({ pressed }) => ({
                width: '31%',
                height: 68,
                borderRadius: 16,
                backgroundColor: digit ? colors.white : colors.soft,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: digit ? 30 : 17, fontWeight: '700', color: colors.ink }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error && (
        <T size={17} color={colors.red} weight="600" style={{ textAlign: 'center' }}>
          {error}
        </T>
      )}
      <View style={{ flex: 1 }} />
      <Btn
        label={busy ? 'Đang kết nối...' : code.length === 6 ? 'Kết nối với con' : `Còn ${6 - code.length} số nữa`}
        disabled={code.length < 6 || busy}
        height={72}
        size={22}
        onPress={submit}
      />
    </Screen>
  );
}
