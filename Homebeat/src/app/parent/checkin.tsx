import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Chip, H1, Screen, T } from '../../components/ui';
import type { Mood } from '../../domain/types';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

const MOODS: { id: Mood; label: string; fg: string; border: string; soft: string }[] = [
  { id: 'good', label: 'Khỏe', fg: colors.greenDark, border: colors.green, soft: colors.greenSoft },
  { id: 'tired', label: 'Hơi mệt', fg: colors.amberDark, border: colors.amber, soft: colors.amberSoft },
  { id: 'unwell', label: 'Không khỏe', fg: '#9B1C12', border: colors.red, soft: colors.redSoft },
];
const SYMPTOMS = ['Đau đầu', 'Chóng mặt', 'Mất ngủ', 'Đau ngực', 'Khó thở', 'Ăn không ngon'];

export default function ParentCheckin() {
  const { checkin } = useStore();
  const m = useCurrentMember();
  const [mood, setMood] = useState<Mood>();
  const [sym, setSym] = useState<string[]>([]);
  if (!m) return null;
  const call = m.call.toLowerCase();
  const toggle = (s: string) => setSym((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));

  return (
    <Screen>
      <H1>Hôm nay {call} thấy trong người thế nào?</H1>
      <View style={{ gap: 10 }}>
        {MOODS.map((o) => {
          const on = mood === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMood(o.id)}
              style={{
                height: 72,
                borderRadius: 18,
                borderWidth: on ? 3 : 2,
                borderColor: on ? o.border : colors.chipLine,
                backgroundColor: on ? o.soft : colors.white,
                justifyContent: 'center',
                paddingHorizontal: 18,
              }}
            >
              <T size={22} weight="700" color={o.fg}>{o.label}</T>
            </Pressable>
          );
        })}
      </View>
      <T size={19} weight="700">Có chỗ nào khó chịu không?</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SYMPTOMS.map((s) => (
          <Chip key={s} label={s} size={17} on={sym.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>
      <Btn variant="ghost" label="Nhập huyết áp sáng nay" onPress={() => router.push('/parent/bp')} />
      <View style={{ flex: 1 }} />
      <Btn
        label={`Gửi cho các ${m.self.toLowerCase()}`}
        height={72}
        size={22}
        disabled={!mood}
        onPress={() => {
          if (!mood) return;
          checkin(m.id, mood, sym);
          router.back();
        }}
      />
    </Screen>
  );
}
