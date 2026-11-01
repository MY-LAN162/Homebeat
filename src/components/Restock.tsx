// Nút "Đã mua thêm thuốc": cộng thêm số viên, không phải vào sửa từng thuốc.
import { View } from 'react-native';
import type { Medication } from '../domain/types';
import { track } from '../services/usage';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, T } from './ui';

export function Restock({ med }: { med: Medication }) {
  const { restock } = useStore();
  const perDay = med.pillsPerDose * med.times.length;
  const options = [30, 60].map((d) => Math.round(d * perDay)).filter((n) => n > 0);
  return (
    <View style={{ gap: 6 }}>
      <T size={13} weight="600" color={colors.muted}>Đã mua thêm:</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((n, i) => (
          <View key={n} style={{ flex: 1 }}>
            <Btn
              variant="secondary"
              label={`+${n} viên`}
              accessibilityLabel={`Đã mua thêm ${n} viên, đủ ${i === 0 ? '1' : '2'} tháng`}
              height={44}
              size={14}
              onPress={() => {
                restock(med.id, n);
                track('restock');
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
