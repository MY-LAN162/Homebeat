import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Back, Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { SAMPLE_TRANSCRIPT } from '../../domain/visit';
import { canListen, startListening } from '../../services/listen';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function VisitRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, upsertAppointment } = useStore();
  const a = data.appointments.find((x) => x.id === id);
  const [text, setText] = useState(a?.transcript ?? '');
  const [interim, setInterim] = useState('');
  const [asked, setAsked] = useState<string[]>(a?.asked ?? []);
  const [listening, setListening] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState<string>();
  const stopRef = useRef<(() => void) | undefined>(undefined);
  const baseRef = useRef('');
  const supported = canListen();

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);
  useEffect(() => () => stopRef.current?.(), []);

  if (!a) {
    return (
      <Screen>
        <Back onPress={() => router.back()} />
        <T size={16}>Không tìm thấy lịch khám này.</T>
      </Screen>
    );
  }
  const member = data.members.find((m) => m.id === a.memberId);

  const start = () => {
    setErr(undefined);
    baseRef.current = text ? `${text.trimEnd()}\n` : '';
    stopRef.current = startListening(
      (final, now) => {
        setText(baseRef.current + final);
        setInterim(now);
      },
      (m) => setErr(m),
    );
    setListening(true);
  };
  const stop = () => {
    stopRef.current?.();
    stopRef.current = undefined;
    setListening(false);
    setInterim('');
  };
  const finish = () => {
    stop();
    upsertAppointment({ ...a, transcript: text.trim(), asked });
    router.replace({ pathname: '/child/visit-summary', params: { id: a.id } });
  };

  return (
    <Screen>
      <Back onPress={() => { stop(); router.back(); }} />
      <H1 size={24}>Ghi lại buổi khám</H1>
      <T size={15} color={colors.muted}>{a.title}{member ? ` · ${member.call.toLowerCase()} ${member.name}` : ''}</T>

      <Banner tone="amber">
        <T size={14} color={colors.amberDark} weight="600">Nhớ xin phép bác sĩ trước khi ghi âm.</T>
      </Banner>

      {supported ? (
        <Card style={{ alignItems: 'center', gap: 10, backgroundColor: listening ? colors.redSoft : colors.white }}>
          <T size={14} weight="700" color={listening ? colors.red : colors.muted}>
            {listening ? '● ĐANG NGHE VÀ GHI THÀNH CHỮ' : 'CHƯA GHI'}
          </T>
          <T size={44} weight="700" color={listening ? colors.redDark : colors.ink}>{mmss(secs)}</T>
          <Btn
            variant={listening ? 'danger' : 'primary'}
            label={listening ? 'Tạm dừng' : text ? 'Ghi tiếp' : 'Bắt đầu ghi'}
            onPress={listening ? stop : start}
            style={{ alignSelf: 'stretch' }}
          />
          {err && <T size={14} color={colors.red}>{err}</T>}
        </Card>
      ) : (
        <Banner tone="blue">
          <T size={14} color={colors.blueDark}>
            Máy / trình duyệt này chưa chuyển giọng nói thành chữ được. Ở bản cài trên điện thoại sẽ dùng nhận dạng giọng nói có sẵn của máy (miễn phí). Bây giờ có thể ghi chú tay vào ô bên dưới, hoặc thử bằng lời mẫu.
          </T>
          <Btn variant="secondary" label="Thử với lời bác sĩ mẫu" height={44} size={15} onPress={() => setText(SAMPLE_TRANSCRIPT)} />
        </Banner>
      )}

      <T size={16} weight="700">Lời bác sĩ (sửa được)</T>
      {supported && !text && !listening && (
        <Btn variant="ghost" label="Chưa có bác sĩ? Thử với lời mẫu" height={40} size={15} onPress={() => setText(SAMPLE_TRANSCRIPT)} />
      )}
      <TextInput
        accessibilityLabel="Lời bác sĩ"
        multiline
        value={interim ? `${text}${interim}…` : text}
        onChangeText={setText}
        editable={!listening}
        placeholder="Chữ sẽ hiện ở đây khi ghi. Có thể gõ thêm ghi chú."
        placeholderTextColor={colors.muted}
        style={{ minHeight: 180, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: colors.chipLine, padding: 14, fontSize: 17, lineHeight: 25, color: colors.ink, textAlignVertical: 'top' }}
      />

      {!!a.questions.length && (
        <>
          <View style={{ flexDirection: 'row' }}>
            <T size={16} weight="700" style={{ flex: 1 }}>Câu hỏi đã hỏi</T>
            <T size={16} weight="700" color={colors.green}>{asked.length}/{a.questions.length}</T>
          </View>
          {a.questions.map((q) => {
            const on = asked.includes(q);
            return (
              <Pressable
                key={q}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => setAsked((x) => (on ? x.filter((y) => y !== q) : [...x, q]))}
              >
                <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: on ? colors.greenSoft : colors.white }}>
                  <T size={20} color={on ? colors.green : colors.chipLine}>{on ? '✓' : '○'}</T>
                  <T size={15} style={{ flex: 1 }} color={on ? colors.greenDark : colors.ink}>{q}</T>
                </Card>
              </Pressable>
            );
          })}
        </>
      )}

      <Btn label="Kết thúc và tóm tắt" height={64} size={20} disabled={!text.trim()} onPress={finish} />
    </Screen>
  );
}
