import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { formatShortDate, hm, isValidTime } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

/** "30/9" -> Date trong năm nay (hoặc năm sau nếu đã qua). */
function parseDay(input: string, time: string, now: Date): Date | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(input.trim());
  if (!m || !isValidTime(time)) return undefined;
  const [h, min] = time.split(':').map(Number);
  const d = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[1]), h, min);
  if (d.getDate() !== Number(m[1])) return undefined;
  if (d < now && now.getTime() - d.getTime() > 180 * 86400_000) d.setFullYear(d.getFullYear() + 1);
  return d;
}

export default function ChildVisits() {
  const { data, now, upsertAppointment } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('08:00');
  const [companion, setCompanion] = useState('');
  const [picked, setMemberId] = useState<string>();
  const memberId = picked ?? data.members[0]?.id;

  const list = [...data.appointments].sort((a, b) => a.at.localeCompare(b.at));
  const upcoming = list.filter((a) => new Date(a.at) >= now);
  const past = list.filter((a) => new Date(a.at) < now).reverse();
  const when = parseDay(day, time, now);
  const name = (id: string) => {
    const m = data.members.find((x) => x.id === id);
    return m ? `${m.call.toLowerCase()} ${m.name}` : '';
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <H1 size={26}>Lịch đi khám</H1>
        <View style={{ flex: 1 }} />
        {!adding && <Btn label="+ Thêm lịch" height={40} size={14} onPress={() => setAdding(true)} />}
      </View>

      {adding && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {data.members.map((m) => (
              <Chip key={m.id} label={displayName(m)} on={memberId === m.id} onPress={() => setMemberId(m.id)} />
            ))}
          </View>
          <Field label="Khám gì" value={title} onChange={setTitle} placeholder="Ví dụ: Tái khám tim mạch" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Ngày (ngày/tháng)" value={day} onChange={setDay} placeholder="30/9" /></View>
            <View style={{ flex: 1 }}><Field label="Giờ" value={time} onChange={setTime} placeholder="08:00" /></View>
          </View>
          <Field label="Ai đưa đi" value={companion} onChange={setCompanion} placeholder="Ví dụ: Hà" />
          <Btn
            label="Lưu lịch khám"
            disabled={!title.trim() || !when || !memberId}
            onPress={() => {
              if (!when || !memberId) return;
              upsertAppointment({ memberId, title: title.trim(), at: when.toISOString(), companion: companion.trim() || undefined, questions: [] });
              setAdding(false);
              setTitle('');
              setDay('');
            }}
          />
          <Btn variant="ghost" label="Hủy" onPress={() => setAdding(false)} />
        </Card>
      )}

      <T size={13} weight="700" color={colors.muted}>SẮP TỚI</T>
      {!upcoming.length && <T size={14} color={colors.muted}>Chưa có lịch.</T>}
      {upcoming.map((a) => {
        const d = new Date(a.at);
        const days = Math.ceil((d.getTime() - now.getTime()) / 86400_000);
        return (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.title}. Chuẩn bị đi khám`} onPress={() => router.push({ pathname: '/child/visit-prep', params: { id: a.id } })}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: days <= 7 ? 2 : 0, borderColor: colors.blue }}>
            <View style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
              <T size={20} weight="700" color={colors.white}>{d.getDate()}/{d.getMonth() + 1}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={16} weight="700">{a.title} · {name(a.memberId)}</T>
              <T size={13} color={colors.muted}>
                {formatShortDate(d)} {hm(d)}{a.companion ? ` · ${a.companion} đưa đi` : ' · chưa có người đưa đi'} · còn {days} ngày
              </T>
              <T size={14} weight="700" color={colors.blue}>
                {a.questions.length ? `${a.questions.length} câu hỏi cho bác sĩ` : 'Chuẩn bị câu hỏi'} ›
              </T>
            </View>
          </Card>
          </Pressable>
        );
      })}

      {!!past.length && <T size={13} weight="700" color={colors.muted}>ĐÃ KHÁM</T>}
      {past.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: a.transcript ? '/child/visit-summary' : '/child/visit-prep', params: { id: a.id } })}
        >
          <Card>
            <T size={15} weight="700">{a.title} · {name(a.memberId)}</T>
            <T size={13} color={colors.muted}>{formatShortDate(new Date(a.at))}</T>
            <T size={14} weight="700" color={colors.green}>{a.transcript ? 'Xem tóm tắt buổi khám ›' : 'Ghi lại buổi khám ›'}</T>
          </Card>
        </Pressable>
      ))}

    </Screen>
  );
}
