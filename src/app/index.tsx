import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../state/store';
import { colors } from '../theme';

export default function Index() {
  const { ready, data } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }
  if (data.pendingJoin && data.role !== 'parent') return <Redirect href="/onboarding/wait" />;
  // Máy bố mẹ luôn vào màn hình bố mẹ, kể cả khi dữ liệu gia đình chưa tải về kịp (màn hình đó hiện "đang tải").
  if (data.role === 'parent' && (data.members.length || data.familyId)) return <Redirect href="/parent" />;
  if (data.role === 'child') return <Redirect href="/child" />;
  return <Redirect href="/onboarding" />;
}
