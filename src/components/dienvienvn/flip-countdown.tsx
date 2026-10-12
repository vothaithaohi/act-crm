'use client';

import { useEffect, useState } from 'react';
import { LAUNCH_AT_MS } from '@/lib/dienvienvn/casting-form';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function getRemaining(now: number): Remaining {
  const diff = Math.max(0, LAUNCH_AT_MS - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: diff === 0
  };
}

const vnClockFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    : null;

/** Một thẻ số lật: nửa trên lật xuống để lộ số mới, giống đồng hồ lật cơ học. */
function FlipDigit({ value }: { value: string }) {
  const [state, setState] = useState({ current: value, previous: value, flips: 0 });

  useEffect(() => {
    setState(s => (s.current === value ? s : { current: value, previous: s.current, flips: s.flips + 1 }));
  }, [value]);

  const { current, previous, flips } = state;
  return (
    <div className="dv-flip" aria-hidden="true">
      <div className="dv-flip-half dv-flip-top">
        <span>{current}</span>
      </div>
      <div className="dv-flip-half dv-flip-bottom">
        <span>{flips > 0 ? previous : current}</span>
      </div>
      {flips > 0 && (
        <>
          <div key={`t${flips}`} className="dv-flip-half dv-flip-top dv-flap-top">
            <span>{previous}</span>
          </div>
          <div key={`b${flips}`} className="dv-flip-half dv-flip-bottom dv-flap-bottom">
            <span>{current}</span>
          </div>
        </>
      )}
    </div>
  );
}

function FlipGroup({ value, label, minDigits = 2 }: { value: number | null; label: string; minDigits?: number }) {
  const text = value === null ? '0'.repeat(minDigits) : String(value).padStart(minDigits, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-[6px] md:gap-2">
        {text.split('').map((ch, i) => (
          <FlipDigit key={`${text.length}-${i}`} value={ch} />
        ))}
      </div>
      <span className="mt-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#86868b] md:mt-4 md:text-[14px]">
        {label}
      </span>
    </div>
  );
}

export function FlipCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const r = now === null ? null : getRemaining(now);
  const vnNow = now !== null && vnClockFormatter ? vnClockFormatter.format(new Date(now)) : '';
  const srText = r
    ? `Còn ${r.days} ngày ${r.hours} giờ ${r.minutes} phút ${r.seconds} giây đến ngày ra mắt`
    : 'Đang tải đồng hồ đếm ngược';

  return (
    <div className="dv-clock w-full">
      <p className="sr-only" aria-live="off">
        {srText}
      </p>

      {/* Mobile: lưới 2x2 — Desktop: một hàng có dấu hai chấm */}
      <div className="mx-auto grid w-fit grid-cols-2 gap-x-5 gap-y-7 md:flex md:items-start md:gap-0">
        <FlipGroup value={r ? r.days : null} label="Ngày" />
        <span className="dv-clock-sep hidden px-3 md:block lg:px-4">:</span>
        <FlipGroup value={r ? r.hours : null} label="Giờ" />
        <span className="dv-clock-sep hidden px-3 md:block lg:px-4">:</span>
        <FlipGroup value={r ? r.minutes : null} label="Phút" />
        <span className="dv-clock-sep hidden px-3 md:block lg:px-4">:</span>
        <FlipGroup value={r ? r.seconds : null} label="Giây" />
      </div>

      <p className="mt-8 text-[12px] leading-[1.33] tracking-[-0.01em] text-[#86868b] md:text-[14px]" suppressHydrationWarning>
        {vnNow ? `Giờ Việt Nam hiện tại: ${vnNow} (GMT+7)` : ' '}
      </p>
    </div>
  );
}

export function useLaunched(): boolean {
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    const check = () => setLaunched(Date.now() >= LAUNCH_AT_MS);
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, []);
  return launched;
}
