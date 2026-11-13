// Sửa thông tin và hồ sơ sức khỏe của bố mẹ.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { HealthForm } from '../../components/HealthForm';
import { whenReady } from '../../components/WhenReady';
import { Back, Btn, Card, Field, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { healthPatch, type HealthInfo } from '../../domain/health';
import { goBack } from '../../services/nav';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function MemberEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, updateMember } = useStore();
  const m = data.members.find((x) => x.id === id);
  const [name, setName] = useState(m?.name ?? '');
  const [phone, setPhone] = useState(m?.phone ?? '');
  const [health, setHealth] = useState<HealthInfo>(() => ({
    birthYear: m?.birthYear,
    conditions: m?.conditions,
    allergies: m?.allergies,
    bloodType: m?.bloodType,
    insurance: m?.insurance,
    hospital: m?.hospital,
    address: m?.address,
  }));
  if (!m) return null;
  const back = () => goBack(`/child/member/${m.id}`);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={back} />
        <H1 size={24}>Hồ sơ {displayName(m)}</H1>
      </View>
      <Card style={{ gap: 12 }}>
        <Field label="Tên" value={name} onChange={setName} />
        <Field label={`Số điện thoại của ${m.call.toLowerCase()}`} value={phone} onChange={setPhone} keyboard="phone-pad" />
      </Card>
      <Card style={{ gap: 8 }}>
        <T size={16} weight="700">Sức khỏe</T>
        <T size={13} color={colors.muted}>
          Không bắt buộc. Khi {m.call.toLowerCase()} bấm SOS, máy {m.call.toLowerCase()} hiện các thông tin này để đưa cho người cấp cứu. Chỉ người trong gia đình xem được.
        </T>
        <HealthForm value={health} onChange={setHealth} call={m.call} />
      </Card>
      <Btn
        label="Lưu"
        disabled={!name.trim()}
        onPress={() => {
          updateMember(m.id, { name: name.trim(), phone: phone.trim() || undefined, ...healthPatch(health) });
          back();
        }}
      />
    </Screen>
  );
}

export default whenReady(MemberEdit);
