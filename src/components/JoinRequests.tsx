// Trên máy con: có máy mới xin vào gia đình (bố mẹ vừa nhập mã) → Đồng ý / Từ chối.
import { useState } from 'react';
import { View } from 'react-native';
import { hm } from '../domain/time';
import { notify } from '../services/dialog';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, Card, T } from './ui';

export function JoinRequests() {
  const { data, joinRequests, decideJoin } = useStore();
  const [busy, setBusy] = useState<string>();
  if (!joinRequests.length) return null;
  return (
    <>
      {joinRequests.map((r) => {
        const m = data.members.find((x) => x.id === r.memberId);
        const who = m ? `${m.call.toLowerCase()} ${m.name}` : 'bố mẹ';
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
            <T size={17} weight="700">Có máy xin kết nối làm máy của {who}</T>
            <T size={14} color={colors.muted}>
              {r.device ?? 'Điện thoại'}{r.at ? ` · lúc ${hm(new Date(r.at))}` : ''}. Chỉ đồng ý nếu đúng là {who} vừa nhập mã.
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Đồng ý" height={48} size={16} disabled={busy === r.uid} onPress={() => decide(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn variant="secondary" label="Từ chối" height={48} size={16} disabled={busy === r.uid} onPress={() => decide(false)} />
              </View>
            </View>
          </Card>
        );
      })}
    </>
  );
}
