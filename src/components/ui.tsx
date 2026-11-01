import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { speak } from '../services/speech';

/** Cỡ chữ của máy này (1 = bình thường). Chọn trong Cài đặt › Cỡ chữ. */
export const TextScale = createContext(1);
const useK = () => useContext(TextScale);

export function Screen({
  children,
  scroll = true,
  bg = colors.bg,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  bg?: string;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function H1({ children, size = 28, color = colors.ink }: { children: ReactNode; size?: number; color?: string }) {
  const k = useK();
  return (
    <Text accessibilityRole="header" style={{ fontSize: size * k, lineHeight: size * k * 1.25, fontWeight: '700', color, fontFamily: 'serif' }}>
      {children}
    </Text>
  );
}

export function T({
  children,
  size = 16,
  color = colors.ink,
  weight = '400',
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: TextStyle['fontWeight'];
  style?: StyleProp<TextStyle>;
}) {
  const k = useK();
  return <Text style={[{ fontSize: size * k, lineHeight: size * k * 1.45, color, fontWeight: weight }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'light' | 'blue';

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.green, fg: colors.white },
  secondary: { bg: colors.white, fg: colors.ink, border: colors.ink },
  danger: { bg: colors.red, fg: colors.white },
  ghost: { bg: 'transparent', fg: colors.green },
  light: { bg: colors.white, fg: colors.green },
  blue: { bg: colors.blue, fg: colors.white },
};

export function Btn({
  label,
  onPress,
  variant = 'primary',
  height = 56,
  size = 18,
  disabled,
  icon,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  height?: number;
  size?: number;
  disabled?: boolean;
  icon?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const k = useK();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          minHeight: height,
          backgroundColor: disabled ? colors.line : v.bg,
          borderWidth: v.border ? 2 : 0,
          borderColor: v.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: disabled ? colors.muted : v.fg, fontSize: size * k, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, size = 15 }: { label: string; on: boolean; onPress: () => void; size?: number }) {
  const k = useK();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: on ? colors.green : colors.white, borderColor: on ? colors.green : colors.chipLine }]}
    >
      <Text style={{ fontSize: size * k, fontWeight: '600', color: on ? colors.white : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** Nút đọc to nội dung bằng giọng tiếng Việt. */
export function SpeakButton({ text, label = 'Đọc to' }: { text: string; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đọc to màn hình này"
      onPress={() => speak(text)}
      style={({ pressed }) => [styles.speak, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Text style={{ color: colors.white, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Nút phải giữ đủ `ms` mới kích hoạt (dùng cho SOS), có vạch tiến trình
 * để người lớn tuổi biết phải giữ bao lâu và tránh bấm nhầm.
 */
export function HoldButton({
  label,
  hint,
  onComplete,
  ms = 3000,
}: {
  label: string;
  hint: string;
  onComplete: () => void;
  ms?: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => () => anim.current?.stop(), []);

  const start = () => {
    anim.current = Animated.timing(progress, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        progress.setValue(0);
        onComplete();
      }
    });
  };
  const stop = () => {
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  const width = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), [progress]);

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onComplete}
        onPressIn={start}
        onPressOut={stop}
        style={styles.hold}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { width, backgroundColor: colors.redDark }]} />
        <Text style={{ color: colors.white, fontSize: 26, fontWeight: '700' }}>{label}</Text>
      </Pressable>
      <T size={16} color={colors.muted} style={{ textAlign: 'center' }}>
        {hint}
      </T>
    </View>
  );
}

export function Stepper({
  label,
  sub,
  value,
  onChange,
  min = 30,
  max = 250,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const btn = (txt: string, delta: number, filled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? 'Tăng' : 'Giảm'} ${label}`}
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      style={[styles.step, filled ? { backgroundColor: colors.green, borderColor: colors.green } : null]}
    >
      <Text style={{ fontSize: 30, fontWeight: '700', color: filled ? colors.white : colors.ink }}>{txt}</Text>
    </Pressable>
  );
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <T size={19} weight="700">{label}</T>
        <T size={14} color={colors.muted}>{sub}</T>
      </View>
      {btn('−', -1, false)}
      <Text accessibilityLiveRegion="polite" style={{ width: 64, textAlign: 'center', fontSize: 32, fontWeight: '700', color: colors.ink }}>
        {value}
      </Text>
      {btn('+', 1, true)}
    </Card>
  );
}

export function Banner({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'red'; children: ReactNode }) {
  const bg = { green: colors.greenSoft, amber: colors.amberSoft, blue: colors.blueSoft, red: colors.redSoft }[tone];
  return <View style={{ backgroundColor: bg, borderRadius: 16, padding: 14, gap: 4 }}>{children}</View>;
}

export function Back({ onPress, label = 'Quay lại' }: { onPress: () => void; label?: string }) {
  const k = useK();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={{ fontSize: 26, color: colors.ink, marginTop: -3 }}>‹</Text>
      <Text style={{ fontSize: 16 * k, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 14, flexGrow: 1 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, gap: 8 },
  btn: { borderRadius: radius.md, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  speak: { height: 52, paddingHorizontal: 18, borderRadius: 26, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  hold: { height: 84, borderRadius: radius.lg, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  step: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  back: { height: 48, paddingLeft: 12, paddingRight: 16, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, alignSelf: 'flex-start' },
});

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'number-pad';
}) {
  const k = useK();
  return (
    <View style={{ gap: 6 }}>
      <T size={14} weight="600">{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboard ?? 'default'}
        style={{
          height: 50,
          borderWidth: 1.5,
          borderColor: colors.chipLine,
          borderRadius: 12,
          paddingHorizontal: 14,
          fontSize: 17 * k,
          color: colors.ink,
          backgroundColor: colors.white,
        }}
      />
    </View>
  );
}

