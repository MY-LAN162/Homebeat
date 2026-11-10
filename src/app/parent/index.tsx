import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { JoinRequests } from '../../components/JoinRequests';
import { ParentInbox } from '../../components/ParentInbox';
import { Btn, H1, HoldButton, Screen, SpeakButton, T } from '../../components/ui';
import { greeting, okLabel } from '../../domain/address';
import { sizeLabel } from '../../domain/textSize';
import { currentSlot, pillsText, slotsForDay } from '../../domain/schedule';
import { call as dial } from '../../services/phone';
import { dateKey, formatLongDate, formatShortDate, hm } from '../../domain/time';
import { track } from '../../services/usage';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ParentHome() {
  const { data, now, checkin, setRole } = useStore();
  const m = useCurrentMember();
  // Bấm "ổn": đếm 6 giây cho bấm nhầm thì hoàn tác, rồi mới báo các con.
  const [okLeft, setOkLeft] = useState<number>();
  useEffect(() => {
    if (okLeft === undefined || !m) return;
    const t = setTimeout(() => {
      if (okLeft > 1) {
        setOkLeft(okLeft - 1);
        return;
      }
      checkin(m.id, 'good', []);
      track('checkin_ok');
      setOkLeft(undefined);
    }, 1000);
    return () => clearTimeout(t);
  }, [okLeft, m, checkin]);
  // Lần đầu mở: hiện hướng dẫn 3 bước.
  const needGuide = !!m && !data.guideSeen;
  useEffect(() => {
    if (needGuide) router.push('/parent/guide');
  }, [needGuide]);
  if (!m) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={colors.green} />
          <H1 size={26}>Đang tải dữ liệu từ máy của con…</H1>
          <T size={18} color={colors.muted} style={{ textAlign: 'center' }}>
            Cần có mạng (wifi hoặc 4G). Nếu chờ lâu, kiểm tra mạng rồi mở lại app.
          </T>
        </View>
      </Screen>
    );
  }
  const call = m.call.toLowerCase();

  const slots = slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes);
  const slot = currentSlot(slots);
  const takenToday = slots.filter((s) => s.status === 'taken').length;
  const todayCheckin = [...data.checkins].reverse().find((c) => c.memberId === m.id && dateKey(new Date(c.at)) === dateKey(now));
  const kidsToCall = [...data.caregivers].sort((a, b) => a.order - b.order).filter((c) => !c.sosOnly && c.phone).slice(0, 2);
  const nextVisit = data.appointments
    .filter((a) => a.memberId === m.id && new Date(a.at) >= now)
    .sort((a, b) => a.at.localeCompare(b.at))[0];

  const medLine = slot
    ? `${slot.time} · ${pillsText(slot.pills)}`
    : slots.length
      ? 'Hôm nay đã uống đủ'
      : 'Chưa có lịch thuốc';
  const medSub = slot?.status === 'late' || slot?.status === 'due' ? 'Đến giờ rồi, bấm để xem thuốc' : takenToday ? `Hôm nay ${call} đã uống ${takenToday} lần` : '';

  const speech = [
    greeting(m, now),
    slot ? `Lần uống thuốc tới lúc ${slot.time}, ${pillsText(slot.pills)}.` : '',
    nextVisit ? `${formatShortDate(new Date(nextVisit.at))} ${call} đi ${nextVisit.title.toLowerCase()}.` : '',
  ].join(' ');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T size={18} color={colors.muted}>{formatLongDate(now)}</T>
          <H1 size={30}>{greeting(m, now)}</H1>
        </View>
        <SpeakButton text={speech} />
      </View>

      <JoinRequests big />
      <ParentInbox m={m} />

      <View style={{ backgroundColor: colors.green, borderRadius: 22, padding: 20, gap: 14 }}>
        <T size={20} weight="600" color={colors.white}>
          {todayCheckin
            ? `Đã báo cho các ${m.self.toLowerCase()} lúc ${hm(new Date(todayCheckin.at))}`
            : `Bấm một lần để các ${m.self.toLowerCase()} biết hôm nay ${call} vẫn ổn`}
        </T>
        {okLeft === undefined ? (
          <Btn variant="light" label={okLabel(m)} height={72} size={24} onPress={() => setOkLeft(6)} />
        ) : (
          <>
            <T size={22} weight="700" color={colors.white}>✓ Đang báo cho các {m.self.toLowerCase()}…</T>
            <Btn variant="secondary" label={`Bấm nhầm, hoàn tác (${okLeft})`} height={60} size={20} onPress={() => setOkLeft(undefined)} />
          </>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Thuốc lần tới: ${medLine}`}
        onPress={() => router.push('/parent/medicine')}
        style={({ pressed }) => ({
          backgroundColor: colors.white,
          borderRadius: 22,
          padding: 18,
          gap: 2,
          borderWidth: slot?.status === 'late' || slot?.status === 'due' ? 3 : 0,
          borderColor: colors.amber,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <T size={16} color={colors.muted} weight="600">Thuốc lần tới</T>
        <T size={24} weight="700">{medLine}</T>
        {!!medSub && <T size={16} color={colors.greenDark} weight="600">{medSub}</T>}
      </Pressable>

      {nextVisit && (
        <View style={{ backgroundColor: colors.amberSoft, borderRadius: 18, padding: 14 }}>
          <T size={17} color={colors.amberText}>
            <T size={17} weight="700" color={colors.amberDark}>{formatShortDate(new Date(nextVisit.at))}</T> · {nextVisit.title}
            {nextVisit.companion ? `, ${nextVisit.companion} đưa đi` : ''}
          </T>
        </View>
      )}

      <Btn variant="ghost" label={`Kể ${m.self.toLowerCase()} nghe hôm nay ${call} thấy thế nào`} onPress={() => router.push('/parent/checkin')} />

      {/* Gọi hỏi thăm bình thường, tách khỏi SOS để bố mẹ không phải bấm SOS chỉ để gọi con. */}
      {kidsToCall.map((c) => (
        <Btn key={c.id} variant="blue" label={`📞 Gọi ${m.self.toLowerCase()} ${c.name}`} height={64} size={22} onPress={() => { void dial(c.phone); track('call_child'); }} />
      ))}

      <View style={{ flex: 1, minHeight: 12 }} />
      <HoldButton
        label={`SOS · Gọi các ${m.self.toLowerCase()}`}
        hint="Giữ nút đến khi vạch đậm chạy hết (3 giây)"
        onComplete={() => router.push('/parent/sos')}
      />
      <Btn variant="secondary" size={20} height={60} label={`Aa  Chữ to hơn (đang: ${sizeLabel(m.textScale)})`} onPress={() => router.push('/parent/text-size')} />
      <Btn variant="ghost" size={17} label="Xem lại hướng dẫn" onPress={() => router.push('/parent/guide')} />
      {!!data.familyId && !data.demo && (
        <Btn variant="ghost" size={17} label={`${m.self} đổi điện thoại? Bấm vào đây`} onPress={() => router.push('/parent/devices')} />
      )}
      {(!data.familyId || data.demo) && <Btn variant="ghost" size={13} height={36} label="Đổi vai trò (bản thử)" onPress={() => { setRole(undefined); router.replace('/'); }} />}
    </Screen>
  );
}
