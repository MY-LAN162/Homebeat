// Con nhắn bố/mẹ: chọn câu có sẵn hoặc tự gõ (tối đa 100 chữ). Máy bố mẹ hiện chữ thật to, tự đọc to,
// bố mẹ bấm "Đã xem" thì ở đây hiện "Đã xem lúc ...".
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Back, Banner, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { formatShortDate, hm } from '../../domain/time';
import type { Member } from '../../domain/types';
import { goBack } from '../../services/nav';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export const MAX_MESSAGE = 100;

/** Câu nhắn có sẵn, theo cách gọi / xưng của gia đình. */
export function presetMessages(m: Member): string[] {
  const c = m.call.toLowerCase();
  const s = m.self;
  return [
    `${m.call} nhớ uống thuốc nhé`,
    `${s} sẽ gọi lại cho ${c} tối nay`,
    `Cuối tuần ${s.toLowerCase()} về thăm ${c}`,
    `${m.call} gọi cho ${s.toLowerCase()} khi rảnh nhé`,
    `${s} thương ${c} nhiều`,
  ];
}

export default function MessageScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const { data, sendMessage, syncEnabled } = useStore();
  // Tính lúc vẽ (không giữ sẵn), để mở thẳng trang này lúc dữ liệu chưa tải xong vẫn đúng người.
  const [picked, setPick] = useState<string>();
  const m = data.members.find((x) => x.id === (picked ?? memberId)) ?? data.members[0];
  const senders = [...data.caregivers].sort((a, b) => a.order - b.order).filter((c) => !c.sosOnly).map((c) => c.name);
  const [typedFrom, setFrom] = useState<string>();
  const from = typedFrom ?? data.myName ?? senders[0] ?? '';
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  if (!m) {
    return (
      <Screen>
        <Back onPress={() => goBack('/child')} />
        <T size={16}>Chưa có bố mẹ trong gia đình.</T>
      </Screen>
    );
  }
  const call = m.call.toLowerCase();
  const history = (data.messages ?? []).filter((x) => x.memberId === m.id).slice(-5).reverse();
  const linked = syncEnabled && !!data.familyId && !data.demo;
  const ok = text.trim().length > 0 && from.trim().length > 0;

  return (
    <Screen>
      <Back onPress={() => goBack('/child')} />
      <H1 size={24}>Nhắn {call}</H1>
      <T size={15} color={colors.muted}>
        Máy của {call} sẽ kêu, hiện chữ thật to và tự đọc to. {m.call} chỉ cần bấm “Đã xem”.
      </T>

      {data.members.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {data.members.map((x) => (
            <Chip key={x.id} label={displayName(x)} on={x.id === m.id} onPress={() => { setPick(x.id); setSent(false); }} />
          ))}
        </View>
      )}

      <T size={15} weight="700">Chọn nhanh</T>
      <View style={{ gap: 8 }}>
        {presetMessages(m).map((p) => (
          <Chip key={p} label={p} on={text === p} onPress={() => { setText(p); setSent(false); }} />
        ))}
      </View>

      <Field label={`Hoặc tự viết (tối đa ${MAX_MESSAGE} chữ)`} value={text} onChange={(v) => { setText(v.slice(0, MAX_MESSAGE)); setSent(false); }} placeholder={`Ví dụ: Mai ${m.self.toLowerCase()} gửi thuốc về`} />
      <T size={13} color={colors.muted} style={{ textAlign: 'right' }}>{text.length}/{MAX_MESSAGE}</T>

      {senders.length > 1 && (
        <>
          <T size={15} weight="700">Ký tên</T>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {senders.map((n) => <Chip key={n} label={n} on={from === n} onPress={() => setFrom(n)} />)}
          </View>
        </>
      )}
      {!senders.length && <Field maxLength={60} label="Tên của bạn" value={from} onChange={setFrom} placeholder="Ví dụ: Hà" />}

      {sent ? (
        <Banner tone="green">
          <T size={16} weight="700" color={colors.greenDark}>
            ✓ {linked ? `Đã gửi. Khi ${call} bấm “Đã xem”, bên dưới sẽ hiện giờ xem.` : 'Đã lưu (bản thử: chưa nối máy của bố mẹ nên chưa gửi đi).'}
          </T>
        </Banner>
      ) : (
        <Btn
          label={`Gửi cho ${call}`}
          disabled={!ok}
          onPress={() => {
            sendMessage(m.id, text, from.trim());
            setText('');
            setSent(true);
          }}
        />
      )}

      {history.length > 0 && (
        <Card style={{ gap: 8 }}>
          <T size={14} weight="700" color={colors.muted}>ĐÃ NHẮN GẦN ĐÂY</T>
          {history.map((x) => (
            <View key={x.id} style={{ gap: 2, borderTopWidth: 1, borderColor: colors.line, paddingTop: 6 }}>
              <T size={15}>“{x.text}”</T>
              <T size={13} color={x.seenAt ? colors.greenDark : colors.muted}>
                {x.from} · {formatShortDate(new Date(x.at))} {hm(new Date(x.at))} ·{' '}
                {x.seenAt ? `✓ ${m.call} đã xem lúc ${hm(new Date(x.seenAt))}` : `${m.call} chưa xem`}
              </T>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
