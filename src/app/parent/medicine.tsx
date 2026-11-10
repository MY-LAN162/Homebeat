// Màn hình uống thuốc của bố mẹ.
//  - Chưa đến giờ (còn hơn 60 phút): chỉ báo giờ lần tới, không cho bấm "Đã uống" để tránh uống sớm.
//  - Bấm "Đã uống": hiện xác nhận to, có 6 giây "Bấm nhầm, hoàn tác" rồi mới ghi.
//  - "Hết thuốc / không uống được": hỏi lý do, rồi báo ngay cho các con.
import { goBack } from '../../services/nav';
import { useEffect, useRef, useState } from 'react';
import { speak } from '../../services/speech';
import { Image, View } from 'react-native';
import { Back, Btn, Card, H1, Screen, SpeakButton, T } from '../../components/ui';
import { medPrompt, tookLabel } from '../../domain/address';
import { canTakeNow, currentSlot, minutesUntil, pillsText, slotsForDay, type DoseSlot } from '../../domain/schedule';
import { formatDuration } from '../../domain/time';
import { snooze } from '../../services/notifications';
import { track } from '../../services/usage';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

const UNDO_SECONDS = 6;

export default function ParentMedicine() {
  const { data, now, markSlot, skipSlot } = useStore();
  const m = useCurrentMember();
  const spoken = useRef(false);
  const auto = data.settings.autoSpeak !== false;
  const [pending, setPending] = useState<{ slot: DoseSlot; left: number }>();
  const [asking, setAsking] = useState(false);
  const [skipped, setSkipped] = useState<'out' | 'unable'>();
  const call0 = m?.call.toLowerCase();
  const slot0 = m ? currentSlot(slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes)) : undefined;

  // Tự đọc to một lần khi mở màn hình (bật/tắt trong Cài đặt của con).
  useEffect(() => {
    if (!auto || spoken.current || !m || !slot0) return;
    spoken.current = true;
    if (!canTakeNow(slot0, new Date())) {
      speak(`Chưa đến giờ uống thuốc. Lần tới lúc ${slot0.time.replace(':', ' giờ ')}.`);
      return;
    }
    const meal0 = slot0.meds.some((x) => x.afterMeal) ? 'Uống sau bữa ăn.' : '';
    speak(`${medPrompt(m)}. ${slot0.meds.map((x) => `${x.name}, ${pillsText(x.pillsPerDose)}`).join('. ')}. ${meal0} Uống xong ${call0} bấm nút Đã uống nhé.`);
    track('read_aloud');
  }, [auto, m, slot0, call0]);

  // Đếm ngược "hoàn tác", hết giờ thì ghi "đã uống" và về trang chủ.
  useEffect(() => {
    if (!pending) return;
    if (pending.left <= 0) {
      markSlot(pending.slot, 'taken');
      track('dose_taken');
      goBack('/parent');
      return;
    }
    const t = setTimeout(() => setPending((p) => (p ? { ...p, left: p.left - 1 } : p)), 1000);
    return () => clearTimeout(t);
  }, [pending, markSlot]);

  if (!m) return null;
  const call = m.call.toLowerCase();
  const kids = m.self.toLowerCase();
  const slot = pending?.slot ?? currentSlot(slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes));

  if (skipped) {
    return (
      <Screen>
        <H1>Đã báo cho các {kids}</H1>
        <T size={20}>
          {skipped === 'out'
            ? `Các ${kids} biết ${call} hết thuốc và sẽ lo mua thêm.`
            : `Các ${kids} biết ${call} không uống được thuốc và sẽ gọi hỏi thăm.`}
        </T>
        <View style={{ flex: 1 }} />
        <Btn label="Về trang chủ" height={72} size={22} onPress={() => goBack('/parent')} />
      </Screen>
    );
  }

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
  const speech = `${medPrompt(m)}. ${slot.meds.map((x) => `${x.name}, ${pillsText(x.pillsPerDose)}`).join('. ')}. ${meal}`;
  const early = !pending && !canTakeNow(slot, now);
  const medList = (
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
          <T size={20} weight="700" color={colors.green}>{pillsText(med.pillsPerDose)}</T>
        </View>
      ))}
    </Card>
  );

  if (early) {
    return (
      <Screen>
        <Back onPress={() => goBack('/parent')} />
        <T size={20} weight="700" color={colors.muted}>CHƯA ĐẾN GIỜ</T>
        <T size={56} weight="700" style={{ lineHeight: 64 }}>{slot.time}</T>
        <H1>Lần uống thuốc tới lúc {slot.time}</H1>
        <T size={19} color={colors.muted}>
          Còn {formatDuration(minutesUntil(slot, now))}. Đến giờ máy sẽ kêu nhắc {call}.
        </T>
        {medList}
        <View style={{ flex: 1 }} />
        <Btn label="Về trang chủ" height={72} size={22} onPress={() => goBack('/parent')} />
      </Screen>
    );
  }

  if (pending) {
    return (
      <Screen bg={colors.greenSoft}>
        <T size={64} weight="700" color={colors.green} style={{ textAlign: 'center', lineHeight: 72 }}>✓</T>
        <H1 color={colors.greenDark}>Đã ghi: {call} đã uống thuốc {slot.time}</H1>
        <T size={20} color={colors.greenDark}>Các {kids} sẽ thấy ngay trên điện thoại.</T>
        <View style={{ flex: 1 }} />
        <Btn
          variant="secondary"
          label={`Bấm nhầm, hoàn tác (${pending.left})`}
          height={64}
          size={20}
          onPress={() => {
            setPending(undefined);
            track('dose_undo');
          }}
        />
        <Btn label="Xong" height={72} size={22} onPress={() => setPending((p) => (p ? { ...p, left: 0 } : p))} />
      </Screen>
    );
  }

  if (asking) {
    return (
      <Screen>
        <Back onPress={() => setAsking(false)} />
        <H1>Vì sao {call} chưa uống thuốc {slot.time}?</H1>
        <T size={18} color={colors.muted}>Bấm một nút, An Tâm báo ngay cho các {kids}.</T>
        <Btn
          label="Hết thuốc"
          height={72}
          size={22}
          onPress={() => {
            skipSlot(slot, 'out');
            track('dose_skipped_out');
            setSkipped('out');
          }}
        />
        <Btn
          variant="secondary"
          label="Không uống được (mệt, khó nuốt...)"
          height={72}
          size={20}
          onPress={() => {
            skipSlot(slot, 'unable');
            track('dose_skipped_unable');
            setSkipped('unable');
          }}
        />
        <View style={{ flex: 1 }} />
        <Btn variant="ghost" label="Bấm nhầm, quay lại" height={64} size={20} onPress={() => setAsking(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Back onPress={() => goBack('/parent')} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T size={56} weight="700" style={{ flex: 1, lineHeight: 64 }}>{slot.time}</T>
        <SpeakButton text={speech} />
      </View>
      <H1>{medPrompt(m)}</H1>
      <T size={18} color={colors.muted}>{[meal, pillsText(slot.pills)].filter(Boolean).join(' · ')}</T>

      {medList}

      <View style={{ flex: 1 }} />
      <Btn label={tookLabel(m)} height={80} size={24} onPress={() => setPending({ slot, left: UNDO_SECONDS })} />
      <Btn
        variant="secondary"
        label="Nhắc lại sau 15 phút"
        height={64}
        size={20}
        onPress={() => {
          snooze(medPrompt(m), `${slot.time} · ${pillsText(slot.pills)}`, slot.time).catch(() => undefined);
          track('dose_snoozed');
          goBack('/parent');
        }}
      />
      <Btn variant="ghost" label="Hết thuốc / không uống được" size={17} onPress={() => setAsking(true)} />
      <T size={15} color={colors.muted} style={{ textAlign: 'center' }}>
        Nếu sau {data.settings.lateMinutes} phút {call} chưa bấm, An Tâm sẽ báo cho các {kids}.
      </T>
    </Screen>
  );
}
