import { whenReady } from '../../components/WhenReady';

import { goBack } from '../../services/nav';
import { useState } from 'react';
import { View } from 'react-native';
import { Back, Banner, Btn, Card, H1, Screen, Stepper, T } from '../../components/ui';
import { formatShortDate, hm } from '../../domain/time';
import { isBpHigh } from '../../domain/alerts';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

function ParentBp() {
  const { data, addBp } = useStore();
  const m = useCurrentMember();
  const last = [...data.bpReadings].reverse().find((r) => r.memberId === m?.id);
  const [sys, setSys] = useState(last?.sys ?? 130);
  const [dia, setDia] = useState(last?.dia ?? 80);
  const [pulse, setPulse] = useState(last?.pulse ?? 75);
  if (!m) return null;
  const s = data.settings;
  const high = isBpHigh(sys, dia, s);
  const recent = data.bpReadings.filter((r) => r.memberId === m.id).slice(-3).reverse();
  // So với lần đo trước, nói bằng lời cho dễ hiểu.
  const cmp = last ? (sys < last.sys - 4 ? 'Số trên thấp hơn lần trước.' : sys > last.sys + 4 ? 'Số trên cao hơn lần trước.' : 'Gần bằng lần trước.') : undefined;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/parent')} />
        <H1 size={26}>Huyết áp hôm nay</H1>
      </View>
      <T size={17} color={colors.muted}>{m.call} nhìn máy đo, bấm vào số để gõ, hoặc giữ nút + / − cho số chạy nhanh.</T>
      <Stepper label="Số trên" sub="Tâm thu (SYS)" value={sys} onChange={setSys} />
      <Stepper label="Số dưới" sub="Tâm trương (DIA)" value={dia} onChange={setDia} />
      <Stepper label="Nhịp tim" sub="Mạch (PUL)" value={pulse} onChange={setPulse} min={30} max={200} />
      <Banner tone={high ? 'amber' : 'green'}>
        <T size={16} weight="600" color={high ? colors.amberDark : colors.greenDark}>
          {high
            ? `Từ mức ${s.bpSys}/${s.bpDia} các ${m.self.toLowerCase()} đã đặt. An Tâm sẽ báo cho các ${m.self.toLowerCase()}.`
            : `Dưới mức ${s.bpSys}/${s.bpDia} các ${m.self.toLowerCase()} đã đặt.`}
        </T>
      </Banner>
      {recent.length > 0 && (
        <Card style={{ gap: 4 }}>
          <T size={17} weight="700">Mấy lần đo trước</T>
          {recent.map((r) => (
            <T key={r.at} size={18}>
              {formatShortDate(new Date(r.at))} {hm(new Date(r.at))}: <T size={18} weight="700" color={isBpHigh(r.sys, r.dia, s) ? colors.amberDark : colors.ink}>{r.sys}/{r.dia}</T>
            </T>
          ))}
          {cmp && <T size={17} color={colors.muted}>{cmp}</T>}
        </Card>
      )}
      <View style={{ flex: 1 }} />
      <Btn
        label={`Lưu và gửi cho các ${m.self.toLowerCase()}`}
        height={72}
        size={21}
        onPress={() => {
          addBp(m.id, sys, dia, pulse);
          goBack('/parent');
        }}
      />
    </Screen>
  );
}

export default whenReady(ParentBp);
