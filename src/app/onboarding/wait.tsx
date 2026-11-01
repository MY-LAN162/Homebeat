// Máy bố mẹ đã nhập mã, đang chờ con bấm "Đồng ý" trên máy của con.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Btn, H1, Screen, T } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function WaitApproval() {
  const { data, cancelJoin } = useStore();
  const p = data.pendingJoin;
  const joined = data.role === 'parent' && !!data.familyId;

  useEffect(() => {
    if (joined) router.replace('/onboarding/permissions');
  }, [joined]);

  const retry = () => {
    cancelJoin();
    router.replace('/onboarding/pair');
  };

  if (!p) {
    return (
      <Screen>
        <H1>Chưa gửi yêu cầu nào</H1>
        <Btn label="Nhập mã con gửi" height={72} size={22} onPress={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ height: 24 }} />
      {p.denied ? (
        <>
          <H1 size={30}>Chưa kết nối được</H1>
          <T size={20} style={{ lineHeight: 30 }}>
            Con chưa đồng ý cho máy này kết nối. Hãy gọi cho con, rồi nhập lại mã mới con gửi.
          </T>
          <View style={{ flex: 1 }} />
          <Btn label="Nhập lại mã" height={76} size={24} onPress={retry} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.green} />
          <H1 size={30}>Đã gửi yêu cầu kết nối</H1>
          <T size={20} style={{ lineHeight: 30 }}>
            Nhờ con mở app An Tâm trên máy của con và bấm <T size={20} weight="700">“Đồng ý”</T>. Máy này sẽ tự vào khi con đồng ý.
          </T>
          <Banner tone="blue">
            <T size={16} color={colors.blueDark}>Có thể đóng app, lát mở lại vẫn được.</T>
          </Banner>
          <View style={{ flex: 1 }} />
          <Btn variant="ghost" label="Nhập lại mã khác" size={18} onPress={retry} />
        </>
      )}
    </Screen>
  );
}
