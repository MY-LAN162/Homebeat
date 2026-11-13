import { router } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Back, Banner, Btn, Card, Chip, H1, Screen, T } from '../../components/ui';
import { allergyMatch } from '../../domain/health';
import { DAY_PARTS, findExisting, rxToMedication, type DayPart, type RxItem } from '../../domain/rx';
import { track } from '../../services/usage';
import { getRxDraft, setRxDraft } from '../../state/drafts';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const BASIC_PARTS: DayPart[] = ['Sáng', 'Trưa', 'Tối'];

/** Nút − / + cho số viên mỗi lần (bước nửa viên). */
function PillStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn = (txt: string, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Thêm nửa viên' : 'Bớt nửa viên'}
      onPress={() => onChange(Math.min(10, Math.max(0.5, value + delta)))}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: colors.chipLine,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.ink }}>{txt}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn('−', -0.5)}
      <Text accessibilityLiveRegion="polite" style={{ minWidth: 70, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.ink }}>
        {String(value).replace('.', ',')} viên
      </Text>
      {btn('+', 0.5)}
    </View>
  );
}

function detail(it: RxItem): string {
  const bits = [`${String(it.pillsPerDose).replace('.', ',')} viên/lần`];
  if (it.afterMeal === true) bits.push('sau ăn');
  if (it.afterMeal === false) bits.push('trước ăn');
  if (it.days) bits.push(`${it.days} ngày`);
  if (it.totalPills) bits.push(`${it.totalPills} viên`);
  return bits.join(' · ');
}

export default function ScanConfirm() {
  const { data, upsertMedication } = useStore();
  const draft = getRxDraft();
  const [items, setItems] = useState<RxItem[]>(draft?.items ?? []);
  const [editing, setEditing] = useState<number>();
  const member = data.members.find((m) => m.id === draft?.memberId);

  if (!draft || !member) {
    return (
      <Screen>
        <Back onPress={() => goBack('/child')} />
        <T size={16}>Chưa có đơn thuốc nào để kiểm tra.</T>
        <Btn label="Quét đơn thuốc" onPress={() => router.replace('/child/scan')} />
      </Screen>
    );
  }

  const patch = (i: number, p: Partial<RxItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...p, doubts: [] } : x)));
  const missing = items.filter((x) => !x.name.trim() || !x.parts.length).length;

  const current = data.medications.filter((m) => m.memberId === member.id);
  const save = () => {
    for (const it of items) {
      const old = findExisting(it, current);
      const med = rxToMedication(it, member.id);
      // Thuốc đã có: cập nhật (giữ số viên còn lại nếu đơn không ghi), không thêm trùng.
      upsertMedication(old ? { ...old, ...med, stockPills: med.stockPills ?? old.stockPills } : med);
    }
    setRxDraft(undefined);
    track('scan_saved');
    router.replace('/child/meds');
  };

  return (
    <Screen>
      <Back onPress={() => goBack('/child')} />
      <H1 size={24}>Kiểm tra lại đơn thuốc</H1>
      <T size={16} color={colors.muted}>
        Máy đọc được <T size={16} weight="700">{items.length} loại thuốc</T>. Hãy so với đơn giấy trước khi lưu.
      </T>

      {items.map((it, i) => {
        const doubt = it.doubts.length > 0;
        const parts = DAY_PARTS.filter((p) => BASIC_PARTS.includes(p) || it.parts.includes(p));
        const old = findExisting(it, current);
        return (
          <Card key={i} style={{ gap: 10, borderWidth: doubt ? 2 : 0, borderColor: colors.amber }}>
            {editing === i ? (
              <TextInput
                accessibilityLabel="Tên thuốc"
                value={it.name}
                onChangeText={(v) => patch(i, { name: v })}
                autoFocus
                onBlur={() => setEditing(undefined)}
                style={{ fontSize: 18, fontWeight: '700', color: colors.ink, borderBottomWidth: 2, borderColor: colors.green, paddingVertical: 4 }}
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T size={18} weight="700" style={{ flex: 1 }}>{it.name || '(chưa có tên)'}</T>
                <Btn variant="ghost" label="Sửa tên" height={36} size={14} onPress={() => setEditing(i)} />
              </View>
            )}
            {!!allergyMatch(it.name, member.allergies) && (
              <View accessibilityRole="alert" style={{ backgroundColor: colors.amberSoft, borderRadius: 10, padding: 10 }}>
                <T size={14} color={colors.amberDark} weight="700">
                  ⚠ {member.call} đã ghi dị ứng “{allergyMatch(it.name, member.allergies)}”. Hỏi lại bác sĩ, dược sĩ trước khi uống thuốc này.
                </T>
              </View>
            )}
            {old && (
              <View style={{ backgroundColor: colors.blueSoft, borderRadius: 10, padding: 10 }}>
                <T size={14} color={colors.blueDark}>
                  Đã có “{old.name}” ({old.times.join(', ')}). Lưu sẽ cập nhật thuốc này, không thêm mới.
                </T>
              </View>
            )}
            {doubt ? (
              <View style={{ backgroundColor: colors.amberSoft, borderRadius: 10, padding: 10 }}>
                {it.doubts.map((d) => (
                  <T key={d} size={14} color={colors.amberDark} weight="600">⚠ {d}</T>
                ))}
              </View>
            ) : (
              <T size={14} color={colors.muted}>{detail(it)}</T>
            )}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {parts.map((p) => (
                <View key={p} style={{ flex: 1 }}>
                  <Chip
                    label={p}
                    on={it.parts.includes(p)}
                    onPress={() => patch(i, { parts: it.parts.includes(p) ? it.parts.filter((x) => x !== p) : [...it.parts, p] })}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T size={14} weight="600">Mỗi lần uống</T>
              <PillStepper value={it.pillsPerDose} onChange={(v) => patch(i, { pillsPerDose: v })} />
            </View>
            <Btn variant="ghost" label="Bỏ thuốc này" height={36} size={14} onPress={() => setItems((xs) => xs.filter((_, j) => j !== i))} />
          </Card>
        );
      })}

      <Btn
        variant="secondary"
        label="+ Thêm thuốc máy bỏ sót"
        onPress={() => {
          setItems((xs) => [...xs, { name: '', pillsPerDose: 1, parts: [], doubts: [], source: '' }]);
          setEditing(items.length);
        }}
      />
      {missing > 0 && (
        <Banner tone="amber">
          <T size={14} color={colors.amberDark}>Còn {missing} thuốc chưa có tên hoặc chưa chọn buổi uống.</T>
        </Banner>
      )}
      <Btn label="Lưu và tạo lịch nhắc" disabled={!items.length || missing > 0} onPress={save} />
      <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>
        An Tâm chỉ giúp nhắc lịch, không thay thế tư vấn của bác sĩ, dược sĩ.
      </T>
    </Screen>
  );
}
