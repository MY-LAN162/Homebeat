// Chỉ vẽ màn hình khi dữ liệu trên máy đã tải xong.
// Dùng cho màn hình có ô nhập lấy giá trị ban đầu từ dữ liệu (sửa thuốc, ghi buổi khám, huyết áp):
// nếu vẽ sớm, ô nhập sẽ trống và bấm Lưu có thể ghi đè dữ liệu cũ.
import type { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../state/store';
import { colors } from '../theme';

export function whenReady<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function Ready(props: P) {
    const { ready } = useStore();
    if (!ready) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      );
    }
    return <Screen {...props} />;
  }
  Ready.displayName = `WhenReady(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Ready;
}
