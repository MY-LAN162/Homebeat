// Mức sử dụng app (dùng khi thử với gia đình thật): tính năng nào được dùng, tính năng nào bỏ đó.
// Số liệu chỉ nằm trên máy này; chỉ gửi đi khi người dùng tự bấm "Gửi".
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { Back, Btn, Card, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { doctorReport } from '../../domain/report';
import { confirm, notify } from '../../services/dialog';
import { getUsage, resetUsage, USAGE_LABELS, type Usage } from '../../services/usage';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const label = (k: string) => USAGE_LABELS[k] ?? k.replace(/^screen:/, 'Màn hình ');
const dm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function UsageScreen() {
  const { data, now } = useStore();
  const [usage, setUsage] = useState<Usage>({});
  useEffect(() => {
    getUsage().then(setUsage);
  }, []);
  const rows = Object.entries(usage).sort((a, b) => b[1].count - a[1].count);
  const unused = Object.keys(USAGE_LABELS).filter((k) => !usage[k]);
  // Chỉ số quan trọng nhất: bố mẹ có uống thuốc đúng giờ không (tính từ dữ liệu, 14 ngày).
  const adherence = data.members.map((m) => ({ m, r: doctorReport(data, m.id, now, 14).adherence }));

  const text = [
    `Mức sử dụng An Tâm (từ máy của ${data.role === 'parent' ? 'bố mẹ' : 'con'}, ${dm(now.toISOString())})`,
    ...adherence.map(({ m, r }) => `${displayName(m)}: uống ${r.taken}/${r.scheduled} lần, đúng giờ ${r.onTime} (14 ngày)`),
    '',
    ...rows.map(([k, v]) => `${label(k)}: ${v.count} lần (lần cuối ${dm(v.last)})`),
    '',
    `Chưa dùng: ${unused.map(label).join(', ') || 'không có'}`,
  ].join('\n');

  return (
    <Screen>
      <Back onPress={() => router.back()} />
      <H1 size={24}>Mức sử dụng app</H1>
      <T size={14} color={colors.muted}>
        Để biết tính năng nào thật sự có ích. Số liệu chỉ lưu trên máy này, không tự gửi đi đâu.
      </T>

      <Card style={{ gap: 6 }}>
        <T size={15} weight="700">Uống thuốc đúng giờ (14 ngày)</T>
        {adherence.map(({ m, r }) => (
          <View key={m.id} style={{ flexDirection: 'row' }}>
            <T size={15} style={{ flex: 1 }}>{displayName(m)}</T>
            <T size={15} weight="700">
              {r.scheduled ? `${r.onTime}/${r.scheduled} đúng giờ · ${r.taken} đã uống` : 'chưa có lịch'}
            </T>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <T size={15} weight="700">Đã dùng trên máy này</T>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: colors.line, paddingTop: 6 }}>
            <T size={14} style={{ flex: 1 }}>{label(k)}</T>
            <T size={14} weight="700">{v.count}</T>
            <T size={12} color={colors.muted} style={{ width: 44, textAlign: 'right' }}>{dm(v.last)}</T>
          </View>
        ))}
        {!rows.length && <T size={14} color={colors.muted}>Chưa có số liệu.</T>}
      </Card>

      {!!unused.length && (
        <Card style={{ gap: 4, backgroundColor: colors.soft }}>
          <T size={15} weight="700">Chưa dùng lần nào</T>
          <T size={14} color={colors.muted}>{unused.map(label).join(' · ')}</T>
        </Card>
      )}

      <Btn variant="blue" label="Gửi số liệu cho nhóm phát triển" onPress={() => Share.share({ message: text }).catch(() => notify('Chưa gửi được'))} />
      <Btn
        variant="ghost"
        label="Xóa số liệu, đếm lại từ đầu"
        onPress={() =>
          confirm('Xóa số liệu sử dụng?', 'Chỉ xóa phần đếm, không xóa thuốc hay nhật ký.', 'Xóa').then(async (ok) => {
            if (!ok) return;
            await resetUsage();
            setUsage({});
          })
        }
      />
    </Screen>
  );
}
