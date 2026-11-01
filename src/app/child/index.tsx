import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { alertKey, familyAlerts, memberAlerts, memberStatus, type FamilyAlert } from '../../domain/alerts';
import { slotsForDay } from '../../domain/schedule';
import { dateKey, formatShortDate, hm } from '../../domain/time';
import type { Member } from '../../domain/types';
import { call } from '../../services/phone';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const TONE = {
  urgent: { bg: colors.redSoft, fg: '#7A1A11' },
  warn: { bg: colors.amberSoft, fg: colors.amberDark },
  info: { bg: colors.blueSoft, fg: colors.blueDark },
};
const STATUS = {
  ok: { label: 'Ổn', bg: colors.greenSoft, fg: colors.greenDark },
  attention: { label: 'Cần chú ý', bg: colors.amberSoft, fg: colors.amberDark },
  urgent: { label: 'Khẩn cấp', bg: colors.redSoft, fg: '#7A1A11' },
};
const MOOD = { good: 'Khỏe', tired: 'Hơi mệt', unwell: 'Không khỏe' };

function AlertRow({ a, member }: { a: FamilyAlert; member?: Member }) {
  const t = TONE[a.level];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a.title}. Xem chi tiết`}
      onPress={() => router.push({ pathname: '/child/alert', params: { memberId: a.memberId, kind: a.kind } })}
      style={({ pressed }) => ({ backgroundColor: t.bg, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <T size={16} weight="700" color={t.fg}>{a.title}</T>
        {!!a.detail && <T size={14} color={t.fg}>{a.detail}</T>}
        <T size={13} weight="600" color={t.fg}>Xem chi tiết ›</T>
      </View>
      {member?.phone && a.level !== 'info' ? (
        <Btn label={`Gọi ${member.call.toLowerCase()}`} height={40} size={14} variant={a.level === 'urgent' ? 'danger' : 'primary'} onPress={() => call(member.phone)} />
      ) : null}
    </Pressable>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ width: '48%', backgroundColor: warn ? colors.amberSoft : colors.bg, borderRadius: 12, padding: 10 }}>
      <T size={12} color={warn ? colors.amberDark : colors.muted}>{label}</T>
      <T size={14} weight="700" color={warn ? colors.amberDark : colors.ink}>{value}</T>
    </View>
  );
}

export default function ChildHome() {
  const { data, now, syncError } = useStore();
  const alerts = familyAlerts(data, now).filter(
    (a) => a.level !== 'info' && !data.dismissed?.includes(alertKey(a.memberId, a.kind, now)),
  );
  const today = dateKey(now);
  const me = [...data.caregivers].sort((a, b) => a.order - b.order)[0];

  return (
    <Screen>
      <T size={14} color={colors.muted}>{me ? `Chào ${me.name} · ` : ''}{formatShortDate(now)}</T>
      <H1 size={26}>Bố mẹ hôm nay</H1>

      {!data.members.length && (
        <Card>
          <T size={16} weight="700">Chưa có ai trong gia đình</T>
          <Btn label="Thêm bố hoặc mẹ" onPress={() => router.push('/onboarding/invite')} />
        </Card>
      )}

      {alerts.map((a, i) => (
        <AlertRow key={`${a.kind}-${i}`} a={a} member={data.members.find((m) => m.id === a.memberId)} />
      ))}

      {data.members.map((m) => {
        const st = STATUS[memberStatus(memberAlerts(data, m, now))];
        const slots = slotsForDay(data.medications, data.doseLogs, m.id, now, now, data.settings.lateMinutes);
        const done = slots.filter((s) => s.status === 'taken').length;
        const late = slots.some((s) => s.status === 'late');
        const c = [...data.checkins].reverse().find((x) => x.memberId === m.id && dateKey(new Date(x.at)) === today);
        const bp = [...data.bpReadings].reverse().find((x) => x.memberId === m.id);
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`${displayName(m)}, ${st.label}. Xem chi tiết`}
            onPress={() => router.push({ pathname: '/child/member/[id]', params: { id: m.id } })}
          >
            <Card style={{ gap: 12, borderWidth: st.label === 'Ổn' ? 0 : 2, borderColor: '#F2C9A5' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={20} weight="700" color={st.fg}>{m.call[0]}</T>
                </View>
                <T size={18} weight="700" style={{ flex: 1 }}>{displayName(m)} ›</T>
                <View style={{ backgroundColor: st.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <T size={13} weight="700" color={st.fg}>{st.label}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
                <Stat label="Điểm danh" value={c ? `${hm(new Date(c.at))} · ${MOOD[c.mood]}` : 'Chưa'} warn={!c} />
                <Stat label="Thuốc hôm nay" value={slots.length ? `${done}/${slots.length} lần${late ? ' · trễ' : ''}` : 'Chưa có lịch'} warn={late} />
                <Stat label="Huyết áp gần nhất" value={bp ? `${bp.sys}/${bp.dia}` : 'Chưa đo'} />
                <Stat label="Triệu chứng" value={c?.symptoms.length ? c.symptoms.join(', ') : 'Không'} />
              </View>
            </Card>
          </Pressable>
        );
      })}

      {!data.familyId || data.demo ? (
        <Banner tone="blue">
          <T size={13} color={colors.blueDark}>
            Bản thử: dữ liệu đang lưu trên máy này. Khi nối máy chủ, thông tin từ máy của bố mẹ sẽ tự cập nhật ở đây.
          </T>
        </Banner>
      ) : (
        syncError && (
          <Banner tone="blue">
            <T size={13} color={colors.blueDark}>
              Chưa cập nhật được từ máy chủ. Kiểm tra kết nối mạng.
            </T>
          </Banner>
        )
      )}
    </Screen>
  );
}
