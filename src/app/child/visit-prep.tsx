import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Back, Btn, Card, Field, H1, Screen, T } from '../../components/ui';
import { BRING_LIST, suggestQuestions } from '../../domain/visit';
import { formatShortDate, hm } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function Check({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: on ? colors.green : colors.chipLine,
          backgroundColor: on ? colors.green : colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <T size={16} weight="700" color={colors.white}>✓</T>}
      </View>
      <T size={16} style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none' }} color={on ? colors.muted : colors.ink}>
        {label}
      </T>
    </Pressable>
  );
}

export default function VisitPrep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, now, upsertAppointment } = useStore();
  const a = data.appointments.find((x) => x.id === id);
  const [newQ, setNewQ] = useState('');
  const [packed, setPacked] = useState<string[]>([]);

  if (!a) {
    return (
      <Screen>
        <Back onPress={() => router.back()} />
        <T size={16}>Không tìm thấy lịch khám này.</T>
      </Screen>
    );
  }
  const member = data.members.find((m) => m.id === a.memberId);
  const d = new Date(a.at);
  const days = Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400_000);
  const suggestions = suggestQuestions(data, a.memberId, now).filter((s) => !a.questions.includes(s.q));
  const save = (patch: Partial<typeof a>) => upsertAppointment({ ...a, ...patch });
  const addQ = (q: string) => q.trim() && save({ questions: [...a.questions, q.trim()] });

  return (
    <Screen>
      <Back onPress={() => router.back()} />
      <H1 size={24}>Chuẩn bị đi khám</H1>
      <Card style={{ gap: 4, backgroundColor: colors.blue }}>
        <T size={13} weight="700" color="#CFE0F5">
          {days > 0 ? `CÒN ${days} NGÀY` : days === 0 ? 'HÔM NAY' : 'ĐÃ QUA'}
        </T>
        <T size={19} weight="700" color={colors.white}>
          {a.title}{member ? ` · ${member.call.toLowerCase()} ${member.name}` : ''}
        </T>
        <T size={15} color="#E1EAF6">
          {formatShortDate(d)} · {hm(d)}{a.place ? ` · ${a.place}` : ''}
        </T>
        {a.companion && <T size={15} color="#E1EAF6">{a.companion} đưa đi</T>}
      </Card>

      <T size={17} weight="700">Câu hỏi cho bác sĩ</T>
      {a.questions.map((q) => (
        <Card key={q} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={16} style={{ flex: 1 }}>{q}</T>
          <Btn variant="ghost" label="Bỏ" height={36} size={14} onPress={() => save({ questions: a.questions.filter((x) => x !== q) })} />
        </Card>
      ))}
      {!a.questions.length && <T size={15} color={colors.muted}>Chưa có câu hỏi. Thêm từ gợi ý bên dưới hoặc tự gõ.</T>}

      {!!suggestions.length && (
        <Card style={{ gap: 10, backgroundColor: colors.greenSoft }}>
          <T size={14} weight="700" color={colors.greenDark}>GỢI Ý TỪ NHẬT KÝ CỦA {member?.call.toUpperCase() ?? 'BỐ MẸ'}</T>
          {suggestions.map((s) => (
            <View key={s.q} style={{ gap: 4 }}>
              <T size={16}>{s.q}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <T size={13} color={colors.muted} style={{ flex: 1 }}>Vì: {s.why}</T>
                <Btn label="+ Thêm" height={38} size={14} onPress={() => addQ(s.q)} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Field label="Tự thêm câu hỏi" value={newQ} onChange={setNewQ} placeholder="Ví dụ: Có cần kiêng muối không?" />
      <Btn
        variant="secondary"
        label="+ Thêm câu hỏi"
        disabled={!newQ.trim()}
        onPress={() => {
          addQ(newQ);
          setNewQ('');
        }}
      />

      <Btn
        variant="secondary"
        label="Bảng huyết áp, uống thuốc 30 ngày cho bác sĩ"
        height={48}
        size={15}
        onPress={() => router.push({ pathname: '/child/report', params: { memberId: a.memberId } })}
      />

      <T size={17} weight="700">Nhớ mang theo</T>
      <Card style={{ gap: 0 }}>
        {(a.bring ?? BRING_LIST).map((b) => (
          <Check key={b} label={b} on={packed.includes(b)} onPress={() => setPacked((p) => (p.includes(b) ? p.filter((x) => x !== b) : [...p, b]))} />
        ))}
      </Card>

      {a.transcript ? (
        <>
          <Btn label="Xem tóm tắt buổi khám" onPress={() => router.push({ pathname: '/child/visit-summary', params: { id: a.id } })} />
          <Btn variant="secondary" label="Ghi tiếp buổi khám" onPress={() => router.push({ pathname: '/child/visit-record', params: { id: a.id } })} />
        </>
      ) : (
        <Btn label="Bắt đầu buổi khám" height={64} size={20} onPress={() => router.push({ pathname: '/child/visit-record', params: { id: a.id } })} />
      )}
    </Screen>
  );
}
