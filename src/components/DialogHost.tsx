// Vẽ hộp thoại của src/services/dialog.ts. Đặt một lần ở layout gốc.
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { answer, subscribeDialogs, type DialogRequest } from '../services/dialog';
import { colors } from '../theme';
import { Btn, T } from './ui';

export function DialogHost() {
  const [d, setD] = useState<DialogRequest>();
  useEffect(() => subscribeDialogs(setD), []);
  return (
    <Modal visible={!!d} transparent animationType="fade" onRequestClose={() => answer(false)}>
      <Pressable
        accessibilityLabel="Đóng"
        onPress={() => d?.cancelLabel && answer(false)}
        style={{ flex: 1, backgroundColor: 'rgba(20,30,28,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        {d && (
          <Pressable
            accessibilityRole="alert"
            onPress={() => undefined}
            style={{ width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 22, padding: 22, gap: 12 }}
          >
            <T size={20} weight="700">{d.title}</T>
            {d.message && <T size={16} color={colors.muted}>{d.message}</T>}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Btn label={d.okLabel} variant={d.danger ? 'danger' : 'primary'} onPress={() => answer(true)} />
              {d.cancelLabel && <Btn label={d.cancelLabel} variant="secondary" onPress={() => answer(false)} />}
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
