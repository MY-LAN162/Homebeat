import { whenReady } from '../../components/WhenReady';
import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { confirm } from '../../services/dialog';
import { Back, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { pillsText } from '../../domain/schedule';
import { addDays, dateKey, formatShortDate, isValidTime, toMinutes } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const PILL_CHOICES = [0.5, 1, 1.5, 2];
const WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
/** "YYYY-MM-DD" -> Date lúc 0 giờ (giờ máy). */
const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400_000);
const PRESETS = ['06:00', '07:00', '08:00', '12:00', '17:00', '19:00', '20:00', '21:00'];

function MedEdit() {
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
  // Uống thế nào: hằng ngày / cách ngày / theo thứ. Uống bao lâu: lâu dài hoặc theo đợt N ngày.
  const [freq, setFreq] = useState<'daily' | 'every2' | 'weekdays'>(
    existing?.weekdays?.length ? 'weekdays' : existing?.every && existing.every > 1 ? 'every2' : 'daily',
  );
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [1, 3, 5]);
  const today = dateKey(new Date());
  const [start, setStart] = useState(existing?.start ?? today);
  const [courseDays, setCourseDays] = useState<number | undefined>(
    existing?.until ? daysBetween(existing.start ?? today, existing.until) + 1 : undefined,
  );

  const toggle = (t: string) => setTimes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t].sort((a, b) => toMinutes(a) - toMinutes(b))));
  const pillsN = Number(pills.replace(',', '.'));
  const valid = name.trim() && times.length > 0 && (freq !== 'weekdays' || weekdays.length > 0) && Number.isFinite(pillsN) && pillsN > 0 && !!memberId;

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
      start: freq !== 'daily' || courseDays ? start : undefined,
      until: courseDays ? dateKey(addDays(fromKey(start), courseDays - 1)) : undefined,
      every: freq === 'every2' ? 2 : undefined,
      weekdays: freq === 'weekdays' ? [...weekdays].sort() : undefined,
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
        <T size={14} weight="600">Số viên mỗi lần</T>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {PILL_CHOICES.map((n) => (
            <Chip key={n} label={pillsText(n)} on={pillsN === n} onPress={() => setPills(String(n))} />
          ))}
        </View>
        <Field label="Số khác (vd 2,5)" value={pills} onChange={setPills} keyboard="decimal-pad" />
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
      <Card style={{ gap: 10 }}>
        <T size={15} weight="700">Uống thế nào</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Hằng ngày" on={freq === 'daily'} onPress={() => setFreq('daily')} />
          <Chip label="Cách ngày" on={freq === 'every2'} onPress={() => setFreq('every2')} />
          <Chip label="Theo thứ trong tuần" on={freq === 'weekdays'} onPress={() => setFreq('weekdays')} />
        </View>
        {freq === 'weekdays' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {WEEK.map((w, i) => (
              <Chip key={w} label={w} on={weekdays.includes(i)} size={14} onPress={() => setWeekdays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} />
            ))}
          </View>
        )}
        <T size={15} weight="700">Uống trong bao lâu</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Dùng lâu dài" on={!courseDays} onPress={() => setCourseDays(undefined)} />
          {[5, 7, 10, 14, 30].map((n) => (
            <Chip key={n} label={`${n} ngày`} on={courseDays === n} onPress={() => setCourseDays(n)} />
          ))}
        </View>
        {(freq !== 'daily' || !!courseDays) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <T size={14} color={colors.muted}>Bắt đầu:</T>
            <Chip label="Hôm nay" on={start === today} size={14} onPress={() => setStart(today)} />
            <Chip label="Ngày mai" on={start === dateKey(addDays(new Date(), 1))} size={14} onPress={() => setStart(dateKey(addDays(new Date(), 1)))} />
          </View>
        )}
        {!!courseDays && (
          <T size={14} color={colors.greenDark}>
            Uống tới hết ngày {formatShortDate(addDays(fromKey(start), courseDays - 1))}, sau đó máy tự dừng nhắc.
          </T>
        )}
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

export default whenReady(MedEdit);
