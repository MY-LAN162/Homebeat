
import { goBack } from '../../services/nav';
import { useEffect, useRef } from 'react';
import { speak } from '../../services/speech';
import { Image, View } from 'react-native';
import { Back, Btn, Card, H1, Screen, SpeakButton, T } from '../../components/ui';
import { medPrompt, tookLabel } from '../../domain/address';
import { currentSlot, slotsForDay } from '../../domain/schedule';
import { snooze } from '../../services/notifications';
import { track } from '../../services/usage';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ParentMedicine() {
  const { data, now, markSlot } = useStore();
  const m = useCurrentMember();
  const spoken = useRef(false);
  const auto = data.settings.autoSpeak !== false;
  const call0 = m?.call.toLowerCase();
  const slot0 = m ? currentSlot(slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes)) : undefined;
  // Tự đọc to một lần khi mở màn hình (bật/tắt trong Cài đặt của con).
  useEffect(() => {
    if (!auto || spoken.current || !m || !slot0) return;
    spoken.current = true;
    const meal0 = slot0.meds.some((x) => x.afterMeal) ? 'Uống sau bữa ăn.' : '';
    speak(`${medPrompt(m)}. ${slot0.meds.map((x) => `${x.name}, ${x.pillsPerDose} viên`).join('. ')}. ${meal0} Uống xong ${call0} bấm nút Đã uống nhé.`);
    track('read_aloud');
  }, [auto, m, slot0, call0]);
  if (!m) return null;
  const call = m.call.toLowerCase();
  const slot = currentSlot(slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes));

  if (!slot) {
    return (
      <Screen>
        <H1>Hôm nay {call} đã uống đủ thuốc</H1>
        <T size={18} color={colors.muted}>Không còn lần uống nào trong hôm nay.</T>
        <View style={{ flex: 1 }} />
        <Btn label="Về trang chủ" height={72} size={22} onPress={() => goBack('/parent')} />
      </Screen>
    );
  }

  const meal = slot.meds.some((x) => x.afterMeal) ? 'Uống sau bữa ăn' : '';
  const speech = `${medPrompt(m)}. ${slot.meds.map((x) => `${x.name}, ${x.pillsPerDose} viên`).join('. ')}. ${meal}`;

  return (
    <Screen>
      <Back onPress={() => goBack('/parent')} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T size={56} weight="700" style={{ flex: 1, lineHeight: 64 }}>{slot.time}</T>
        <SpeakButton text={speech} />
      </View>
      <H1>{medPrompt(m)}</H1>
      <T size={18} color={colors.muted}>{[meal, `${slot.pills} viên`].filter(Boolean).join(' · ')}</T>

      <Card style={{ paddingVertical: 4 }}>
        {slot.meds.map((med, i) => (
          <View
            key={med.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: colors.soft }}
          >
            {med.photoUri ? (
              <Image source={{ uri: med.photoUri }} accessibilityLabel={`Ảnh ${med.name}`} style={{ width: 80, height: 80, borderRadius: 16 }} />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Chưa có ảnh</T>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <T size={21} weight="700">{med.name}</T>
              {!!med.purpose && <T size={17} color={colors.muted}>{med.purpose}</T>}
            </View>
            <T size={20} weight="700" color={colors.green}>{med.pillsPerDose} viên</T>
          </View>
        ))}
      </Card>

      <View style={{ flex: 1 }} />
      <Btn
        label={tookLabel(m)}
        height={80}
        size={24}
        onPress={() => {
          markSlot(slot, 'taken');
          track('dose_taken');
          goBack('/parent');
        }}
      />
      <Btn
        variant="secondary"
        label="Nhắc lại sau 15 phút"
        height={64}
        size={20}
        onPress={() => {
          snooze(medPrompt(m), `${slot.time} · ${slot.pills} viên`, slot.time).catch(() => undefined);
          track('dose_snoozed');
          goBack('/parent');
        }}
      />
      <Btn
        variant="ghost"
        label="Hết thuốc / không uống được"
        size={17}
        onPress={() => {
          markSlot(slot, 'skipped');
          track('dose_skipped');
          goBack('/parent');
        }}
      />
      <T size={15} color={colors.muted} style={{ textAlign: 'center' }}>
        Nếu sau {data.settings.lateMinutes} phút {call} chưa bấm, An Tâm sẽ báo cho các {m.self.toLowerCase()}.
      </T>
    </Screen>
  );
}
