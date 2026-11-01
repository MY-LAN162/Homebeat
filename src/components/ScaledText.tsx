// Áp cỡ chữ người dùng đã chọn (Cài đặt › Cỡ chữ) cho toàn bộ app trên máy này.
import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { TextScale } from './ui';

export function ScaledText({ children }: { children: ReactNode }) {
  const { data } = useStore();
  return <TextScale.Provider value={data.textScale ?? 1}>{children}</TextScale.Provider>;
}
