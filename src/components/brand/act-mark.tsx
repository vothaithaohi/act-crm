import { useId } from 'react';

/** Biểu tượng ACT (hai tam giác + vòng tròn, màu vàng gradient) — chỉ dùng trong CRM. */
export function ActMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="35 37 910 790" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`act-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d79a" />
          <stop offset="0.45" stopColor="#d4ae6a" />
          <stop offset="1" stopColor="#8c5f2a" />
        </linearGradient>
      </defs>
      <g fill={`url(#act-${id})`}>
        <polygon points="490,37 637,290 35,825" />
        <polygon points="682,367 418,827 945,827" />
        <circle cx="755" cy="224" r="72" />
      </g>
    </svg>
  );
}
