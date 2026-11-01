// Đổi điện thoại: lấy lại gia đình đã có, bằng mã do người trong gia đình tạo, hoặc bằng email đã liên kết.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Back, Banner, Btn, Card, Field, H1, Screen, T } from '../../components/ui';
import { authErrorText } from '../../services/authErrors';
import { goBack } from '../../services/nav';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function Restore() {
  const { syncEnabled, restoreWithEmail } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  const login = async () => {
    setBusy(true);
    setErr(undefined);
    try {
      const ok = await restoreWithEmail(email, pass);
      if (ok) router.replace('/');
      else setErr('Tài khoản này chưa có trong gia đình nào. Nhờ người nhà tạo mã cho máy mới.');
    } catch (e) {
      setErr(authErrorText((e as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Back onPress={() => goBack('/onboarding')} />
      <H1 size={26}>Lấy lại gia đình trên máy mới</H1>
      {!syncEnabled ? (
        <Banner tone="amber">
          <T size={15} color={colors.amberDark}>Bản này chưa kết nối máy chủ, nên chưa lấy lại được gia đình.</T>
        </Banner>
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <T size={17} weight="700">Cách 1: Nhập mã</T>
            <T size={15} color={colors.muted}>
              Nhờ bố mẹ (mục “Con đổi điện thoại?”) hoặc người nhà (tab Gia đình) tạo mã, rồi nhập ở đây. Họ bấm Đồng ý là xong.
            </T>
            <Btn label="Nhập mã" onPress={() => router.push('/onboarding/pair')} />
          </Card>
          <Card style={{ gap: 10 }}>
            <T size={17} weight="700">Cách 2: Đăng nhập email đã liên kết</T>
            <T size={14} color={colors.muted}>Chỉ dùng được nếu trước đây bạn đã liên kết email trong Cài đặt.</T>
            <Field label="Email" value={email} onChange={setEmail} placeholder="ten@gmail.com" keyboard="email-address" />
            <Field label="Mật khẩu" value={pass} onChange={setPass} secure />
            {err && <T size={15} color={colors.red} weight="600">{err}</T>}
            <Btn variant="secondary" label={busy ? 'Đang đăng nhập...' : 'Đăng nhập'} disabled={busy || !email.trim() || pass.length < 8} onPress={login} />
          </Card>
        </>
      )}
      <View style={{ flex: 1 }} />
    </Screen>
  );
}
