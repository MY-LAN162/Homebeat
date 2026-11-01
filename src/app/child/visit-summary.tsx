import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { notify } from '../../services/dialog';
import { Back, Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { formatShortDate } from '../../domain/time';
import { applyMedChange, summarizeVisit, summaryText } from '../../domain/visit';
import { track } from '../../services/usage';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 8 }}>
      <T size={14} weight="700" color={colors.muted}>{title.toUpperCase()}</T>
      {children}
    </Card>
  );
}

export default function VisitSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, upsertAppointment, upsertMedication } = useStore();
  const [applied, setApplied] = useState<string[]>([]);
  const a = data.appointments.find((x) => x.id === id);

  if (!a) {
    return (
      <Screen>
        <Back onPress={() => router.back()} />
        <T size={16}>Không tìm thấy lịch khám này.</T>
      </Screen>
    );
  }
  const member = data.members.find((m) => m.id === a.memberId);
  const meds = data.medications.filter((m) => m.memberId === a.memberId);
  const s = summarizeVisit(a.transcript ?? '', meds);
  const when = formatShortDate(new Date(a.at));
  const empty = !s.notes.length && !s.medChanges.length && !s.todos.length && !s.nextVisit;

  const nextVisitExists =
    s.nextVisit &&
    data.appointments.some((x) => {
      const d = new Date(x.at);
      return x.memberId === a.memberId && d.getDate() === s.nextVisit!.day && d.getMonth() + 1 === s.nextVisit!.month;
    });

  const addNextVisit = () => {
    if (!s.nextVisit) return;
    const prev = new Date(a.at);
    const d = new Date(prev.getFullYear(), s.nextVisit.month - 1, s.nextVisit.day, prev.getHours(), prev.getMinutes());
    if (d < prev) d.setFullYear(d.getFullYear() + 1);
    upsertAppointment({ memberId: a.memberId, title: a.title, at: d.toISOString(), place: a.place, companion: a.companion, questions: [] });
  };

  return (
    <Screen>
      <Back onPress={() => router.back()} />
      <H1 size={24}>Tóm tắt buổi khám</H1>
      <T size={15} color={colors.muted}>
        {when} · {a.title}{member ? ` · ${member.call.toLowerCase()} ${member.name}` : ''}
      </T>

      {empty && (
        <Banner tone="amber">
          <T size={15} color={colors.amberDark}>
            Chưa tìm thấy nội dung để tóm tắt. Có thể ghi thêm lời bác sĩ rồi tóm tắt lại.
          </T>
        </Banner>
      )}

      {!!s.notes.length && (
        <Section title="Bác sĩ nói gì">
          {s.notes.map((n) => <T key={n} size={16}>• {n}</T>)}
        </Section>
      )}

      {!!s.medChanges.length && (
        <Section title="Thay đổi thuốc">
          {s.medChanges.map((c) => {
            const med = meds.find((m) => m.id === c.medId);
            const done = applied.includes(c.sentence);
            return (
              <View key={c.sentence} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <T size={17} weight="700">{c.name}</T>
                  {c.from && <T size={17} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>{c.from}</T>}
                  <T size={17}>→</T>
                  <T size={17} weight="700" color={colors.green}>{c.to}</T>
                </View>
                <T size={13} color={colors.muted}>“{c.sentence}”</T>
                {med ? (
                  <Btn
                    variant={done ? 'secondary' : 'primary'}
                    disabled={done}
                    label={done ? 'Đã cập nhật lịch nhắc' : 'Cập nhật lịch nhắc thuốc'}
                    height={48}
                    size={16}
                    onPress={() => {
                      upsertMedication(applyMedChange(med, c));
                      setApplied((x) => [...x, c.sentence]);
                    }}
                  />
                ) : (
                  <T size={14} color={colors.amberDark}>Thuốc này chưa có trong danh sách thuốc của {member?.call.toLowerCase() ?? 'bố mẹ'}.</T>
                )}
              </View>
            );
          })}
        </Section>
      )}

      {(!!s.todos.length || s.nextVisit) && (
        <Section title="Việc cần làm">
          {s.todos.map((t) => <T key={t} size={16}>☐ {t}</T>)}
          {s.nextVisit && (
            <View style={{ gap: 6 }}>
              <T size={16} weight="700">Tái khám: {s.nextVisit.day}/{s.nextVisit.month}</T>
              {nextVisitExists ? (
                <T size={14} color={colors.greenDark}>✓ Đã có trong lịch đi khám</T>
              ) : (
                <Btn variant="secondary" label="Thêm vào lịch đi khám" height={44} size={15} onPress={addNextVisit} />
              )}
            </View>
          )}
        </Section>
      )}

      {!empty && (
        <Btn
          variant="blue"
          label="Gửi cho cả nhà (Zalo, tin nhắn...)"
          onPress={() => Share.share({ message: summaryText(a.title, when, s) }).then(() => track('summary_shared')).catch(() => notify('Chưa gửi được', 'Thử lại sau nhé.'))}
        />
      )}
      <Btn variant="ghost" label="Sửa lời ghi" onPress={() => router.replace({ pathname: '/child/visit-record', params: { id: a.id } })} />
      <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>
        Bản tóm tắt do máy tự lọc từ lời ghi, có thể sót hoặc sai. Hãy hỏi lại bác sĩ nếu có điểm chưa rõ.
      </T>
    </Screen>
  );
}
