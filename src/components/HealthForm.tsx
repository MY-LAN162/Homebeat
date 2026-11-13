// Ô nhập hồ sơ sức khỏe của bố mẹ. Dùng chung cho bước thêm bố mẹ lúc mới cài và màn hình "Sửa hồ sơ".
import { useState } from 'react';
import { View } from 'react-native';
import { BLOOD_TYPES, CONDITIONS, RH, type HealthInfo } from '../domain/health';
import { colors } from '../theme';
import { Chip, Field, T } from './ui';

export function HealthForm({ value, onChange, call }: { value: HealthInfo; onChange: (v: HealthInfo) => void; call: string }) {
  const set = (patch: Partial<HealthInfo>) => onChange({ ...value, ...patch });
  const conds = value.conditions ?? [];
  const extra = conds.filter((c) => !(CONDITIONS as readonly string[]).includes(c));
  const [other, setOther] = useState(extra.join(', '));
  const toggle = (c: string) => set({ conditions: conds.includes(c) ? conds.filter((x) => x !== c) : [...conds, c] });
  const [group, rh] = splitBlood(value.bloodType);
  const who = call.toLowerCase();

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Năm sinh"
        value={value.birthYear ? String(value.birthYear) : ''}
        onChange={(v) => {
          const n = Number(v.replace(/\D/g, '').slice(0, 4));
          set({ birthYear: n || undefined });
        }}
        placeholder="Ví dụ: 1955"
        keyboard="number-pad"
      />
      <T size={14} weight="600">Bệnh nền ({who} đang điều trị gì)</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {CONDITIONS.map((c) => (
          <Chip key={c} label={c} on={conds.includes(c)} size={14} onPress={() => toggle(c)} />
        ))}
      </View>
      <Field
        label="Bệnh khác (cách nhau bằng dấu phẩy)"
        value={other}
        onChange={(v) => {
          setOther(v);
          const picked = conds.filter((c) => (CONDITIONS as readonly string[]).includes(c));
          set({ conditions: [...picked, ...v.split(',').map((x) => x.trim()).filter(Boolean)] });
        }}
        placeholder="Ví dụ: Tuyến giáp"
      />
      <Field
        label="Dị ứng thuốc hoặc thức ăn"
        value={value.allergies ?? ''}
        onChange={(v) => set({ allergies: v })}
        placeholder="Ví dụ: Penicillin, hải sản. Không có thì để trống"
      />
      <T size={13} color={colors.muted}>Khi thêm thuốc trùng với dị ứng này, app sẽ nhắc bạn hỏi lại bác sĩ.</T>
      <T size={14} weight="600">Nhóm máu</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {BLOOD_TYPES.map((b) => (
          <Chip key={b} label={b} on={group === b} size={14} onPress={() => set({ bloodType: group === b ? undefined : b + rh })} />
        ))}
        {group &&
          RH.map((r) => (
            <Chip key={r} label={r === '+' ? 'Rh+' : 'Rh−'} on={rh === r} size={14} onPress={() => set({ bloodType: group + (rh === r ? '' : r) })} />
          ))}
        <Chip label="Chưa biết" on={!group} size={14} onPress={() => set({ bloodType: undefined })} />
      </View>
      <Field
        label="Số thẻ bảo hiểm y tế"
        value={value.insurance ?? ''}
        onChange={(v) => set({ insurance: v.toUpperCase().replace(/\s+/g, '').slice(0, 20) })}
        placeholder="Ví dụ: HT2797924000123"
      />
      <Field
        label="Bệnh viện / bác sĩ hay khám"
        value={value.hospital ?? ''}
        onChange={(v) => set({ hospital: v })}
        placeholder="Ví dụ: BV Chợ Rẫy, BS Minh khoa Tim mạch"
      />
      <Field
        label={`Địa chỉ nhà ${who} (để báo cấp cứu)`}
        value={value.address ?? ''}
        onChange={(v) => set({ address: v })}
        placeholder="Số nhà, đường, phường, quận"
      />
    </View>
  );
}

function splitBlood(b: string | undefined): [string | undefined, string] {
  if (!b) return [undefined, ''];
  const m = /^(AB|A|B|O)([+-]?)$/.exec(b);
  return m ? [m[1], m[2]] : [undefined, ''];
}
