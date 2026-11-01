// Hướng dẫn lần đầu cho bố mẹ: 3 việc chính, mỗi màn hình một việc, chữ to, máy tự đọc to.
// Tự hiện lần đầu mở màn hình bố mẹ; xem lại được bằng nút "Xem lại hướng dẫn" ở trang chủ.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Btn, H1, Screen, SpeakButton, T } from '../../components/ui';
import { okLabel, tookLabel } from '../../domain/address';
import type { Member } from '../../domain/types';
import { speak, stopSpeaking } from '../../services/speech';
import { track } from '../../services/usage';
import { useCurrentMember, useStore } from '../../state/store';
import { colors } from '../../theme';

interface Step {
  title: string;
  body: string;
  /** Hình minh họa: nút giống hệt nút thật trong app. */
  demo: (m: Member) => React.ReactNode;
}

function FakeButton({ label, bg, fg, border }: { label: string; bg: string; fg: string; border?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ minHeight: 76, borderRadius: 22, backgroundColor: bg, borderWidth: border ? 3 : 0, borderColor: border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
    >
      <T size={24} weight="700" color={fg} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );
}

function steps(m: Member): Step[] {
  const call = m.call.toLowerCase();
  const kids = m.self.toLowerCase();
  return [
    {
      title: `Mỗi sáng, bấm nút trắng`,
      body: `Bấm một lần để các ${kids} biết hôm nay ${call} vẫn ổn. Không bấm, các ${kids} sẽ lo.`,
      demo: () => (
        <View style={{ backgroundColor: colors.green, borderRadius: 22, padding: 18 }}>
          <FakeButton label={okLabel(m)} bg={colors.white} fg={colors.green} />
        </View>
      ),
    },
    {
      title: 'Đến giờ uống thuốc, máy sẽ kêu',
      body: `Uống xong, ${call} bấm nút xanh "${tookLabel(m)}". Bấm ngay trên thông báo cũng được. Chưa bấm thì máy nhắc lại.`,
      demo: () => <FakeButton label={tookLabel(m)} bg={colors.green} fg={colors.white} />,
    },
    {
      title: 'Cần giúp gấp: giữ nút đỏ',
      body: `Giữ nút đỏ 3 giây, máy sẽ gọi cho các ${kids} và gửi vị trí của ${call}. Lỡ bấm nhầm thì bấm nút trắng để hủy.`,
      demo: () => <FakeButton label={`SOS · Gọi các ${kids}`} bg={colors.red} fg={colors.white} />,
    },
  ];
}

export default function ParentGuide() {
  const { data, markGuideSeen } = useStore();
  const m = useCurrentMember();
  const [i, setI] = useState(0);
  const auto = data.settings.autoSpeak !== false;
  const list = m ? steps(m) : [];
  const step = list[i];
  const say = step ? `${step.title}. ${step.body}` : '';

  useEffect(() => {
    if (auto && say) speak(say);
  }, [auto, say]);
  useEffect(() => {
    // Mở là tính đã xem, để bấm nút lùi của điện thoại không bị mở lại hướng dẫn mãi.
    markGuideSeen();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!m || !step) return null;
  const last = i === list.length - 1;
  const finish = () => {
    stopSpeaking();
    track(last ? 'guide_done' : 'guide_skipped');
    router.replace('/parent');
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T size={18} weight="700" color={colors.muted} style={{ flex: 1 }}>
          Hướng dẫn · {i + 1}/{list.length}
        </T>
        <SpeakButton text={say} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={`Bước ${i + 1} trên ${list.length}`}>
        {list.map((_, j) => (
          <View key={j} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: j <= i ? colors.green : colors.line }} />
        ))}
      </View>
      <H1 size={30}>{step.title}</H1>
      <T size={21} style={{ lineHeight: 31 }}>{step.body}</T>
      <View style={{ marginTop: 8 }}>{step.demo(m)}</View>
      <View style={{ flex: 1 }} />
      <Btn label={last ? 'Đã hiểu, bắt đầu dùng' : 'Tiếp theo'} height={76} size={24} onPress={() => (last ? finish() : setI(i + 1))} />
      {i > 0 && <Btn variant="secondary" label="Quay lại bước trước" height={60} size={19} onPress={() => setI(i - 1)} />}
      {!last && <Btn variant="ghost" label="Bỏ qua hướng dẫn" size={17} onPress={finish} />}
    </Screen>
  );
}
