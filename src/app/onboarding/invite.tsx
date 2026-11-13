import { router } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { notify } from '../../services/dialog';
import { HealthForm } from '../../components/HealthForm';
import { NotifCard } from '../../components/NotifCard';
import { cleanHealth, type HealthInfo } from '../../domain/health';
import { Back, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { medPrompt, okLabel } from '../../domain/address';
import { formatCode } from '../../domain/pairing';
import type { CallName, SelfName } from '../../domain/types';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

/** Số điện thoại hợp lệ: 9–11 chữ số (cho phép +84, dấu cách, dấu chấm). */
import { validPhone } from '../../domain/phoneNumber';
import { parentInviteText } from '../../domain/inviteText';

const CALLS: CallName[] = ['Bố', 'Mẹ', 'Ông', 'Bà'];
const SELVES: SelfName[] = ['Con', 'Cháu'];

export default function InviteScreen() {
  const { data, addMember, upsertCaregiver, newPairing, setRole, syncEnabled } = useStore();
  const [name, setName] = useState('');
  const [call, setCall] = useState<CallName>('Bố');
  const [self, setSelf] = useState<SelfName>('Con');
  const [phone, setPhone] = useState('');
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [memberId, setMemberId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<HealthInfo>({});
  const [showHealth, setShowHealth] = useState(true);

  const preview = { call, self, name: name || '...' };
  const pairing = data.pairing && data.pairing.memberId === memberId ? data.pairing : undefined;
  // SOS cần gọi được cho ai đó: phải có ít nhất 1 người nhận cảnh báo có số điện thoại.
  const needOwn = !data.caregivers.some((c) => validPhone(c.phone));
  const phoneOk = validPhone(myPhone);
  const canCreate = name.trim().length > 0 && (!needOwn || (myName.trim().length > 0 && phoneOk));

  const create = async () => {
    const m = addMember({ name: name.trim(), call, self, phone: phone.trim(), ...cleanHealth(health) });
    if (needOwn) {
      const order = data.caregivers.reduce((mx, c) => Math.max(mx, c.order), 0) + 1;
      upsertCaregiver({ name: myName.trim(), phone: myPhone.trim(), order });
    }
    setMemberId(m.id);
    await makeCode(m.id);
  };

  const makeCode = async (id: string) => {
    setBusy(true);
    try {
      await newPairing(id);
    } catch {
      notify('Chưa tạo được mã', 'Kiểm tra kết nối mạng rồi bấm "Tạo lại mã".');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/')} />
        <T size={14} color={colors.muted} weight="600">Bước 2/3</T>
      </View>
      <H1 size={26}>Thêm bố hoặc mẹ</H1>

      {!memberId ? (
        <>
          <Card style={{ gap: 12 }}>
            <Field maxLength={60} label="Tên của bố mẹ" value={name} onChange={setName} placeholder="Ví dụ: Hùng" />
            <T size={14} weight="600">Bạn gọi là</T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {CALLS.map((c) => (
                <View key={c} style={{ flex: 1 }}>
                  <Chip label={c} on={call === c} onPress={() => setCall(c)} />
                </View>
              ))}
            </View>
            <T size={14} weight="600">Bạn xưng là</T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {SELVES.map((c) => (
                <View key={c} style={{ width: 80 }}>
                  <Chip label={c} on={self === c} onPress={() => setSelf(c)} />
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 2 }}>
              <T size={12} color={colors.muted} weight="600">App sẽ nói với {call.toLowerCase()} như thế này</T>
              <T size={14}>“{medPrompt(preview)}”</T>
              <T size={14}>Nút điểm danh: “{okLabel(preview)}”</T>
            </View>
            <Field label={`Số điện thoại của ${call.toLowerCase()} (để gọi)`} value={phone} onChange={setPhone} keyboard="phone-pad" />
          </Card>
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T size={15} weight="700" style={{ flex: 1 }}>Sức khỏe của {call.toLowerCase()} (nên điền)</T>
              <Btn variant="secondary" label={showHealth ? 'Để sau' : 'Điền'} height={40} size={14} onPress={() => setShowHealth((x) => !x)} />
            </View>
            <T size={13} color={colors.muted}>
              {showHealth
                ? `Bệnh nền, dị ứng thuốc, nhóm máu, thẻ BHYT. Khi ${call.toLowerCase()} bấm SOS, máy hiện các thông tin này cho người cấp cứu. Sửa lại được trong Gia đình.`
                : 'Bạn có thể điền sau trong mục Gia đình → chọn bố mẹ → Hồ sơ sức khỏe.'}
            </T>
            {showHealth && <HealthForm value={health} onChange={setHealth} call={call} />}
          </Card>
          {needOwn && (
            <Card style={{ gap: 12 }}>
              <T size={15} weight="700">Bạn (người nhận cảnh báo đầu tiên)</T>
              <Field maxLength={60} label="Tên của bạn" value={myName} onChange={setMyName} placeholder="Ví dụ: Hà" />
              <Field label="Số điện thoại của bạn" value={myPhone} onChange={setMyPhone} keyboard="phone-pad" />
              <T size={13} color={myPhone && !phoneOk ? colors.red : colors.muted}>
                {myPhone && !phoneOk
                  ? 'Số điện thoại chưa đúng (cần 9–11 chữ số).'
                  : 'Bắt buộc: khi bố mẹ bấm SOS, máy sẽ gọi và nhắn tin cho bạn.'}
              </T>
            </Card>
          )}
          <Btn label="Tạo mã kết nối" disabled={!canCreate} onPress={create} />
        </>
      ) : (
        <>
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <T size={14} color={colors.muted} weight="600">Mã kết nối cho máy của {call.toLowerCase()} {name}</T>
            <T size={40} weight="700" color={colors.green} style={{ letterSpacing: 6 }}>
              {pairing ? formatCode(pairing.code) : '...'}
            </T>
            <T size={13} color={colors.muted}>Hết hạn sau 24 giờ</T>
            {!pairing && !busy && memberId && (
              <Btn variant="secondary" label="Tạo lại mã" onPress={() => makeCode(memberId)} style={{ alignSelf: 'stretch' }} />
            )}
            <Btn
              variant="blue"
              label="Gửi mã (Zalo, tin nhắn...)"
              onPress={() =>
                pairing &&
                Share.share({ message: parentInviteText({ id: memberId ?? '', name, call, self }, pairing.code) })
              }
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
          <T size={14} color={colors.muted}>
            {syncEnabled
              ? 'Cài An Tâm trên máy của bố mẹ, chọn "Tôi là bố, mẹ" rồi nhập mã này. Sau đó máy bạn sẽ hiện "Có máy xin kết nối": bấm Đồng ý là xong.'
              : 'Chưa cấu hình máy chủ đồng bộ: mã chỉ dùng được trên chính máy này (để thử).'}
          </T>
          <NotifCard onboarding />
          <View style={{ flex: 1 }} />
          <Btn
            label="Xong, vào trang chủ"
            onPress={() => {
              setRole('child');
              router.replace('/child');
            }}
          />
        </>
      )}
    </Screen>
  );
}
