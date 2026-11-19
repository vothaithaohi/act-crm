'use client';

import { useTx } from './i18n';
import { isMajorTier, roleTierLabel } from '@/lib/projects/types';

/** Nhãn loại vai (Vai chính, Vai phụ, Quần chúng…). Vai chính / thứ chính: nền đen nổi bật. */
export function RoleTierBadge({ tier, className = '' }: { tier?: string | null; className?: string }) {
  const tx = useTx();
  const label = roleTierLabel(tier);
  if (!label) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 align-middle text-[12px] font-semibold tracking-[0.01em] ${
        isMajorTier(tier) ? 'bg-[#1d1d1f] text-white' : 'border border-[#d2d2d7] bg-white text-[var(--dv-text)]'
      } ${className}`}
    >
      {tx(label)}
    </span>
  );
}
