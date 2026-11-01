
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { View } from 'react-native';
import { Back, Banner, Btn, H1, Screen, Stepper, T } from '../../components/ui';
import { isBpHigh } from '../../domain/alerts';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ParentBp() {
  const { data, addBp } = useStore();
  const m = useCurrentMember();
  const last = [...data.bpReadings].reverse().find((r) => r.memberId === m?.id);
  const [sys, setSys] = useState(last?.sys ?? 130);
  const [dia, setDia] = useState(last?.dia ?? 80);
  const [pulse, setPulse] = useState(last?.pulse ?? 75);
  if (!m) return null;
  const s = data.settings;
  const high = isBpHigh(sys, dia, s);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/parent')} />
        <H1 size={26}>Huyết áp hôm nay</H1>
      </View>
      <T size={17} color={colors.muted}>{m.call} nhìn máy đo, bấm + hoặc − cho đúng 3 số.</T>
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
