import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { confirm } from '../../services/dialog';
import { Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { askPermission, hasPermission, rescheduleMedReminders } from '../../services/notifications';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

function Row({ title, sub, done, action, onPress }: { title: string; sub: string; done: boolean; action: string; onPress: () => void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T size={19} weight="700">{title}</T>
        <T size={15} color={colors.muted}>{sub}</T>
      </View>
      {done ? (
        <T size={16} weight="700" color={colors.greenDark}>Đã bật</T>
      ) : (
        <Btn label={action} onPress={onPress} height={48} size={16} style={{ paddingHorizontal: 14 }} />
      )}
    </Card>
  );
}

export default function PermissionsScreen() {
  const { data } = useStore();
  const member = useCurrentMember();
  const [notif, setNotif] = useState(false);
  const [loc, setLoc] = useState(false);
  const call = member?.call.toLowerCase() ?? 'bố';

  useEffect(() => {
    hasPermission().then(setNotif);
    Location.getForegroundPermissionsAsync()
      .then((p) => setLoc(p.granted))
      .catch(() => undefined);
  }, []);

  return (
    <Screen>
      <Banner tone="green">
        <T size={16} weight="600" color={colors.greenDark}>Đã kết nối với gia đình</T>
      </Banner>
      <H1>Cho phép An Tâm giúp {call}</H1>
      <T size={17} color={colors.muted}>Bấm từng nút bên dưới. Điện thoại sẽ hỏi, {call} chọn “Cho phép”.</T>
      <Row
        title="Thông báo"
        sub={`Để nhắc ${call} uống thuốc`}
        done={notif}
        action="Bật"
        onPress={async () => {
          const ok = await askPermission();
          setNotif(ok);
          if (ok) rescheduleMedReminders(data).catch(() => undefined);
        }}
      />
      <Row
        title="Vị trí"
        sub={`Gửi kèm khi ${call} bấm SOS`}
        done={loc}
        action="Bật"
        onPress={async () => setLoc((await Location.requestForegroundPermissionsAsync()).granted)}
      />
      <Row
        title="Không tắt app"
        sub="Để máy không tự tắt An Tâm khi tiết kiệm pin"
        done={false}
        action="Chỉ cách"
        onPress={() =>
          confirm(
            'Giữ An Tâm luôn chạy',
            Platform.OS === 'ios'
              ? 'Vào Cài đặt > An Tâm, bật Thông báo và Làm mới trong nền.'
              : 'Vào Cài đặt > Ứng dụng > An Tâm > Pin, chọn "Không giới hạn". Trên một số máy (Xiaomi, Oppo, Vivo...) cần bật thêm "Tự khởi động".',
            'Mở Cài đặt',
          ).then((ok) => {
            if (ok && Platform.OS !== 'web') void Linking.openSettings();
          })
        }
      />
      <View style={{ flex: 1 }} />
      <Banner tone="blue">
        <T size={16} color={colors.blueDark}>Không chắc? Đưa máy cho con cài giúp.</T>
      </Banner>
      <Btn label="Xong, bắt đầu dùng" height={72} size={22} onPress={() => router.replace('/parent')} />
    </Screen>
  );
}
