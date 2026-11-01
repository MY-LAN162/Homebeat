// Các máy trong gia đình: xem máy nào đang có quyền xem dữ liệu; chủ gia đình gỡ máy mất / máy lạ,
// hoặc chuyển quyền chủ cho máy khác (khi đổi máy).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Back, Banner, Btn, Card, H1, Screen, T } from '../../components/ui';
import { confirm, notify } from '../../services/dialog';
import { goBack } from '../../services/nav';
import type { FamilyDevice } from '../../services/sync';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const platformName = (p?: string) => (p === 'ios' ? 'iPhone' : p === 'android' ? 'Điện thoại Android' : p === 'web' ? 'Trình duyệt' : 'Điện thoại');

export default function Devices() {
  const { data, listDevices, removeDevice, transferOwner } = useStore();
  const [list, setList] = useState<FamilyDevice[]>();
  const [err, setErr] = useState(false);

  const load = useCallback(
    () =>
      listDevices()
        .then((l) => {
          setErr(false);
          setList(l);
        })
        .catch(() => setErr(true)),
    [listDevices],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const iAmOwner = !!list?.find((d) => d.me)?.owner;
  const label = (d: FamilyDevice) => {
    if (d.role === 'parent') {
      const m = data.members.find((x) => x.id === d.memberId);
      return `Máy của ${m ? `${m.call.toLowerCase()} ${m.name}` : 'bố mẹ'}`;
    }
    return d.role === 'child' ? 'Máy của con, cháu' : 'Máy chưa rõ';
  };

  return (
    <Screen>
      <Back onPress={() => goBack('/child/family')} />
      <H1 size={24}>Các máy trong gia đình</H1>
      <T size={14} color={colors.muted}>Các máy dưới đây xem được thuốc, huyết áp, vị trí SOS của bố mẹ. Thấy máy lạ hoặc máy đã mất thì gỡ ngay.</T>
      {!list && !err && <ActivityIndicator color={colors.green} />}
      {err && (
        <Banner tone="amber">
          <T size={15} color={colors.amberDark}>Chưa tải được danh sách. Kiểm tra mạng rồi thử lại.</T>
          <Btn variant="secondary" label="Thử lại" height={40} size={14} onPress={load} />
        </Banner>
      )}
      {list?.map((d) => (
        <Card key={d.uid} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T size={16} weight="700">{label(d)}</T>
            {d.me && <T size={13} weight="700" color={colors.blue}>· máy này</T>}
            {d.owner && <T size={13} weight="700" color={colors.greenDark}>· quản lý gia đình</T>}
          </View>
          <T size={13} color={colors.muted}>{platformName(d.platform)}</T>
          {iAmOwner && !d.me && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn
                  variant="secondary"
                  label="Gỡ máy này"
                  height={42}
                  size={14}
                  onPress={() =>
                    confirm('Gỡ máy này khỏi gia đình?', `${label(d)} sẽ không xem được dữ liệu nữa. Muốn dùng lại phải nhập mã mới.`, 'Gỡ').then(
                      async (ok) => {
                        if (!ok) return;
                        try {
                          await removeDevice(d.uid);
                          load();
                        } catch {
                          notify('Chưa gỡ được', 'Kiểm tra mạng rồi thử lại.');
                        }
                      },
                    )
                  }
                />
              </View>
              {d.role === 'child' && (
                <View style={{ flex: 1 }}>
                  <Btn
                    variant="ghost"
                    label="Chuyển quyền quản lý"
                    height={42}
                    size={14}
                    onPress={() =>
                      confirm('Chuyển quyền quản lý?', 'Máy kia sẽ là máy duy nhất gỡ được các máy khác. Máy này vẫn trong gia đình.', 'Chuyển').then(
                        async (ok) => {
                          if (!ok) return;
                          try {
                            await transferOwner(d.uid);
                            load();
                          } catch {
                            notify('Chưa chuyển được', 'Kiểm tra mạng rồi thử lại.');
                          }
                        },
                      )
                    }
                  />
                </View>
              )}
            </View>
          )}
        </Card>
      ))}
      {list && !iAmOwner && (
        <T size={13} color={colors.muted}>Chỉ máy “quản lý gia đình” mới gỡ được máy khác.</T>
      )}
      {list && iAmOwner && (
        <Banner tone="blue">
          <T size={14} color={colors.blueDark}>
            Máy này đang quản lý gia đình. Nên liên kết email trong Cài đặt: lỡ mất máy vẫn lấy lại được quyền quản lý.
          </T>
        </Banner>
      )}
    </Screen>
  );
}
