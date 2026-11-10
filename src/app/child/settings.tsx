import { router } from 'expo-router';
import { goBack } from '../../services/nav';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Back, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import { authErrorText } from '../../services/authErrors';
import { confirm, notify } from '../../services/dialog';
import { canLock, unlock } from '../../services/lock';
import { deviceTimeZone, TIME_ZONES, zoneLabel } from '../../domain/tz';
import { useStore } from '../../state/store';
import { NotifCard } from '../../components/NotifCard';
import { colors } from '../../theme';

function Group<V extends string | number>({
  title,
  options,
  value,
  onPick,
  label,
}: {
  title: string;
  options: V[];
  value: V;
  onPick: (v: V) => void;
  label: (v: V) => string;
}) {
  return (
    <Card>
      <T size={15} weight="700">{title}</T>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((o) => (
          <View key={String(o)} style={{ flex: 1 }}>
            <Chip label={label(o)} on={o === value} onPress={() => onPick(o)} size={14} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Liên kết email để đổi điện thoại vẫn lấy lại được gia đình (miễn phí). */
function AccountCard() {
  const { linkedEmail, linkEmail } = useStore();
  const [email, setEmail] = useState<string>();
  const [form, setForm] = useState({ email: '', pass: '', pass2: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    linkedEmail().then(setEmail).catch(() => undefined);
  }, [linkedEmail]);
  const ok = /^\S+@\S+\.\S+$/.test(form.email.trim()) && form.pass.length >= 8 && form.pass === form.pass2;
  return (
    <Card style={{ gap: 8 }}>
      <T size={15} weight="700">Bảo vệ khi đổi điện thoại</T>
      {email ? (
        <T size={14} color={colors.greenDark}>✓ Đã liên kết email {email}. Đổi máy thì chọn “Lấy lại gia đình đã có” rồi đăng nhập email này.</T>
      ) : (
        <>
          <T size={13} color={colors.muted}>
            Liên kết email và mật khẩu để khi đổi máy hoặc cài lại app vẫn vào lại được gia đình. Không liên kết thì cần người nhà tạo mã cho máy mới.
          </T>
          <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} keyboard="email-address" placeholder="ten@gmail.com" />
          <Field label="Mật khẩu (ít nhất 8 ký tự)" value={form.pass} onChange={(v) => setForm((f) => ({ ...f, pass: v }))} secure />
          <Field label="Nhập lại mật khẩu" value={form.pass2} onChange={(v) => setForm((f) => ({ ...f, pass2: v }))} secure />
          {form.pass2.length > 0 && form.pass !== form.pass2 && <T size={13} color={colors.red}>Hai mật khẩu chưa giống nhau.</T>}
          {err && <T size={14} color={colors.red} weight="600">{err}</T>}
          <Btn
            variant="secondary"
            height={44}
            size={15}
            label={busy ? 'Đang liên kết...' : 'Liên kết email'}
            disabled={!ok || busy}
            onPress={async () => {
              setBusy(true);
              setErr(undefined);
              try {
                await linkEmail(form.email, form.pass);
                setEmail(form.email.trim());
              } catch (e) {
                setErr(authErrorText((e as { code?: string }).code));
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Card>
  );
}

/** Khóa app bằng vân tay / khuôn mặt / mã máy (chỉ hiện khi máy hỗ trợ). */
function LockCard() {
  const { data, setAppLock } = useStore();
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    canLock().then(setSupported).catch(() => undefined);
  }, []);
  if (!supported) return null;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <T size={15} weight="700">Khóa app bằng vân tay / khuôn mặt</T>
        <T size={13} color={colors.muted}>Người khác cầm máy bạn cũng không xem được thông tin sức khỏe của bố mẹ.</T>
      </View>
      <Switch
        accessibilityLabel="Khóa app bằng vân tay hoặc khuôn mặt"
        value={!!data.appLock}
        onValueChange={async (v) => {
          // Bật: xác nhận đúng chủ máy trước; tắt: cũng cần xác nhận.
          if (await unlock()) setAppLock(v);
        }}
        trackColor={{ true: colors.green }}
      />
    </Card>
  );
}

/** Quyền riêng tư; xóa dữ liệu gia đình (máy quản lý) hoặc rời gia đình (máy khác). */
function DataCard({ connected }: { connected: boolean }) {
  const { listDevices, deleteFamilyData, leaveFamily } = useStore();
  const [owner, setOwner] = useState<boolean>();
  useEffect(() => {
    if (!connected) return;
    listDevices()
      .then((l) => setOwner(!!l.find((d) => d.me)?.owner))
      .catch(() => undefined);
  }, [connected, listDevices]);
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      router.replace('/');
    } catch {
      notify('Chưa làm được', 'Kiểm tra kết nối mạng rồi thử lại.');
    }
  };
  return (
    <Card style={{ gap: 8 }}>
      <T size={15} weight="700">Dữ liệu và quyền riêng tư</T>
      <Btn variant="secondary" label="Chính sách quyền riêng tư" height={44} size={15} onPress={() => router.push('/privacy')} />
      {connected && owner === true && (
        <Btn
          variant="ghost"
          label="Xóa toàn bộ dữ liệu gia đình trên máy chủ"
          height={44}
          size={15}
          onPress={async () => {
            if (!(await confirm('Xóa toàn bộ dữ liệu gia đình?', 'Thuốc, nhật ký, huyết áp, lịch khám của cả gia đình trên máy chủ sẽ bị xóa. Các máy khác sẽ không còn dữ liệu. Không khôi phục được.', 'Tiếp tục'))) return;
            if (!(await confirm('Chắc chắn xóa?', 'Bấm "Xóa hẳn" để xóa vĩnh viễn.', 'Xóa hẳn'))) return;
            await run(deleteFamilyData);
          }}
        />
      )}
      {connected && owner === false && (
        <Btn
          variant="ghost"
          label="Rời khỏi gia đình"
          height={44}
          size={15}
          onPress={async () => {
            if (await confirm('Rời khỏi gia đình?', 'Máy này sẽ không xem được dữ liệu của gia đình nữa. Muốn vào lại phải nhập mã mới.', 'Rời'))
              await run(leaveFamily);
          }}
        />
      )}
    </Card>
  );
}

export default function AlertSettings() {
  const { data, updateSettings, setTextScale, syncEnabled } = useStore();
  const connected = syncEnabled && !!data.familyId && !data.demo;
  const scale = data.textScale ?? 1;
  const s = data.settings;
  const bpKey = `${s.bpSys}/${s.bpDia}`;
  const [pickTz, setPickTz] = useState(false);
  const mine = deviceTimeZone();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/child')} />
        <H1 size={22}>Cài đặt</H1>
      </View>
      {connected && <AccountCard />}
      <NotifCard onboarding />
      <LockCard />
      <Card style={{ gap: 8 }}>
        <T size={15} weight="700">Cỡ chữ trên máy này</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { k: 1, label: 'Bình thường' },
            { k: 1.15, label: 'Lớn' },
            { k: 1.3, label: 'Rất lớn' },
          ].map((o) => (
            <View key={o.k} style={{ flex: 1 }}>
              <Chip label={o.label} on={scale === o.k} onPress={() => setTextScale(o.k)} size={14} />
            </View>
          ))}
        </View>
        <T size={15} color={colors.muted}>Chữ mẫu: Bố Hùng chưa uống thuốc 12:00</T>
      </Card>
      <T size={13} weight="700" color={colors.muted}>KHI NÀO BÁO CHO CON? (ngưỡng càng ngắn càng dễ báo nhầm)</T>
      <Card style={{ gap: 8 }}>
        <T size={15} weight="700">Bố mẹ đang sống ở đâu?</T>
        <T size={13} color={colors.muted}>Giờ uống thuốc, giờ điểm danh, giờ ngủ tính theo giờ ở nơi này, kể cả khi bạn ở nước khác.</T>
        <T size={16} weight="700" color={colors.green}>{zoneLabel(s.timeZone)}</T>
        {!pickTz ? (
          <Btn variant="secondary" label="Đổi nơi sống" height={44} size={15} onPress={() => setPickTz(true)} />
        ) : (
          <View style={{ gap: 6 }}>
            {[{ id: undefined as string | undefined, label: `Theo giờ điện thoại này${mine ? ` (${mine})` : ''}` }, ...TIME_ZONES].map((z) => {
              const on = z.id === s.timeZone;
              return (
                <Pressable
                  key={z.id ?? 'device'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    updateSettings({ timeZone: z.id });
                    setPickTz(false);
                  }}
                  style={{ padding: 12, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.greenSoft : colors.white }}
                >
                  <T size={15} weight={on ? '700' : '400'}>{z.id ? zoneLabel(z.id) : z.label}</T>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
      <Group title="Trễ thuốc quá" options={[15, 30, 60]} value={s.lateMinutes} onPick={(v) => updateSettings({ lateMinutes: v })} label={(v) => `${v} phút`} />
      <Group title="Mất tín hiệu / không di chuyển quá" options={[2, 3, 5]} value={s.stillHours} onPick={(v) => updateSettings({ stillHours: v })} label={(v) => `${v} giờ`} />
      <Group title='Chưa bấm "ổn" trước' options={['09:00', '10:00', '12:00']} value={s.checkinBy} onPick={(v) => updateSettings({ checkinBy: v })} label={(v) => v} />
      <Group
        title="Huyết áp từ mức"
        options={['130/80', '140/90', '160/100']}
        value={bpKey}
        onPick={(v) => {
          const [sys, dia] = v.split('/').map(Number);
          updateSettings({ bpSys: sys, bpDia: dia });
        }}
        label={(v) => v}
      />
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T size={15} weight="700">Tự đọc to khi đến giờ uống thuốc</T>
          <T size={13} color={colors.muted}>Máy của bố mẹ đọc tên thuốc và số viên khi mở màn hình nhắc thuốc</T>
        </View>
        <Switch
          accessibilityLabel="Tự đọc to khi đến giờ uống thuốc"
          value={s.autoSpeak !== false}
          onValueChange={(v) => updateSettings({ autoSpeak: v })}
          trackColor={{ true: colors.green }}
        />
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T size={15} weight="700">Không tính giờ ngủ</T>
          <T size={13} color={colors.muted}>{s.sleepStart} – {s.sleepEnd} không báo mất tín hiệu</T>
        </View>
        <Switch
          accessibilityLabel="Không tính giờ ngủ"
          value={s.excludeSleep}
          onValueChange={(v) => updateSettings({ excludeSleep: v })}
          trackColor={{ true: colors.green }}
        />
      </Card>
      <T size={12} color={colors.muted}>
        Mức huyết áp là ngưỡng để báo cho con, không phải chẩn đoán. Nên hỏi bác sĩ của bố mẹ để đặt cho phù hợp.
      </T>
      <DataCard connected={connected} />
      <Btn variant="ghost" label="Mức sử dụng app (thử nghiệm)" height={44} size={15} onPress={() => router.push('/child/usage')} />
    </Screen>
  );
}
