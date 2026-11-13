import Tabs from 'expo-router/tabs';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ChildLayout() {
  const k = useStore().data.textScale ?? 1;
  return (
    <Tabs
      // "Quay lại" về đúng màn hình trước đó (mặc định của thanh tab là về tab đầu tiên).
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 14 * k, fontWeight: '700' },
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { height: 56 + 8 * k, backgroundColor: colors.white, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="meds" options={{ title: 'Thuốc' }} />
      <Tabs.Screen name="visits" options={{ title: 'Đi khám' }} />
      <Tabs.Screen name="family" options={{ title: 'Gia đình' }} />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
      <Tabs.Screen name="med-edit" options={{ href: null }} />
      <Tabs.Screen name="member-edit" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="scan-confirm" options={{ href: null }} />
      <Tabs.Screen name="visit-prep" options={{ href: null }} />
      <Tabs.Screen name="visit-record" options={{ href: null }} />
      <Tabs.Screen name="visit-summary" options={{ href: null }} />
      <Tabs.Screen name="alert" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="usage" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="message" options={{ href: null }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
    </Tabs>
  );
}
