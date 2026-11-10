import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Back, Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { alertKey, memberAlerts, type AlertKind } from '../../domain/alerts';
import { slotsForDay } from '../../domain/schedule';
import { dateKey, formatDuration, hm } from '../../domain/time';
import { toZone } from '../../domain/tz';
import { call, mapsLink } from '../../services/phone';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const MOOD = { good: 'khỏe', tired: 'hơi mệt', unwell: 'không khỏe' };

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.line }}>
      <T size={15} color={colors.muted} style={{ flex: 1 }}>{label}</T>
      <T size={15} weight="700" color={warn ? colors.amberDark : colors.ink}>{value}</T>
    </View>
  );
}

export default function AlertDetail() {
  const { memberId, kind } = useLocalSearchParams<{ memberId: string; kind: AlertKind }>();
  const { data, now, dismissAlert, ackSos } = useStore();
  const [howTo, setHowTo] = useState(false);
  const m = data.members.find((x) => x.id === memberId);
  if (!m) {
    return (
      <Screen>
        <Back onPress={() => goBack('/child')} />
        <T size={16}>Không tìm thấy người này.</T>
      </Screen>
    );
  }
  const tz = data.settings.timeZone;
  const local = (iso: string) => toZone(new Date(iso), tz);
  const a = memberAlerts(data, m, now).find((x) => x.kind === kind);
  const callName = m.call.toLowerCase();
  const urgent = a?.level === 'urgent';
  const today = dateKey(toZone(now, tz));
  const soft = kind === 'no-signal' || kind === 'low-battery';

  const checkin = [...data.checkins].reverse().find((c) => c.memberId === m.id && dateKey(local(c.at)) === today);
  const slots = slotsForDay(data.medications, data.doseLogs, m.id, toZone(now, tz), toZone(now, tz), data.settings.lateMinutes);
  const late = slots.filter((s) => s.status === 'late');
  const sos = [...data.sosEvents].reverse().find((e) => e.memberId === m.id && !e.cancelled && dateKey(local(e.at)) === today);
  const others = data.members.filter((x) => x.id !== m.id && x.phone);
  const caregivers = [...data.caregivers].sort((x, y) => x.order - y.order).filter((c) => c.phone && (kind === 'sos' || !c.sosOnly));
  const neighbors = data.caregivers.filter((c) => c.sosOnly && c.phone);

  const close = () => {
    dismissAlert(alertKey(m.id, kind, now));
    goBack('/child');
  };

  // SOS: màn hình đỏ toàn trang, việc cần làm xếp theo thứ tự: gọi bố mẹ → báo "Con đã thấy" → người gần nhà → 115.
  if (kind === 'sos' && a && sos) {
    const white = { color: colors.white };
    return (
      <Screen bg={colors.red}>
        <Back onPress={() => goBack('/child')} />
        <T size={15} weight="700" style={white}>KHẨN CẤP · bấm lúc {hm(local(sos.at))}</T>
        <H1 size={30} color={colors.white}>{displayName(m)} bấm SOS</H1>
        <T size={17} style={white}>
          {sos.lat != null ? 'Có vị trí kèm theo.' : 'Không có vị trí (máy chưa cho phép hoặc mất GPS).'}
          {m.battery != null ? ` Pin máy ${callName} ${m.battery}%.` : ''}
        </T>
        {m.phone ? (
          <Btn variant="light" height={72} size={22} label={`📞 Gọi ${callName} ngay`} onPress={() => call(m.phone)} />
        ) : (
          <Btn variant="light" label={`Thêm số điện thoại của ${callName} để gọi nhanh`} onPress={() => router.push('/child/family')} />
        )}
        {sos.ackBy ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: 14 }}>
            <T size={17} weight="700" style={white}>✓ {sos.ackBy} đã báo “đã thấy” lúc {sos.ackAt ? hm(local(sos.ackAt)) : ''}</T>
            <T size={15} style={white}>Máy của {callName} đang hiện: “{m.self} {sos.ackBy} đã thấy, đang gọi cho {callName}”.</T>
          </View>
        ) : (
          <Btn variant="secondary" height={60} size={18} label="✓ Con đã thấy, đang xử lý" onPress={() => ackSos(sos.id)} />
        )}
        {sos.lat != null && sos.lng != null && (
          <Btn variant="secondary" label="Xem vị trí trên bản đồ" onPress={() => Linking.openURL(mapsLink(sos.lat!, sos.lng!))} />
        )}
        {neighbors.map((c) => (
          <Btn key={c.id} variant="secondary" label={`Gọi ${c.name} (gần nhà)`} onPress={() => call(c.phone)} />
        ))}
        {others.map((o) => (
          <Btn key={o.id} variant="secondary" label={`Gọi ${o.call.toLowerCase()} ${o.name}`} onPress={() => call(o.phone)} />
        ))}
        <Btn variant="secondary" label="Gọi cấp cứu 115" onPress={() => call('115')} />
        <View style={{ flex: 1 }} />
        <Btn variant="light" label={`Đã liên lạc, ${callName} ổn rồi`} onPress={close} />
      </Screen>
    );
  }

  return (
    <Screen bg={urgent ? colors.redSoft : colors.bg}>
      <Back onPress={() => goBack('/child')} />
      <T size={14} weight="700" color={urgent ? colors.red : colors.amberDark}>
        {urgent ? 'KHẨN CẤP' : soft ? 'THÔNG BÁO' : 'CẦN CHÚ Ý'} · {hm(now)}
      </T>
      <H1 size={26} color={urgent ? colors.redDark : colors.ink}>{a?.title ?? `${displayName(m)} hiện không có cảnh báo`}</H1>
      {a?.detail && <T size={17} color={colors.muted}>{a.detail}</T>}

      {kind === 'no-signal' && (
        <>
          <Card style={{ gap: 6 }}>
            <T size={16}>
              Tín hiệu cuối lúc <T size={16} weight="700">{m.lastSeenAt ? hm(local(m.lastSeenAt)) : '—'}</T>
              {m.battery != null ? (
                <>
                  , pin còn <T size={16} weight="700" color={m.battery <= 15 ? colors.red : colors.ink}>{m.battery}%</T>
                </>
              ) : null}
              . Đây chưa phải cảnh báo khẩn cấp.
            </T>
          </Card>
          <Card style={{ gap: 4 }}>
            <T size={15} weight="700">Thường là do</T>
            <T size={15}>• Điện thoại hết pin{m.battery != null && m.battery <= 20 ? ' (khả năng cao nhất)' : ''}</T>
            <T size={15}>• Mất sóng hoặc tắt mạng</T>
            <T size={15}>• Máy tự tắt An Tâm để tiết kiệm pin</T>
          </Card>
          <T size={14} color={colors.muted}>An Tâm sẽ tự cập nhật khi máy của {callName} có tín hiệu lại.</T>
        </>
      )}

      {kind === 'low-battery' && m.battery != null && (
        <Card style={{ gap: 6 }}>
          <T size={16}>
            Pin còn <T size={16} weight="700" color={colors.red}>{m.battery}%</T>
            {m.lastSeenAt ? <> lúc <T size={16} weight="700">{hm(local(m.lastSeenAt))}</T></> : null}. Hết pin thì máy của {callName} sẽ không nhắc thuốc và không gửi được SOS.
          </T>
        </Card>
      )}

      {kind !== 'no-signal' && (
        <Card style={{ gap: 0 }}>
          <T size={15} weight="700" style={{ marginBottom: 4 }}>Hôm nay của {callName}</T>
          <Fact label="Điểm danh" value={checkin ? `${hm(local(checkin.at))} · ${MOOD[checkin.mood]}` : 'Chưa'} warn={!checkin} />
          <Fact
            label="Thuốc"
            value={slots.length ? `${slots.filter((s) => s.status === 'taken').length}/${slots.length} lần` : 'Chưa có lịch'}
            warn={late.length > 0}
          />
          {late.map((s) => (
            <Fact key={s.time} label={`Thuốc ${s.time}`} value={`chưa xác nhận · trễ ${formatDuration(s.minutesLate)}`} warn />
          ))}
          {m.lastSeenAt && <Fact label={`Điện thoại của ${callName}`} value={`mở lần cuối ${hm(local(m.lastSeenAt))}`} />}
          {checkin?.symptoms.length ? <Fact label="Triệu chứng" value={checkin.symptoms.join(', ')} warn /> : null}
        </Card>
      )}

      {sos?.lat != null && sos.lng != null && (
        <Btn variant="secondary" label="Xem vị trí trên bản đồ" onPress={() => Linking.openURL(mapsLink(sos.lat!, sos.lng!))} />
      )}

      {m.phone ? (
        <Btn variant={urgent ? 'danger' : 'primary'} height={64} size={20} label={`Gọi ${callName} ngay`} onPress={() => call(m.phone)} />
      ) : (
        <Btn variant="secondary" label={`Thêm số điện thoại của ${callName} để gọi nhanh`} onPress={() => router.push('/child/family')} />
      )}
      {others.map((o) => (
        <Btn key={o.id} variant="secondary" label={`Gọi ${o.call.toLowerCase()} ${o.name}`} onPress={() => call(o.phone)} />
      ))}
      {(urgent ? neighbors : caregivers.slice(1, 3)).map((c) => (
        <Btn key={c.id} variant="secondary" label={`Gọi ${c.name}${c.sosOnly ? ' (hàng xóm)' : ''}`} onPress={() => call(c.phone)} />
      ))}
      {urgent && <Btn variant="ghost" label="Gọi cấp cứu 115" onPress={() => call('115')} />}

      {kind === 'no-signal' && (
        <>
          <Btn variant="ghost" label={howTo ? 'Ẩn hướng dẫn' : 'Cách cài để máy không tắt An Tâm'} onPress={() => setHowTo((x) => !x)} />
          {howTo && (
            <Banner tone="blue">
              {Platform.OS === 'ios' ? (
                <T size={15} color={colors.blueDark}>
                  Trên iPhone của {callName}: Cài đặt › Cài đặt chung › Làm mới ứng dụng trong nền › bật cho An Tâm. Không vuốt tắt An Tâm khỏi danh sách ứng dụng.
                </T>
              ) : (
                <T size={15} color={colors.blueDark}>
                  Trên điện thoại Android của {callName}: Cài đặt › Ứng dụng › An Tâm › Pin › chọn “Không hạn chế”. Trên máy Xiaomi, Oppo, Vivo: bật thêm “Tự khởi động”.
                </T>
              )}
            </Banner>
          )}
        </>
      )}

      {a && (
        <Btn variant="ghost" label={kind === 'no-signal' ? 'Đã liên lạc được, tắt thông báo' : kind === 'low-battery' ? `Đã nhắc ${callName} sạc pin, tắt thông báo` : `${m.call} ổn rồi, tắt cảnh báo`} onPress={close} />
      )}
    </Screen>
  );
}
