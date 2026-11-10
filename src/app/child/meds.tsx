import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Restock } from '../../components/Restock';
import { Btn, Card, Chip, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { adherence, daysOfStock, pillsText } from '../../domain/schedule';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ChildMeds() {
  const { data, now } = useStore();
  const [who, setWho] = useState<string | undefined>(data.members[0]?.id);
  const memberId = who ?? data.members[0]?.id;
  const meds = data.medications.filter((m) => m.memberId === memberId);
  const adh = memberId ? adherence(data.medications, data.doseLogs, memberId, now, 7) : undefined;

  return (
    <Screen>
      <H1 size={26}>Thuốc của bố mẹ</H1>
      <Btn
        variant="blue"
        label="📷  Quét đơn thuốc"
        onPress={() => router.push({ pathname: '/child/scan', params: memberId ? { memberId } : {} })}
        disabled={!memberId}
      />
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {data.members.map((m) => (
          <Chip key={m.id} label={displayName(m)} on={m.id === memberId} onPress={() => setWho(m.id)} />
        ))}
      </View>
      {adh && adh.scheduled > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={14} color={colors.muted}>7 ngày qua uống đúng</T>
          <T size={14} weight="700">{adh.taken}/{adh.scheduled} lần</T>
        </View>
      )}
      {meds.map((m) => {
        const days = daysOfStock(m);
        const low = days != null && days <= 5;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Sửa ${m.name}`}
            onPress={() => router.push({ pathname: '/child/med-edit', params: { id: m.id } })}
          >
            <Card style={{ borderWidth: 2, borderColor: low ? '#E0925A' : colors.white }}>
              <T size={16} weight="700">{m.name}</T>
              <T size={13} color={colors.muted}>
                {[m.purpose, `${pillsText(m.pillsPerDose)}/lần`, m.afterMeal ? 'sau ăn' : ''].filter(Boolean).join(' · ')}
              </T>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {m.times.map((t) => (
                  <View key={t} style={{ backgroundColor: colors.greenSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <T size={12} weight="600" color={colors.greenDark}>{t}</T>
                  </View>
                ))}
              </View>
              {days != null && (
                <T size={13} weight="600" color={low ? colors.amberDark : colors.muted}>
                  Còn {days} ngày{low ? ' · nên mua thêm' : ''}
                </T>
              )}
              {low && <Restock med={m} />}
            </Card>
          </Pressable>
        );
      })}
      {memberId && !meds.length && <T size={15} color={colors.muted}>Chưa có thuốc nào.</T>}
      {memberId && (
        <Btn label="+ Thêm thuốc" onPress={() => router.push({ pathname: '/child/med-edit', params: { memberId } })} />
      )}
    </Screen>
  );
}
