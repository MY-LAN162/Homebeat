import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { confirm } from '../../services/dialog';
import { Back, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { isValidTime, toMinutes } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const PRESETS = ['06:00', '07:00', '08:00', '12:00', '17:00', '19:00', '20:00', '21:00'];

export default function MedEdit() {
  const params = useLocalSearchParams<{ id?: string; memberId?: string }>();
  const { data, upsertMedication, removeMedication } = useStore();
  const existing = data.medications.find((m) => m.id === params.id);
  const memberId = existing?.memberId ?? params.memberId ?? data.members[0]?.id;

  const [name, setName] = useState(existing?.name ?? '');
  const [purpose, setPurpose] = useState(existing?.purpose ?? '');
  const [pills, setPills] = useState(String(existing?.pillsPerDose ?? 1));
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['07:00']);
  const [custom, setCustom] = useState('');
  const [stock, setStock] = useState(existing?.stockPills != null ? String(existing.stockPills) : '');
  const [afterMeal, setAfterMeal] = useState(existing?.afterMeal ?? true);

  const toggle = (t: string) => setTimes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t].sort((a, b) => toMinutes(a) - toMinutes(b))));
  const pillsN = Number(pills);
  const valid = name.trim() && times.length > 0 && Number.isFinite(pillsN) && pillsN > 0 && !!memberId;

  const save = () => {
    if (!valid || !memberId) return;
    const stockN = stock.trim() === '' ? undefined : Math.max(0, Math.floor(Number(stock)));
    upsertMedication({
      id: existing?.id,
      memberId,
      name: name.trim(),
      purpose: purpose.trim() || undefined,
      pillsPerDose: pillsN,
      times,
      afterMeal,
      stockPills: Number.isFinite(stockN as number) ? stockN : undefined,
      photoUri: existing?.photoUri,
    });
    goBack('/child');
  };

  const allTimes = [...new Set([...PRESETS, ...times])].sort((a, b) => toMinutes(a) - toMinutes(b));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/child')} />
        <H1 size={24}>{existing ? 'Sửa thuốc' : 'Thêm thuốc'}</H1>
      </View>
      <Card style={{ gap: 12 }}>
        <Field label="Tên thuốc và hàm lượng" value={name} onChange={setName} placeholder="Ví dụ: Amlodipine 5mg" />
        <Field label="Dùng để (không bắt buộc)" value={purpose} onChange={setPurpose} placeholder="Ví dụ: Huyết áp" />
        <Field label="Số viên mỗi lần" value={pills} onChange={setPills} keyboard="number-pad" />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T size={15} weight="600" style={{ flex: 1 }}>Uống sau bữa ăn</T>
          <Switch value={afterMeal} onValueChange={setAfterMeal} trackColor={{ true: colors.green }} accessibilityLabel="Uống sau bữa ăn" />
        </View>
      </Card>
      <Card style={{ gap: 10 }}>
        <T size={15} weight="700">Giờ uống</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {allTimes.map((t) => (
            <Chip key={t} label={t} on={times.includes(t)} onPress={() => toggle(t)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Giờ khác (HH:MM)" value={custom} onChange={setCustom} placeholder="13:30" />
          </View>
          <Btn
            label="Thêm giờ"
            variant="secondary"
            height={50}
            size={15}
            disabled={!isValidTime(custom)}
            onPress={() => {
              const t = custom.trim().padStart(5, '0');
              if (!times.includes(t)) toggle(t);
              setCustom('');
            }}
          />
        </View>
      </Card>
      <Card>
        <Field label="Số viên còn lại (để báo sắp hết)" value={stock} onChange={setStock} keyboard="number-pad" />
      </Card>
      <Btn label="Lưu và tạo lịch nhắc" disabled={!valid} onPress={save} />
      {existing && (
        <Btn
          variant="ghost"
          label="Xóa thuốc này"
          onPress={() =>
            confirm('Xóa thuốc này?', `${existing.name} sẽ không còn được nhắc nữa.`, 'Xóa').then((ok) => {
              if (!ok) return;
              removeMedication(existing.id);
              goBack('/child');
            })
          }
        />
      )}
      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        An Tâm chỉ giúp nhắc lịch, không thay thế tư vấn của bác sĩ, dược sĩ.
      </T>
    </Screen>
  );
}
