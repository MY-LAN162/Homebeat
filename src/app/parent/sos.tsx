// SOS: đếm ngược 3 giây để kịp hủy, rồi ghi nhận SOS (máy con thấy qua đồng bộ), gọi người đầu tiên,
// và cho gửi tin nhắn kèm vị trí. Mỗi dòng trạng thái chỉ ghi đúng điều đã xảy ra: không báo "đã gửi"
// khi tin nhắn mới chỉ được mở ra.

import { goBack } from '../../services/nav';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Btn, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { hm } from '../../domain/time';
import { call, getLocation, mapsLink, smsCaregivers } from '../../services/phone';
import { track } from '../../services/usage';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

const COUNTDOWN = 3;
type SmsState = 'sent' | 'opened' | 'cancelled' | 'unavailable';

function Line({ ok, text }: { ok: boolean | undefined; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <T size={20} weight="700" color={colors.white}>{ok === undefined ? '…' : ok ? '✓' : '✕'}</T>
      <T size={18} color={colors.white} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

export default function ParentSos() {
  const { data, startSos, cancelSos, syncEnabled } = useStore();
  const m = useCurrentMember();
  const [left, setLeft] = useState(COUNTDOWN);
  const [sentId, setSentId] = useState<string>();
  const [loc, setLoc] = useState<{ lat: number; lng: number }>();
  const [called, setCalled] = useState<string>();
  const [callTried, setCallTried] = useState(false);
  const [sms, setSms] = useState<SmsState>();
  const cancelled = useRef(false);

  const receivers = [...data.caregivers].sort((a, b) => a.order - b.order).filter((c) => c.phone);
  const synced = syncEnabled && !!data.familyId && !data.demo;

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (left > 0 || sentId || !m || cancelled.current) return;
    (async () => {
      const where = await getLocation();
      if (cancelled.current) return;
      setLoc(where);
      setSentId(startSos(m.id, where));
      track('sos_sent');
      const first = receivers[0];
      if (first) {
        const ok = await call(first.phone).catch(() => false);
        if (ok) setCalled(first.name);
      }
      setCallTried(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const ack = sentId ? data.sosEvents.find((e) => e.id === sentId) : undefined;
  if (!m) return null;
  const callName = m.call.toLowerCase();
  const kids = m.self.toLowerCase();
  const counting = left > 0 && !sentId;
  const reached = !!called || sms === 'sent' || synced;
  const message = `[An Tâm] ${displayName(m)} bấm SOS lúc ${hm(new Date())}.${loc ? ` Vị trí: ${mapsLink(loc.lat, loc.lng)}` : ''}`;
  const next = receivers.filter((c) => c.name !== called);

  return (
    <Screen bg={colors.red}>
      <View style={{ alignItems: 'center', gap: 16, paddingTop: 16 }}>
        <T size={20} weight="600" color={colors.white}>
          {counting ? 'SẮP GỬI SOS' : !callTried ? 'ĐANG GỬI SOS' : reached ? 'ĐÃ BÁO SOS' : 'CHƯA BÁO ĐƯỢC CHO AI'}
        </T>
        {counting && (
          <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <T size={84} weight="700" color={colors.red} style={{ lineHeight: 96 }}>{String(left)}</T>
          </View>
        )}
        <H1 size={28} color={colors.white}>
          {counting ? `Bấm nút trắng bên dưới nếu ${callName} bấm nhầm` : `Giữ bình tĩnh, ${callName} nhé`}
        </H1>
      </View>

      {!counting && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16, gap: 12 }}>
          <Line ok={sentId ? true : undefined} text={synced ? `Đã báo SOS lên app An Tâm của các ${kids}` : 'Đã ghi lại SOS trên máy này'} />
          <Line
            ok={callTried ? !!called : undefined}
            text={!callTried ? 'Đang gọi...' : called ? `Đã mở cuộc gọi cho ${called}` : `Chưa gọi được: chưa có số điện thoại của các ${kids}`}
          />
          {receivers.length > 0 && (
          <Line
            ok={sms === undefined ? undefined : sms === 'sent'}
            text={
              sms === undefined
                ? 'Tin nhắn kèm vị trí: chưa gửi'
                : sms === 'sent'
                  ? 'Đã gửi tin nhắn kèm vị trí'
                  : sms === 'opened'
                    ? 'Đã mở tin nhắn. Nếu chưa bấm "Gửi" thì bấm nút bên dưới để gửi lại'
                    : sms === 'cancelled'
                      ? 'Chưa gửi tin nhắn'
                      : 'Máy này không gửi tin nhắn được'
            }
          />
          )}
          {!loc && sentId && <T size={15} color={colors.white}>Không lấy được vị trí (chưa cho phép hoặc mất GPS).</T>}
          {ack?.ackBy && <Line ok text={`${m.self} ${ack.ackBy} đã thấy lúc ${ack.ackAt ? hm(new Date(ack.ackAt)) : ''}, đang lo cho ${callName}`} />}
        </View>
      )}

      {!counting && receivers.length > 0 && sms !== 'sent' && (
        <Btn
          variant="light"
          label={`Gửi tin nhắn kèm vị trí cho các ${kids}`}
          height={64}
          size={19}
          onPress={() => smsCaregivers(receivers, message).then(setSms).catch(() => setSms('unavailable'))}
        />
      )}
      {!counting &&
        next.slice(0, 2).map((c) => (
          <Btn key={c.id} variant="secondary" label={`Gọi ${c.name}`} height={60} size={19} onPress={() => call(c.phone).then((ok) => ok && setCalled(c.name))} />
        ))}
      {!counting && <Btn variant="secondary" label="Gọi 115 (cấp cứu)" height={60} size={19} onPress={() => call('115')} />}

      <View style={{ flex: 1 }} />
      <Btn
        variant="light"
        label={counting ? `${m.call} bấm nhầm, hủy` : `${m.call} ổn rồi, hủy cảnh báo`}
        height={76}
        size={22}
        onPress={() => {
          cancelled.current = true;
          if (sentId) cancelSos(sentId);
          track('sos_cancelled');
          goBack('/parent');
        }}
      />
    </Screen>
  );
}
