'use client';

import { useEffect, useState } from 'react';

/**
 * Chữ chạy kiểu tiêu đề Backstage: lần lượt hiện từng từ, từ cũ trượt lên biến mất, từ mới trượt từ dưới lên.
 * Khung giữ bề rộng của từ dài nhất để dòng chữ không bị xô lệch. Người bật giảm chuyển động thấy câu đứng yên (`still`).
 */
export function RotatingWords({ words, still, interval = 2200, className = '' }: { words: string[]; still: string; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const t = window.setInterval(() => {
      setI(cur => {
        setPrev(cur);
        return (cur + 1) % words.length;
      });
    }, interval);
    return () => window.clearInterval(t);
  }, [reduced, words.length, interval]);

  if (reduced) return <span className={className}>{still}</span>;

  return (
    // Khung cắt có đệm trên/dưới để dấu tiếng Việt (ế, ự…) không bị cắt
    <span className={`relative inline-grid overflow-hidden py-[0.14em] -my-[0.14em] align-bottom ${className}`}>
      {words.map((w, k) => (
        <span key={`size-${k}`} aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {w}
        </span>
      ))}
      {prev !== null && prev !== i && (
        <span key={`out-${prev}-${i}`} aria-hidden="true" className="dv-rotate-out col-start-1 row-start-1 whitespace-nowrap">
          {words[prev]}
        </span>
      )}
      <span key={`in-${i}`} aria-hidden="true" className={`${prev === null ? '' : 'dv-rotate-in '}col-start-1 row-start-1 whitespace-nowrap`}>
        {words[i]}
      </span>
    </span>
  );
}
