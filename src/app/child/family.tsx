import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { confirm, notify } from '../../services/dialog';
import { JoinRequests } from '../../components/JoinRequests';
import { Btn, Card, Field, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { formatCode } from '../../domain/pairing';
import { validPhone } from '../../domain/phoneNumber';
import { familyInviteText } from '../../domain/inviteText';
import { formatShortDate, hm } from '../../domain/time';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function ChildFamily() {
  const { data, newPairing, upsertCaregiver, removeCaregiver, updateMember, setRole, setCurrentMember, loadDemo, reset, syncEnabled, now, newChildPairing } = useStore();
  const [adding, setAdding] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [sosOnly, setSosOnly] = useState(false);
  /** Đang sửa người nhận cảnh báo nào (undefined = đang thêm mới). */
  const [editId, setEditId] = useState<string>();
  const phoneOk = validPhone(cPhone);
  const closeForm = () => {
    setAdding(false);
    setEditId(undefined);
    setCName('');
    setCPhone('');
    setSosOnly(false);
  };
  // Đổi thứ tự gọi: đổi chỗ với người ngay trên / dưới.
  const move = (i: number, dir: -1 | 1) => {
    const a = caregivers[i];
    const b = caregivers[i + dir];
    if (!a || !b) return;
    upsertCaregiver({ ...a, order: b.order });
    upsertCaregiver({ ...b, order: a.order });
  };
  const caregivers = [...data.caregivers].sort((a, b) => a.order - b.order);
  // Đã nối máy chủ với gia đình thật: ẩn các nút chỉ dùng để thử (đổi vai trò, nạp dữ liệu mẫu).
  const connected = syncEnabled && !!data.familyId && !data.demo;
  const childCode = data.childPairing && new Date(data.childPairing.expiresAt) > now ? data.childPairing : undefined;

  return (
    <Screen>
      <H1 size={26}>Gia đình</H1>

      <JoinRequests />
      <Btn variant="secondary" label="🎁 Gói của gia đình và giới thiệu bạn bè" height={50} size={15} onPress={() => router.push('/child/plan')} />
      <T size={13} weight="700" color={colors.muted}>NGƯỜI ĐƯỢC CHĂM SÓC</T>
      {data.members.map((m) => {
        // Chỉ hiện mã còn hạn và chưa dùng (dùng rồi thì đã xóa khi con bấm Đồng ý).
        const p = data.pairing?.memberId === m.id && new Date(data.pairing.expiresAt) > now ? data.pairing : undefined;
        return (
          <Card key={m.id}>
            <T size={16} weight="700">{displayName(m)}</T>
            <T size={13} color={colors.muted}>App gọi “{m.call.toLowerCase()}”, xưng “{m.self.toLowerCase()}”</T>
            <Field label="Số điện thoại" value={m.phone ?? ''} onChange={(v) => updateMember(m.id, { phone: v })} keyboard="phone-pad" />
            {p && (
              <View style={{ gap: 2 }}>
                <T size={15} weight="700" color={colors.green}>Mã kết nối: {formatCode(p.code)}</T>
                <T size={13} color={colors.muted}>
                  Nhập trên máy của {m.call.toLowerCase()}, hết hạn {hm(new Date(p.expiresAt))} {formatShortDate(new Date(p.expiresAt))}
                </T>
              </View>
            )}
            <Btn
              variant="secondary"
              label={p ? 'Tạo mã khác' : `Tạo mã kết nối cho máy của ${m.call.toLowerCase()}`}
              height={44}
              size={14}
              onPress={() => newPairing(m.id).catch(() => notify('Chưa tạo được mã', 'Kiểm tra kết nối mạng rồi thử lại.'))}
            />
          </Card>
        );
      })}
      <Btn variant="ghost" label="+ Thêm bố, mẹ, ông, bà" onPress={() => router.push('/onboarding/invite')} />

      <T size={13} weight="700" color={colors.muted}>NHẬN CẢNH BÁO (THEO THỨ TỰ)</T>
      <Card style={{ gap: 10 }}>
        {caregivers.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.sosOnly ? colors.amber : colors.green, alignItems: 'center', justifyContent: 'center' }}>
              <T size={14} weight="700" color={colors.white}>{i + 1}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={15} weight="700">{c.name}</T>
              <T size={13} color={c.phone && !validPhone(c.phone) ? colors.red : colors.muted}>
                {c.phone ? (validPhone(c.phone) ? c.phone : `${c.phone} (số chưa đúng)`) : 'Chưa có số'}{c.sosOnly ? ' · chỉ khi SOS' : ''}
              </T>
            </View>
            <Btn variant="ghost" label="↑" accessibilityLabel={`Đưa ${c.name} lên trước`} height={36} size={16} disabled={i === 0} onPress={() => move(i, -1)} />
            <Btn variant="ghost" label="↓" accessibilityLabel={`Đưa ${c.name} xuống sau`} height={36} size={16} disabled={i === caregivers.length - 1} onPress={() => move(i, 1)} />
            <Btn variant="ghost" label="Sửa" height={36} size={13} onPress={() => { setEditId(c.id); setCName(c.name); setCPhone(c.phone); setSosOnly(!!c.sosOnly); setAdding(true); }} />
            <Btn variant="ghost" label="Bỏ" height={36} size={13} onPress={() =>
              confirm(`Bỏ ${c.name}?`, `${c.name} sẽ không nhận cảnh báo nữa.`, 'Bỏ').then((ok) => ok && removeCaregiver(c.id))
            } />
          </View>
        ))}
        {adding ? (
          <View style={{ gap: 8 }}>
            <Field maxLength={60} label="Tên" value={cName} onChange={setCName} />
            <Field label="Số điện thoại" value={cPhone} onChange={setCPhone} keyboard="phone-pad" />
            {!!cPhone && !phoneOk && <T size={13} color={colors.red}>Số điện thoại chưa đúng (cần 9–11 chữ số). Khi SOS máy sẽ gọi số này.</T>}
            <Btn variant="secondary" height={44} size={14} label={sosOnly ? 'Chỉ báo khi SOS: Có' : 'Chỉ báo khi SOS: Không'} onPress={() => setSosOnly((x) => !x)} />
            <Btn
              label={editId ? 'Lưu' : 'Thêm'}
              disabled={!cName.trim() || !phoneOk}
              onPress={() => {
                const old = caregivers.find((x) => x.id === editId);
                upsertCaregiver({ id: editId, name: cName.trim(), phone: cPhone.trim(), order: old?.order ?? Math.max(0, ...caregivers.map((x) => x.order)) + 1, sosOnly });
                closeForm();
              }}
            />
            <Btn variant="ghost" label="Hủy" height={40} size={14} onPress={closeForm} />
          </View>
        ) : (
          <Btn variant="ghost" label="+ Thêm người nhận cảnh báo" onPress={() => setAdding(true)} />
        )}
      </Card>

      {connected && (
        <>
          <T size={13} weight="700" color={colors.muted}>NGƯỜI CÙNG THEO DÕI</T>
          <Card style={{ gap: 8 }}>
            <T size={16} weight="700">Mời anh chị em cùng theo dõi bố mẹ</T>
            <T size={14} color={colors.muted}>
              Cả nhà cùng nhận cảnh báo, cùng xem thuốc và lịch khám. Tạo mã rồi gửi qua Zalo. Trên máy của họ: cài An Tâm › “Người nhà mời tôi cùng theo dõi” › nhập mã. Bạn bấm Đồng ý ở đây là xong. Mã dùng trong 1 giờ. Đổi điện thoại cũng dùng mã này (nhờ anh chị em tạo), hoặc lấy lại bằng email đã liên kết trong Cài đặt.
            </T>
            {childCode && (
              <View style={{ gap: 2 }}>
                <T size={15} weight="700" color={colors.green}>Mã mời: {formatCode(childCode.code)}</T>
                <T size={13} color={colors.muted}>Dùng 1 lần, hết hạn {hm(new Date(childCode.expiresAt))} {formatShortDate(new Date(childCode.expiresAt))}</T>
              </View>
            )}
            {childCode && (
              <Btn
                height={44}
                size={14}
                label="Gửi mã qua Zalo, tin nhắn"
                onPress={() =>
                  Share.share({
                    message: familyInviteText(childCode.code),
                  }).catch(() => undefined)
                }
              />
            )}
            <Btn
              variant="secondary"
              label={childCode ? 'Tạo mã khác' : 'Tạo mã mời người nhà'}
              height={44}
              size={14}
              onPress={() => newChildPairing().catch(() => notify('Chưa tạo được mã', 'Kiểm tra kết nối mạng rồi thử lại.'))}
            />
          </Card>
        </>
      )}

      {connected && <Btn variant="secondary" label="Các máy trong gia đình" onPress={() => router.push('/child/devices')} />}
      <Btn variant="secondary" label="Cài đặt (cảnh báo, cỡ chữ)" onPress={() => router.push('/child/settings')} />

      <T size={13} weight="700" color={colors.muted}>{connected ? 'DỮ LIỆU TRÊN MÁY NÀY' : 'BẢN THỬ'}</T>
      <Card style={{ gap: 8 }}>
        {!connected && (
          <T size={13} color={colors.muted}>
            {data.demo ? 'Đang xem dữ liệu mẫu.' : 'Chưa kết nối với máy của bố mẹ.'} Có thể thử cả hai vai trò trên một máy.
          </T>
        )}
        {!connected && data.members.map((m) => (
          <Btn
            key={m.id}
            variant="secondary"
            height={44}
            size={14}
            label={`Xem màn hình của ${m.call.toLowerCase()} ${m.name}`}
            onPress={() => {
              setCurrentMember(m.id);
              setRole('parent');
              router.replace('/parent');
            }}
          />
        ))}
        {!connected && <Btn variant="ghost" height={40} size={14} label="Nạp dữ liệu mẫu" onPress={loadDemo} />}
        <Btn
          variant="ghost"
          height={40}
          size={14}
          label="Xóa toàn bộ dữ liệu"
          onPress={() =>
            confirm('Xóa toàn bộ dữ liệu?', 'Không khôi phục được.', 'Xóa').then((ok) => {
              if (!ok) return;
              reset();
              router.replace('/');
            })
          }
        />
      </Card>
    </Screen>
  );
}
