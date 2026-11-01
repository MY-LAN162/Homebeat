import { router } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Back, Btn, Card, Chip, H1, Screen, T } from '../../components/ui';
import { deviceTimeZone, TIME_ZONES, zoneLabel } from '../../domain/tz';
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
  const [pickTz, setPickTz] = useState(false);
  const mine = deviceTimeZone();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/child')} />
        <H1 size={22}>Khi nào báo cho con?</H1>
      </View>
      <T size={13} color={colors.muted}>Ngưỡng càng ngắn càng dễ báo nhầm.</T>
      <Card style={{ gap: 8 }}>
        <T size={15} weight="700">Bố mẹ đang sống ở đâu?</T>
        <T size={13} color={colors.muted}>Giờ uống thuốc, giờ điểm danh, giờ ngủ tính theo giờ ở nơi này, kể cả khi bạn ở nước khác.</T>
        <T size={16} weight="700" color={colors.green}>{zoneLabel(s.timeZone)}</T>
        {!pickTz ? (
          <Btn variant="secondary" label="Đổi nơi sống" height={44} size={15} onPress={() => setPickTz(true)} />
        ) : (
          <View style={{ gap: 6 }}>
            {[{ id: undefined as string | undefined, label: `Theo giờ điện thoại này${mine ? ` (${mine})` : ''}` }, ...TIME_ZONES].map((z) => {
              const on = z.id === s.timeZone;
              return (
                <Pressable
                  key={z.id ?? 'device'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    updateSettings({ timeZone: z.id });
                    setPickTz(false);
                  }}
                  style={{ padding: 12, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.greenSoft : colors.white }}
                >
                  <T size={15} weight={on ? '700' : '400'}>{z.id ? zoneLabel(z.id) : z.label}</T>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
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
          <T size={15} weight="700">Tự đọc to khi đến giờ uống thuốc</T>
          <T size={13} color={colors.muted}>Máy của bố mẹ đọc tên thuốc và số viên khi mở màn hình nhắc thuốc</T>
        </View>
        <Switch
          accessibilityLabel="Tự đọc to khi đến giờ uống thuốc"
          value={s.autoSpeak !== false}
          onValueChange={(v) => updateSettings({ autoSpeak: v })}
          trackColor={{ true: colors.green }}
        />
      </Card>
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
      <Btn variant="ghost" label="Mức sử dụng app (thử nghiệm)" height={44} size={15} onPress={() => router.push('/child/usage')} />
    </Screen>
  );
}
