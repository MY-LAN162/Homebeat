import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost } from '../components/DialogHost';
import { NotificationBridge } from '../components/NotificationBridge';
import { UsageTracker } from '../components/UsageTracker';
import { setupNotifications } from '../services/notifications';
import { StoreProvider } from '../state/store';
import { colors } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    setupNotifications();
  }, []);
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        <DialogHost />
        <NotificationBridge />
        <UsageTracker />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
