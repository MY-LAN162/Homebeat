// Có máy mới (người nhà, hoặc máy mới của con) xin vào gia đình → Đồng ý / Từ chối. Hiện trên máy con (trang chủ, tab Gia đình)
// và trên máy bố mẹ (để bố mẹ duyệt máy mới của con khi con đổi điện thoại).
import { useState } from 'react';
import { View } from 'react-native';
import { hm } from '../domain/time';
import { notify } from '../services/dialog';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, Card, T } from './ui';

export function JoinRequests({ big = false }: { big?: boolean }) {
  const { data, joinRequests, decideJoin } = useStore();
  const [busy, setBusy] = useState<string>();
  if (!joinRequests.length) return null;
  const k = big ? 1.3 : 1;
  return (
    <>
      {joinRequests.map((r) => {
        const m = data.members.find((x) => x.id === r.memberId);
        const title =
          r.role === 'child'
            ? 'Có người nhà xin cùng theo dõi (máy của con, cháu)'
            : `Có máy xin kết nối làm máy của ${m ? `${m.call.toLowerCase()} ${m.name}` : 'bố mẹ'}`;
        const hint =
          r.role === 'child'
            ? 'Chỉ đồng ý nếu đúng là người nhà bạn vừa gửi mã (hoặc máy mới của chính bạn).'
            : `Chỉ đồng ý nếu đúng là ${m ? `${m.call.toLowerCase()} ${m.name}` : 'bố mẹ'} vừa nhập mã.`;
        const decide = async (ok: boolean) => {
          setBusy(r.uid);
          try {
            await decideJoin(r, ok);
          } catch {
            notify('Chưa gửi được', 'Kiểm tra kết nối mạng rồi thử lại.');
          } finally {
            setBusy(undefined);
          }
        };
        return (
          <Card key={r.uid} style={{ gap: 10, borderWidth: 2, borderColor: colors.blue }}>
            <T size={17 * k} weight="700">{title}</T>
            <T size={14 * k} color={colors.muted}>
              {r.device ?? 'Điện thoại'}{r.at ? ` · lúc ${hm(new Date(r.at))}` : ''}. {hint}
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Đồng ý" height={48 * k} size={16 * k} disabled={busy === r.uid} onPress={() => decide(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn variant="secondary" label="Từ chối" height={48 * k} size={16 * k} disabled={busy === r.uid} onPress={() => decide(false)} />
              </View>
            </View>
          </Card>
        );
      })}
    </>
  );
}
