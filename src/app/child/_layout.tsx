import Tabs from 'expo-router/tabs';
import { colors } from '../../theme';

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { height: 64, backgroundColor: colors.white, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="meds" options={{ title: 'Thuốc' }} />
      <Tabs.Screen name="visits" options={{ title: 'Đi khám' }} />
      <Tabs.Screen name="family" options={{ title: 'Gia đình' }} />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
      <Tabs.Screen name="med-edit" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
