// Áp cỡ chữ người dùng đã chọn cho toàn bộ app trên máy này (máy bố mẹ: theo cài đặt của bố/mẹ, con chỉnh hộ được).
import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { effectiveScale } from '../domain/textSize';
import { TextScale } from './ui';

export function ScaledText({ children }: { children: ReactNode }) {
  const { data } = useStore();
  return <TextScale.Provider value={effectiveScale(data)}>{children}</TextScale.Provider>;
}
