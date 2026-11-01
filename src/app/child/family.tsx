import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { confirm, notify } from '../../services/dialog';
import { Btn, Card, Field, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { formatCode } from '../../domain/pairing';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ChildFamily() {
  const { data, newPairing, upsertCaregiver, removeCaregiver, updateMember, setRole, setCurrentMember, loadDemo, reset } = useStore();
  const [adding, setAdding] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [sosOnly, setSosOnly] = useState(false);
  const caregivers = [...data.caregivers].sort((a, b) => a.order - b.order);

  return (
    <Screen>
      <H1 size={26}>Gia đình</H1>

      <T size={13} weight="700" color={colors.muted}>NGƯỜI ĐƯỢC CHĂM SÓC</T>
      {data.members.map((m) => {
        const p = data.pairing?.memberId === m.id ? data.pairing : undefined;
        return (
          <Card key={m.id}>
            <T size={16} weight="700">{displayName(m)}</T>
            <T size={13} color={colors.muted}>App gọi “{m.call.toLowerCase()}”, xưng “{m.self.toLowerCase()}”</T>
            <Field label="Số điện thoại" value={m.phone ?? ''} onChange={(v) => updateMember(m.id, { phone: v })} keyboard="phone-pad" />
            {p ? (
              <T size={15} weight="700" color={colors.green}>Mã kết nối: {formatCode(p.code)}</T>
            ) : (
              <Btn variant="secondary" label="Tạo mã kết nối mới" height={44} size={14} onPress={() =>
                  newPairing(m.id).catch(() => notify('Chưa tạo được mã', 'Kiểm tra kết nối mạng rồi thử lại.'))
                } />
            )}
          </Card>
        );
      })}
      <Btn variant="ghost" label="+ Thêm bố, mẹ, ông, bà" onPress={() => router.push('/onboarding/invite')} />

      <T size={13} weight="700" color={colors.muted}>NHẬN CẢNH BÁO (THEO THỨ TỰ)</T>
      <Card style={{ gap: 10 }}>
        {caregivers.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.sosOnly ? colors.amber : colors.green, alignItems: 'center', justifyContent: 'center' }}>
              <T size={14} weight="700" color={colors.white}>{i + 1}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={15} weight="700">{c.name}</T>
              <T size={13} color={colors.muted}>{c.phone || 'Chưa có số'}{c.sosOnly ? ' · chỉ khi SOS' : ''}</T>
            </View>
            <Btn variant="ghost" label="Bỏ" height={36} size={13} onPress={() =>
              confirm(`Bỏ ${c.name}?`, `${c.name} sẽ không nhận cảnh báo nữa.`, 'Bỏ').then((ok) => ok && removeCaregiver(c.id))
            } />
          </View>
        ))}
        {adding ? (
          <View style={{ gap: 8 }}>
            <Field label="Tên" value={cName} onChange={setCName} />
            <Field label="Số điện thoại" value={cPhone} onChange={setCPhone} keyboard="phone-pad" />
            <Btn variant="secondary" height={44} size={14} label={sosOnly ? 'Chỉ báo khi SOS: Có' : 'Chỉ báo khi SOS: Không'} onPress={() => setSosOnly((x) => !x)} />
            <Btn
              label="Thêm"
              disabled={!cName.trim()}
              onPress={() => {
                upsertCaregiver({ name: cName.trim(), phone: cPhone.trim(), order: caregivers.length + 1, sosOnly });
                setAdding(false);
                setCName('');
                setCPhone('');
                setSosOnly(false);
              }}
            />
          </View>
        ) : (
          <Btn variant="ghost" label="+ Thêm người nhận cảnh báo" onPress={() => setAdding(true)} />
        )}
      </Card>

      <Btn variant="secondary" label="Cài đặt (cảnh báo, cỡ chữ)" onPress={() => router.push('/child/settings')} />

      <T size={13} weight="700" color={colors.muted}>BẢN THỬ</T>
      <Card style={{ gap: 8 }}>
        <T size={13} color={colors.muted}>Chưa có máy chủ đồng bộ, nên có thể thử cả hai vai trò trên một máy.</T>
        {data.members.map((m) => (
          <Btn
            key={m.id}
            variant="secondary"
            height={44}
            size={14}
            label={`Xem màn hình của ${m.call.toLowerCase()} ${m.name}`}
            onPress={() => {
              setCurrentMember(m.id);
              setRole('parent');
              router.replace('/parent');
            }}
          />
        ))}
        <Btn variant="ghost" height={40} size={14} label="Nạp dữ liệu mẫu" onPress={loadDemo} />
        <Btn
          variant="ghost"
          height={40}
          size={14}
          label="Xóa toàn bộ dữ liệu"
          onPress={() =>
            confirm('Xóa toàn bộ dữ liệu?', 'Không khôi phục được.', 'Xóa').then((ok) => {
              if (!ok) return;
              reset();
              router.replace('/');
            })
          }
        />
      </Card>
    </Screen>
  );
}
