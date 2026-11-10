// Cỡ chữ. Máy bố mẹ vốn đã chữ to; 4 mức để chọn thêm. Máy con 3 mức.
export const PARENT_SIZES: readonly { k: number; label: string }[] = [
  { k: 1, label: 'Lớn' },
  { k: 1.2, label: 'Rất lớn' },
  { k: 1.4, label: 'Cực lớn' },
  { k: 1.6, label: 'Khổng lồ' },
];

/** Cỡ chữ đang dùng trên máy này: máy bố mẹ theo cài đặt của bố/mẹ đó (con chỉnh hộ được), máy con theo máy. */
export function effectiveScale(d: { role?: string; currentMemberId?: string; textScale?: number; members: { id: string; textScale?: number }[] }): number {
  if (d.role === 'parent') {
    const m = d.members.find((x) => x.id === d.currentMemberId);
    if (m?.textScale) return m.textScale;
  }
  return d.textScale ?? 1;
}

export const sizeLabel = (k: number | undefined) => PARENT_SIZES.find((s) => s.k === (k ?? 1))?.label ?? 'Lớn';
