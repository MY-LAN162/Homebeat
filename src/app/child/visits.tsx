import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { VisitForm } from '../../components/VisitForm';
import { Btn, Card, H1, Screen, T } from '../../components/ui';
import { formatShortDate, hm } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ChildVisits() {
  const { data, now } = useStore();
  const params = useLocalSearchParams<{ edit?: string }>();
  const [adding, setAdding] = useState(false);
  // Sửa lịch khám: mở từ màn "Chuẩn bị đi khám" (?edit=<id>). Bấm Lưu/Hủy thì bỏ qua tham số.
  const [doneEdit, setDoneEdit] = useState<string>();
  const editing = params.edit && params.edit !== doneEdit ? data.appointments.find((a) => a.id === params.edit) : undefined;

  const list = [...data.appointments].sort((a, b) => a.at.localeCompare(b.at));
  const upcoming = list.filter((a) => new Date(a.at) >= now);
  const past = list.filter((a) => new Date(a.at) < now).reverse();
  const name = (id: string) => {
    const m = data.members.find((x) => x.id === id);
    return m ? `${m.call.toLowerCase()} ${m.name}` : '';
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <H1 size={26}>Lịch đi khám</H1>
        <View style={{ flex: 1 }} />
        {!adding && !editing && <Btn label="+ Thêm lịch" height={40} size={14} onPress={() => setAdding(true)} />}
      </View>

      {editing ? (
        <VisitForm key={editing.id} existing={editing} onDone={() => { setDoneEdit(editing.id); router.setParams({ edit: '' }); }} />
      ) : (
        adding && <VisitForm onDone={() => setAdding(false)} />
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
                {formatShortDate(d)} {hm(d)}{a.place ? ` · ${a.place}` : ''}{a.companion ? ` · ${a.companion} đưa đi` : ' · chưa có người đưa đi'} · còn {days} ngày
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
