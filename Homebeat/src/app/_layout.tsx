import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
      </StoreProvider>
    </SafeAreaProvider>
  );
}
