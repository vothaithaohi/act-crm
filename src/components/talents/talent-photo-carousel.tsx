'use client';

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TalentProfile } from '@/lib/types/crm';

const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';

/** Ảnh hồ sơ diễn viên: chuyển ảnh bằng mũi tên, chấm, phím ←/→ hoặc vuốt. */
export function TalentPhotoCarousel({ talent }: { talent: TalentProfile }) {
  const photos = [
    { label: 'Chân dung', url: talent.headshot_url },
    { label: 'Toàn thân', url: talent.fullbody_url },
    { label: 'Góc nghiêng', url: talent.compcard_url }
  ].filter((p): p is { label: string; url: string } => !!p.url);

  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = photos.length;
  const current = Math.min(index, Math.max(count - 1, 0));
  const go = (delta: number) => setIndex((current + delta + count) % count);

  if (count === 0) {
    return (
      <div className="aspect-[3/4] relative bg-muted">
        <img src={FALLBACK_PHOTO} alt={talent.full_name} className="w-full h-full object-cover object-top" />
      </div>
    );
  }

  return (
    <div
      className="aspect-[3/4] relative bg-muted group outline-none"
      tabIndex={count > 1 ? 0 : undefined}
      aria-roledescription="carousel"
      aria-label={`Ảnh của ${talent.full_name}`}
      onKeyDown={e => {
        if (count < 2) return;
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
      onTouchStart={e => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {photos.map((p, i) => (
        <img
          key={p.url}
          src={p.url}
          alt={`${talent.full_name} — ${p.label}`}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      ))}

      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {photos[current].label}
        {count > 1 && ` · ${current + 1}/${count}`}
      </span>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow-md backdrop-blur-sm transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Ảnh tiếp theo"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow-md backdrop-blur-sm transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
            {photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}: ${p.label}`}
                aria-current={i === current}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
