// Bảng tóm tắt 30 ngày để đưa bác sĩ xem (hoặc gửi qua Zalo trước buổi khám).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Back, Btn, Card, Chip, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { doctorReport, reportText } from '../../domain/report';
import { notify } from '../../services/dialog';
import { track } from '../../services/usage';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

const dm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 100, backgroundColor: warn ? colors.amberSoft : colors.white, borderRadius: 16, padding: 12, gap: 2 }}>
      <T size={13} color={warn ? colors.amberDark : colors.muted}>{label}</T>
      <T size={22} weight="700" color={warn ? colors.amberDark : colors.ink}>{value}</T>
      {sub && <T size={12} color={warn ? colors.amberDark : colors.muted}>{sub}</T>}
    </View>
  );
}

/** Biểu đồ cột huyết áp tâm thu, có vạch mức cảnh báo. */
function BpBars({ readings, limit }: { readings: { at: string; sys: number; high: boolean }[]; limit: number }) {
  const top = Math.max(limit + 20, ...readings.map((r) => r.sys));
  const bottom = 80;
  const h = 120;
  const y = (v: number) => ((v - bottom) / (top - bottom)) * h;
  return (
    <View accessibilityLabel={`Biểu đồ ${readings.length} lần đo huyết áp`} style={{ height: h + 22 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 22 + y(limit), borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amber }} />
      <T size={11} color={colors.amberDark} style={{ position: 'absolute', right: 0, bottom: 24 + y(limit) }}>mức {limit}</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: h, marginBottom: 4 }}>
        {readings.map((r) => (
          <View key={r.at} style={{ flex: 1, height: Math.max(4, y(r.sys)), borderRadius: 3, backgroundColor: r.high ? colors.amber : colors.green }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={11} color={colors.muted}>{readings[0] ? dm(readings[0].at) : ''}</T>
        <T size={11} color={colors.muted}>{readings.length ? dm(readings[readings.length - 1].at) : ''}</T>
      </View>
    </View>
  );
}

export default function DoctorReportScreen() {
  const params = useLocalSearchParams<{ memberId?: string }>();
  const { data, now } = useStore();
  const [picked, setPicked] = useState<string>();
  const [days, setDays] = useState(30);
  const memberId = picked ?? params.memberId ?? data.members[0]?.id;
  const m = data.members.find((x) => x.id === memberId);
  if (!m) {
    return (
      <Screen>
        <Back onPress={() => router.back()} />
        <T size={16}>Chưa có ai trong gia đình.</T>
      </Screen>
    );
  }
  const r = doctorReport(data, m.id, now, days);
  const callName = m.call.toLowerCase();

  return (
    <Screen>
      <Back onPress={() => router.back()} />
      <H1 size={24}>Tình hình {days} ngày của {callName}</H1>
      <T size={14} color={colors.muted}>Đưa màn hình này cho bác sĩ xem, hoặc gửi trước qua Zalo.</T>
      {data.members.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {data.members.map((x) => <Chip key={x.id} label={displayName(x)} on={x.id === m.id} onPress={() => setPicked(x.id)} />)}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[7, 30, 90].map((d) => (
          <View key={d} style={{ flex: 1 }}>
            <Chip label={`${d} ngày`} on={d === days} onPress={() => setDays(d)} />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Tile
          label="Huyết áp trung bình"
          value={r.bp.avgSys ? `${r.bp.avgSys}/${r.bp.avgDia}` : '—'}
          sub={r.bp.readings.length ? `${r.bp.readings.length} lần đo` : 'chưa đo'}
          warn={r.bp.highCount > 0}
        />
        <Tile
          label="Uống thuốc"
          value={r.adherence.pct != null ? `${r.adherence.pct}%` : '—'}
          sub={r.adherence.scheduled ? `${r.adherence.taken}/${r.adherence.scheduled} lần` : 'chưa có lịch'}
          warn={r.adherence.pct != null && r.adherence.pct < 80}
        />
        <Tile label="Ngày báo mệt" value={String(r.moods.tired + r.moods.unwell)} sub={`trên ${r.moods.good + r.moods.tired + r.moods.unwell} ngày điểm danh`} />
      </View>

      <Card style={{ gap: 8 }}>
        <T size={15} weight="700">Huyết áp</T>
        {r.bp.readings.length ? (
          <>
            <BpBars readings={r.bp.readings} limit={data.settings.bpSys} />
            <T size={14}>
              Cao nhất <T size={14} weight="700">{r.bp.maxSys}/{r.bp.maxDia}</T> · {r.bp.highCount} lần từ mức {data.settings.bpSys}/{data.settings.bpDia} trở lên
            </T>
            {r.bp.readings.slice(-7).reverse().map((x) => (
              <View key={x.at} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingTop: 6 }}>
                <T size={14} color={colors.muted} style={{ width: 60 }}>{dm(x.at)}</T>
                <T size={14} weight="700" color={x.high ? colors.amberDark : colors.ink} style={{ flex: 1 }}>{x.sys}/{x.dia}</T>
                <T size={14} color={colors.muted}>mạch {x.pulse}</T>
              </View>
            ))}
          </>
        ) : (
          <T size={14} color={colors.muted}>Chưa đo lần nào trong {days} ngày.</T>
        )}
      </Card>

      <Card style={{ gap: 6 }}>
        <T size={15} weight="700">Uống thuốc</T>
        {r.adherence.scheduled ? (
          <>
            <T size={14}>Đã uống {r.adherence.taken}/{r.adherence.scheduled} lần, đúng giờ {r.adherence.onTime} lần.</T>
            {r.missedByMed.filter((x) => x.missed > 0).map((x) => (
              <T key={x.name} size={14} color={colors.amberDark}>• Bỏ lỡ {x.name}: {x.missed} lần</T>
            ))}
          </>
        ) : (
          <T size={14} color={colors.muted}>Chưa có lịch thuốc.</T>
        )}
      </Card>

      {!!r.symptoms.length && (
        <Card style={{ gap: 6 }}>
          <T size={15} weight="700">Triệu chứng tự báo</T>
          {r.symptoms.map((s) => <T key={s.name} size={14}>• {s.name}: {s.count} lần</T>)}
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <T size={15} weight="700">Thuốc đang dùng</T>
        {r.meds.map((x) => (
          <T key={x.name} size={14}>• {x.name}: {x.pills} viên × {x.times.join(', ')}{x.afterMeal ? ', sau ăn' : ''}</T>
        ))}
        {!r.meds.length && <T size={14} color={colors.muted}>Chưa có.</T>}
      </Card>

      <Btn
        variant="blue"
        label="Gửi cho bác sĩ / cả nhà (Zalo, tin nhắn...)"
        onPress={() =>
          Share.share({ message: reportText(m, r) })
            .then(() => track('report_shared'))
            .catch(() => notify('Chưa gửi được', 'Thử lại sau nhé.'))
        }
      />
      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        Số liệu do gia đình tự ghi trong app, chỉ để tham khảo, không thay thế khám bệnh.
      </T>
    </Screen>
  );
}
