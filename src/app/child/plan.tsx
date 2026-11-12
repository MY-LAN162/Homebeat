// Gói của gia đình: dùng thử, chọn gói, mã giới thiệu của gia đình, nhập mã của gia đình khác.
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Back, Banner, Btn, Card, Chip, Field, H1, Screen, T } from '../../components/ui';
import {
  entitlement, PLANS, planOf, priceFor, REF_MONTHS, REF_NEW_PCT, REF_OLD_PCT, referralText, refRewardActive, refRewardUntil,
  TRIAL_DAYS, vnd, type Period,
} from '../../domain/billing';
import { formatShortDate } from '../../domain/time';
import { notify } from '../../services/dialog';
import { goBack } from '../../services/nav';
import { storeReady } from '../../services/purchases';
import { track } from '../../services/usage';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function PlanScreen() {
  const { data, now, purchase, enterReferral } = useStore();
  const [period, setPeriod] = useState<Period>('m');
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const b = data.billing;
  const uses = data.refUses ?? [];

  if (!b) {
    return (
      <Screen>
        <Back onPress={() => goBack('/child/family')} />
        <H1 size={24}>Gói của gia đình</H1>
        <T size={16} color={colors.muted}>Đang tải thông tin gói…</T>
      </Screen>
    );
  }

  const ent = entitlement(b, now);
  const cur = planOf(b.plan);
  const rewardUntil = refRewardUntil(uses);

  const choose = async (planId: (typeof PLANS)[number]['id']) => {
    setBusy(true);
    track(`plan_choose_${planId}_${period}`);
    const r = await purchase(planId, period).catch(() => 'error' as const);
    setBusy(false);
    if (r === 'ok') notify('Cảm ơn bạn', 'Gia đình đã được gia hạn.');
    else if (r === 'not-ready')
      notify('Sắp mở thanh toán', 'Thanh toán qua Google Play và App Store sẽ mở khi An Tâm lên cửa hàng. Trong thời gian thử nghiệm, mọi tính năng đều miễn phí.');
    else if (r === 'error') notify('Chưa thanh toán được', 'Kiểm tra mạng rồi thử lại.');
  };

  return (
    <Screen>
      <Back onPress={() => goBack('/child/family')} />
      <H1 size={24}>Gói của gia đình</H1>

      <Card style={{ gap: 6, backgroundColor: ent.state === 'expired' ? colors.amberSoft : colors.greenSoft }}>
        {ent.state === 'trial' && (
          <>
            <T size={18} weight="700" color={colors.greenDark}>Đang dùng thử miễn phí · còn {ent.daysLeft} ngày</T>
            <T size={15} color={colors.greenDark}>Tới hết ngày {formatShortDate(ent.trialEndsAt)}. Đủ tính năng, không tự trừ tiền.</T>
          </>
        )}
        {ent.state === 'active' && (
          <>
            <T size={18} weight="700" color={colors.greenDark}>Gói {cur?.name ?? ''} · còn {ent.daysLeft} ngày</T>
            <T size={15} color={colors.greenDark}>Đã trả tới {b.paidUntil ? formatShortDate(new Date(b.paidUntil)) : ''}.</T>
          </>
        )}
        {ent.state === 'expired' && (
          <>
            <T size={18} weight="700" color={colors.amberDark}>Đã hết {TRIAL_DAYS} ngày dùng thử</T>
            <T size={15} color={colors.amberDark}>Nút SOS và chuông nhắc thuốc trên máy bố mẹ vẫn chạy, miễn phí mãi mãi.</T>
          </>
        )}
      </Card>

      {!storeReady && (
        <Banner tone="blue">
          <T size={14} color={colors.blueDark}>
            Đang thử nghiệm: mọi tính năng miễn phí. Thanh toán qua Google Play / App Store sẽ mở khi An Tâm lên cửa hàng.
          </T>
        </Banner>
      )}

      <T size={13} weight="700" color={colors.muted}>CHỌN GÓI</T>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Theo tháng" on={period === 'm'} onPress={() => setPeriod('m')} />
        <Chip label="Theo năm (tặng 2 tháng)" on={period === 'y'} onPress={() => setPeriod('y')} />
      </View>
      {PLANS.map((p) => {
        const pr = priceFor(b, p.id, period, uses, now);
        const mine = b.plan === p.id && ent.state === 'active';
        return (
          <Card key={p.id} style={{ gap: 6, borderWidth: 2, borderColor: p.id === 'medium' ? colors.green : colors.white }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={18} weight="700" style={{ flex: 1 }}>Gói {p.name}</T>
              {p.id === 'medium' && <T size={12} weight="700" color={colors.green}>NHIỀU NHÀ CHỌN</T>}
            </View>
            <T size={14} color={colors.muted}>Tối đa {p.members} thành viên · chăm sóc tối đa {p.careFor} người</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <T size={24} weight="700">{vnd(pr.price)}</T>
              <T size={14} color={colors.muted}>/{period === 'm' ? 'tháng' : 'năm'}</T>
              {pr.pct > 0 && <T size={14} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>{vnd(pr.base)}</T>}
              {pr.pct > 0 && <T size={13} weight="700" color={colors.red}>−{pr.pct}%{period === 'y' ? ' cho 2 tháng đầu' : ''}</T>}
            </View>
            <Btn
              variant={p.id === 'medium' ? 'primary' : 'secondary'}
              label={mine ? 'Gia hạn gói này' : `Chọn gói ${p.name}`}
              height={46}
              size={15}
              disabled={busy}
              onPress={() => void choose(p.id)}
            />
          </Card>
        );
      })}

      <T size={13} weight="700" color={colors.muted}>GIỚI THIỆU BẠN BÈ</T>
      <Card style={{ gap: 10 }}>
        <T size={15}>
          Gia đình bạn giới thiệu được giảm <T size={15} weight="700">{REF_NEW_PCT}%</T>, bạn được giảm{' '}
          <T size={15} weight="700">{REF_OLD_PCT}%</T>, trong {REF_MONTHS} tháng đầu sau khi họ hết dùng thử và bắt đầu trả phí.
        </T>
        <View style={{ alignItems: 'center', gap: 2, paddingVertical: 6 }}>
          <T size={13} color={colors.muted}>Mã giới thiệu của gia đình bạn</T>
          <T size={36} weight="700" color={colors.green} style={{ letterSpacing: 6 }}>{b.refCode}</T>
        </View>
        <Btn
          variant="blue"
          label="Gửi mã qua Zalo, tin nhắn"
          onPress={() => {
            track('referral_share');
            Share.share({ message: referralText(b.refCode) }).catch(() => undefined);
          }}
        />
        <T size={14} color={colors.muted}>
          {uses.length
            ? `Đã giới thiệu thành công ${uses.length} gia đình.${rewardUntil && refRewardActive(uses, now) ? ` Bạn đang được giảm ${REF_OLD_PCT}% tới ${formatShortDate(rewardUntil)}.` : ''}`
            : 'Chưa có gia đình nào dùng mã của bạn bắt đầu trả phí.'}
        </T>
        <T size={12} color={colors.muted}>
          Giới thiệu nhiều gia đình: mức giảm vẫn là {REF_OLD_PCT}%, mỗi gia đình cộng thêm {REF_MONTHS} tháng được giảm.
        </T>
      </Card>

      {b.referredBy ? (
        <Banner tone="green">
          <T size={15} weight="700" color={colors.greenDark}>
            ✓ Đã nhập mã giới thiệu {b.referredBy}: giảm {REF_NEW_PCT}% {REF_MONTHS} tháng đầu trả phí.
          </T>
        </Banner>
      ) : (
        !b.firstPaidAt && (
          <Card style={{ gap: 8 }}>
            <T size={15} weight="700">Có mã giới thiệu từ người quen?</T>
            <Field label="Mã giới thiệu (6 ký tự)" value={code} onChange={(v) => { setCode(v); setCodeMsg(undefined); }} placeholder="Ví dụ: K7M2QX" />
            {codeMsg && <T size={14} color={codeMsg.ok ? colors.greenDark : colors.red}>{codeMsg.text}</T>}
            <Btn
              variant="secondary"
              label="Áp dụng mã"
              height={46}
              size={15}
              disabled={!code.trim() || busy}
              onPress={async () => {
                setBusy(true);
                const r = await enterReferral(code).catch(() => ({ ok: false as const, reason: 'Chưa kiểm tra được mã. Kiểm tra mạng rồi thử lại.' }));
                setBusy(false);
                setCodeMsg(r.ok ? { ok: true, text: `Đã áp dụng. Gia đình được giảm ${REF_NEW_PCT}% ${REF_MONTHS} tháng đầu trả phí.` } : { ok: false, text: r.reason });
                if (r.ok) track('referral_entered');
              }}
            />
          </Card>
        )
      )}

      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        Hai mức giảm không cộng nhau: nếu vừa được giới thiệu vừa giới thiệu người khác thì lấy mức cao hơn. Hủy gói lúc nào cũng được trong cài đặt của Google Play / App Store.
      </T>
    </Screen>
  );
}
