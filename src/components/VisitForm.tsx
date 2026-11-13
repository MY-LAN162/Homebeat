// Form thêm / sửa lịch khám. Chọn ngày, giờ bằng nút bấm (14 ngày tới, giờ hay khám), vẫn gõ được ngày khác.
import { useState } from 'react';
import { View } from 'react-native';
import { displayName } from '../domain/address';
import { addDays, isValidTime } from '../domain/time';
import type { Appointment } from '../domain/types';
import { useStore } from '../state/store';
import { colors } from '../theme';
import { Btn, Card, Chip, Field, T } from './ui';

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const TIMES = ['07:00', '07:30', '08:00', '09:00', '10:00', '13:30', '14:00', '15:00'];

/** "30/9" -> Date (năm nay, hoặc năm sau nếu đã qua lâu). */
export function parseDay(input: string, time: string, now: Date): Date | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(input.trim());
  if (!m || !isValidTime(time)) return undefined;
  const [h, min] = time.split(':').map(Number);
  const d = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[1]), h, min);
  if (d.getDate() !== Number(m[1])) return undefined;
  if (d < now && now.getTime() - d.getTime() > 180 * 86400_000) d.setFullYear(d.getFullYear() + 1);
  return d;
}

const dm = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function VisitForm({ existing, onDone }: { existing?: Appointment; onDone: () => void }) {
  const { data, now, upsertAppointment } = useStore();
  const old = existing ? new Date(existing.at) : undefined;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [day, setDay] = useState(old ? dm(old) : '');
  const [time, setTime] = useState(old ? hhmm(old) : '08:00');
  const [companion, setCompanion] = useState(existing?.companion ?? '');
  const [picked, setMemberId] = useState<string>();
  const memberId = picked ?? existing?.memberId ?? data.members[0]?.id;
  // Nơi đã khám trước đây, để chọn lại nhanh.
  const usual = data.members.find((m) => m.id === memberId)?.hospital;
  const places = [...new Set([usual, ...data.appointments.map((a) => a.place)].filter((p): p is string => !!p))].slice(0, 4);
  const when = parseDay(day, time, now);
  const days = Array.from({ length: 14 }, (_, i) => addDays(now, i + 1));

  return (
    <Card style={{ gap: 10 }}>
      <T size={16} weight="700">{existing ? 'Sửa lịch khám' : 'Thêm lịch khám'}</T>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {data.members.map((m) => (
          <Chip key={m.id} label={displayName(m)} on={memberId === m.id} onPress={() => setMemberId(m.id)} />
        ))}
      </View>
      <Field label="Khám gì" value={title} onChange={setTitle} placeholder="Ví dụ: Tái khám tim mạch" />
      <Field label="Bệnh viện / phòng khám" value={place} onChange={setPlace} placeholder="Ví dụ: BV Chợ Rẫy, khoa Tim mạch" />
      {places.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {places.map((p) => <Chip key={p} label={p} on={place === p} size={13} onPress={() => setPlace(p)} />)}
        </View>
      )}
      <T size={14} weight="600">Ngày khám</T>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {days.map((d) => (
          <Chip key={d.toDateString()} label={`${WEEKDAY[d.getDay()]} ${dm(d)}`} on={day === dm(d)} size={13} onPress={() => setDay(dm(d))} />
        ))}
      </View>
      <Field label="Hoặc gõ ngày khác (ngày/tháng)" value={day} onChange={setDay} placeholder="30/12" />
      <T size={14} weight="600">Giờ khám</T>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {TIMES.map((t) => <Chip key={t} label={t} on={time === t} size={13} onPress={() => setTime(t)} />)}
      </View>
      <Field label="Hoặc gõ giờ khác" value={time} onChange={setTime} placeholder="08:00" />
      {!!day && !when && <T size={13} color={colors.red}>Ngày hoặc giờ chưa đúng (ví dụ ngày 30/12, giờ 08:00).</T>}
      <Field maxLength={60} label="Ai đưa đi" value={companion} onChange={setCompanion} placeholder="Ví dụ: Hà" />
      <Btn
        label="Lưu lịch khám"
        disabled={!title.trim() || !when || !memberId}
        onPress={() => {
          if (!when || !memberId) return;
          upsertAppointment({
            ...(existing ?? { questions: [] }),
            memberId,
            title: title.trim(),
            at: when.toISOString(),
            place: place.trim() || undefined,
            companion: companion.trim() || undefined,
          });
          onDone();
        }}
      />
      <Btn variant="ghost" label="Hủy" onPress={onDone} />
    </Card>
  );
}
