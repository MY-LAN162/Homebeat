import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { Back, Card, Chip, H1, Screen, T } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function Group<V extends string | number>({
  title,
  options,
  value,
  onPick,
  label,
}: {
  title: string;
  options: V[];
  value: V;
  onPick: (v: V) => void;
  label: (v: V) => string;
}) {
  return (
    <Card>
      <T size={15} weight="700">{title}</T>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((o) => (
          <View key={String(o)} style={{ flex: 1 }}>
            <Chip label={label(o)} on={o === value} onPress={() => onPick(o)} size={14} />
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function AlertSettings() {
  const { data, updateSettings } = useStore();
  const s = data.settings;
  const bpKey = `${s.bpSys}/${s.bpDia}`;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => router.back()} />
        <H1 size={22}>Khi nào báo cho con?</H1>
      </View>
      <T size={13} color={colors.muted}>Ngưỡng càng ngắn càng dễ báo nhầm.</T>
      <Group title="Trễ thuốc quá" options={[15, 30, 60]} value={s.lateMinutes} onPick={(v) => updateSettings({ lateMinutes: v })} label={(v) => `${v} phút`} />
      <Group title="Mất tín hiệu / không di chuyển quá" options={[2, 3, 5]} value={s.stillHours} onPick={(v) => updateSettings({ stillHours: v })} label={(v) => `${v} giờ`} />
      <Group title='Chưa bấm "ổn" trước' options={['09:00', '10:00', '12:00']} value={s.checkinBy} onPick={(v) => updateSettings({ checkinBy: v })} label={(v) => v} />
      <Group
        title="Huyết áp từ mức"
        options={['130/80', '140/90', '160/100']}
        value={bpKey}
        onPick={(v) => {
          const [sys, dia] = v.split('/').map(Number);
          updateSettings({ bpSys: sys, bpDia: dia });
        }}
        label={(v) => v}
      />
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T size={15} weight="700">Không tính giờ ngủ</T>
          <T size={13} color={colors.muted}>{s.sleepStart} – {s.sleepEnd} không báo mất tín hiệu</T>
        </View>
        <Switch
          accessibilityLabel="Không tính giờ ngủ"
          value={s.excludeSleep}
          onValueChange={(v) => updateSettings({ excludeSleep: v })}
          trackColor={{ true: colors.green }}
        />
      </Card>
      <T size={12} color={colors.muted}>
        Mức huyết áp là ngưỡng để báo cho con, không phải chẩn đoán. Nên hỏi bác sĩ của bố mẹ để đặt cho phù hợp.
      </T>
    </Screen>
  );
}
