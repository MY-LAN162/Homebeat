import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Btn, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { hm } from '../../domain/time';
import { call, getLocation, mapsLink, smsCaregivers } from '../../services/phone';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

const COUNTDOWN = 3;

export default function ParentSos() {
  const { data, startSos, cancelSos } = useStore();
  const m = useCurrentMember();
  const [left, setLeft] = useState(COUNTDOWN);
  const [sentId, setSentId] = useState<string>();
  const [note, setNote] = useState<string>();
  const [outcome, setOutcome] = useState<'calling' | 'sms' | 'failed'>();
  const cancelled = useRef(false);

  const receivers = [...data.caregivers].sort((a, b) => a.order - b.order);
  const first = receivers.find((c) => c.phone);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (left > 0 || sentId || !m || cancelled.current) return;
    (async () => {
      const loc = await getLocation();
      if (cancelled.current) return;
      const id = startSos(m.id, loc);
      setSentId(id);
      const msg = `[An Tâm] ${displayName(m)} bấm SOS lúc ${hm(new Date())}.${loc ? ` Vị trí: ${mapsLink(loc.lat, loc.lng)}` : ''}`;
      const smsOk = await smsCaregivers(receivers, msg).catch(() => false);
      const called = await call(first?.phone).catch(() => false);
      // Chỉ báo "đã gửi" khi thật sự mở được cuộc gọi hoặc tin nhắn.
      setOutcome(called ? 'calling' : smsOk ? 'sms' : 'failed');
      if (!smsOk && !called) setNote('Chưa gửi được: chưa có số điện thoại của các con. Hãy gọi 115 nếu cần cấp cứu, và nhờ con thêm số trong mục Gia đình.');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!m) return null;
  const callName = m.call.toLowerCase();
  const kids = m.self.toLowerCase();

  return (
    <Screen bg={colors.red}>
      <View style={{ alignItems: 'center', gap: 20, paddingTop: 24 }}>
        <T size={20} weight="600" color={colors.white}>
          {outcome === 'failed' ? 'CHƯA GỬI ĐƯỢC' : outcome ? 'ĐÃ GỬI CẢNH BÁO' : 'ĐANG GỬI CẢNH BÁO'}
        </T>
        <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
          <T size={outcome ? 28 : 84} weight="700" color={colors.red} style={{ lineHeight: outcome ? 36 : 96, textAlign: 'center' }}>
            {outcome === 'failed' ? 'Chưa gửi' : outcome ? 'Đã gửi' : String(Math.max(left, 0))}
          </T>
        </View>
        <H1 size={30} color={colors.white}>
          {outcome === 'calling'
            ? `Đang gọi ${first?.name ?? ''}`
            : outcome === 'sms'
              ? `Bấm "Gửi" trong tin nhắn để báo các ${kids}`
              : outcome === 'failed'
                ? `Chưa báo được cho các ${kids}`
                : `Đang gọi các ${kids} cho ${callName}`}
        </H1>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16, gap: 10 }}>
        <T size={18} color={colors.white}>Gửi tới: {receivers.map((c) => c.name).join(', ') || 'chưa có ai'}</T>
        <T size={18} color={colors.white}>Kèm vị trí hiện tại của {callName}</T>
        {first && <T size={18} color={colors.white}>Gọi {first.name} ngay sau khi gửi</T>}
      </View>
      {note && <T size={17} color={colors.white} weight="600">{note}</T>}
      {outcome === 'failed' && (
        <Btn variant="secondary" label="Gọi 115 (cấp cứu)" height={64} size={20} onPress={() => call('115')} />
      )}
      <View style={{ flex: 1 }} />
      <Btn
        variant="light"
        label={`${m.call} ổn, hủy cảnh báo`}
        height={76}
        size={22}
        onPress={() => {
          cancelled.current = true;
          if (sentId) cancelSos(sentId);
          router.back();
        }}
      />
    </Screen>
  );
}
