// Trang chủ bố mẹ: những gì con gửi tới, hiện to ở đầu trang.
//  - Lời nhắn của con chưa xem: chữ thật to, tự đọc to một lần, bấm "Đã xem" (con thấy "Bố đã xem").
//  - SOS hôm nay đã có con bấm "Con đã thấy": thẻ xanh để bố mẹ yên tâm.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { dateKey, hm } from '../domain/time';
import type { Member } from '../domain/types';
import { speak } from '../services/speech';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, Card, SpeakButton, T } from './ui';

export function ParentInbox({ m }: { m: Member }) {
  const { data, now, markMessageSeen } = useStore();
  const call = m.call.toLowerCase();
  const unseen = (data.messages ?? []).filter((x) => x.memberId === m.id && !x.seenAt).sort((a, b) => a.at.localeCompare(b.at));
  const acked = [...data.sosEvents]
    .reverse()
    .find((e) => e.memberId === m.id && !e.cancelled && e.ackBy && dateKey(new Date(e.at)) === dateKey(now));

  // Tự đọc to lời nhắn mới (mỗi lời nhắn một lần), trừ khi con đã tắt "tự đọc to".
  const spoken = useRef(new Set<string>());
  const first = unseen[0];
  useEffect(() => {
    if (!first || data.settings.autoSpeak === false || spoken.current.has(first.id)) return;
    spoken.current.add(first.id);
    speak(`${m.self} ${first.from} nhắn ${call}: ${first.text}`);
  }, [first, m.self, call, data.settings.autoSpeak]);

  return (
    <>
      {acked && (
        <Card style={{ backgroundColor: colors.green, gap: 4 }}>
          <T size={22} weight="700" color={colors.white}>
            ✓ {m.self} {acked.ackBy} đã thấy SOS
          </T>
          <T size={18} color={colors.white}>
            Lúc {acked.ackAt ? hm(new Date(acked.ackAt)) : ''}. {m.self} đang lo cho {call}, {call} giữ máy bên cạnh nhé.
          </T>
        </Card>
      )}
      {unseen.map((x) => (
        <Card key={x.id} style={{ gap: 10, borderWidth: 3, borderColor: colors.green }}>
          <T size={17} weight="700" color={colors.greenDark}>
            {m.self} {x.from} nhắn {call} · {hm(new Date(x.at))}
          </T>
          <T size={28} weight="700">“{x.text}”</T>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <SpeakButton text={`${m.self} ${x.from} nhắn ${call}: ${x.text}`} label="🔊 Đọc lại" />
          </View>
          <Btn label="Đã xem" height={64} size={22} onPress={() => markMessageSeen(x.id)} />
        </Card>
      ))}
    </>
  );
}
