import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../../services/nav';
import { View } from 'react-native';
import { Back, Btn, Card, Chip, H1, Screen, T } from '../../../components/ui';
import { PARENT_SIZES } from '../../../domain/textSize';
import { displayName } from '../../../domain/address';
import { isBpHigh } from '../../../domain/alerts';
import { slotsForDay } from '../../../domain/schedule';
import { dateKey, hm } from '../../../domain/time';
import { call } from '../../../services/phone';
import { useStore } from '../../../state/store';
import { colors } from '../../../theme';

type Item = { time: string; text: string; tone: 'done' | 'wait' | 'todo' | 'warn' };
const DOT = { done: colors.green, wait: colors.amber, todo: '#C9C1B3', warn: colors.amber };
const MOOD = { good: 'Khỏe', tired: 'Hơi mệt', unwell: 'Không khỏe' };

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, updateMember } = useStore();
  const m = data.members.find((x) => x.id === id);
  if (!m) return null;
  const today = dateKey(now);
  const isToday = (iso: string) => dateKey(new Date(iso)) === today;

  const items: Item[] = [];
  for (const c of data.checkins.filter((x) => x.memberId === m.id && isToday(x.at))) {
    items.push({ time: hm(new Date(c.at)), text: `Điểm danh · ${MOOD[c.mood]}${c.symptoms.length ? ` · ${c.symptoms.join(', ')}` : ''}`, tone: c.mood === 'good' ? 'done' : 'warn' });
  }
  for (const r of data.bpReadings.filter((x) => x.memberId === m.id && isToday(x.at))) {
    items.push({ time: hm(new Date(r.at)), text: `Huyết áp ${r.sys}/${r.dia} · nhịp tim ${r.pulse}`, tone: isBpHigh(r.sys, r.dia, data.settings) ? 'warn' : 'done' });
  }
  for (const s of slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes)) {
    const text = {
      taken: `Đã uống thuốc ${s.time} · ${s.pills} viên`,
      skipped: `Bỏ thuốc ${s.time} (báo hết thuốc / không uống được)`,
      due: `Thuốc ${s.time} · đang chờ xác nhận`,
      late: `Thuốc ${s.time} · chưa uống, trễ ${s.minutesLate} phút`,
      upcoming: `Thuốc ${s.time}`,
    }[s.status];
    const tone: Item['tone'] = s.status === 'taken' ? 'done' : s.status === 'upcoming' ? 'todo' : s.status === 'due' ? 'wait' : 'warn';
    items.push({ time: s.time, text, tone });
  }
  items.sort((a, b) => a.time.localeCompare(b.time));

  const bp = data.bpReadings.filter((x) => x.memberId === m.id).slice(-7);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/child')} />
        <H1 size={24}>{displayName(m)}</H1>
        <View style={{ flex: 1 }} />
        {!!m.phone && <Btn label={`Gọi ${m.call.toLowerCase()}`} height={44} size={15} onPress={() => call(m.phone)} />}
      </View>

      <Btn
        variant="blue"
        label={`💬 Nhắn ${m.call.toLowerCase()}`}
        height={48}
        size={16}
        onPress={() => router.push({ pathname: '/child/message', params: { memberId: m.id } })}
      />
      <Card style={{ gap: 8 }}>
        <T size={14} weight="700">Cỡ chữ trên máy của {m.call.toLowerCase()}</T>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {PARENT_SIZES.map((s) => (
            <Chip key={s.k} label={s.label} on={(m.textScale ?? 1) === s.k} size={14} onPress={() => updateMember(m.id, { textScale: s.k })} />
          ))}
        </View>
      </Card>
      <Btn
        variant="secondary"
        label="Xem tình hình 30 ngày (đưa bác sĩ xem)"
        height={48}
        size={15}
        onPress={() => router.push({ pathname: '/child/report', params: { memberId: m.id } })}
      />

      <Card>
        <T size={16} weight="700">Hôm nay</T>
        {!items.length && <T size={14} color={colors.muted}>Chưa có hoạt động nào.</T>}
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <T size={13} color={colors.muted} style={{ width: 44 }}>{it.time}</T>
            <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: it.tone === 'done' ? DOT.done : colors.white, borderWidth: 2, borderColor: DOT[it.tone] }} />
            <T size={14} weight={it.tone === 'warn' || it.tone === 'wait' ? '600' : '400'} color={it.tone === 'warn' || it.tone === 'wait' ? colors.amberDark : colors.ink} style={{ flex: 1 }}>
              {it.text}
            </T>
          </View>
        ))}
      </Card>

      <Card>
        <T size={16} weight="700">Huyết áp gần đây</T>
        {!bp.length && <T size={14} color={colors.muted}>Chưa có số đo.</T>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: bp.length ? 96 : 0 }}>
          {bp.map((r, i) => {
            const high = isBpHigh(r.sys, r.dia, data.settings);
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <T size={11} color={high ? colors.amberDark : colors.muted} weight={high ? '700' : '400'}>{r.sys}</T>
                <View style={{ width: '100%', height: Math.max(8, (r.sys - 90) * 0.9), borderRadius: 6, backgroundColor: high ? '#E0925A' : '#A9CFC2' }} />
              </View>
            );
          })}
        </View>
        {!!bp.length && <T size={12} color={colors.muted}>Số trên (tâm thu), mmHg. Cam là từ mức {data.settings.bpSys}/{data.settings.bpDia}.</T>}
      </Card>
    </Screen>
  );
}
