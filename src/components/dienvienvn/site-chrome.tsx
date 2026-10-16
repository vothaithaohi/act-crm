'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Clapperboard } from 'lucide-react';
import { useDvvnHref } from './base-path';

export function DvLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-[-0.02em] ${className}`}>
      <Clapperboard className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>
        DienVien<span className="text-[var(--dv-text-secondary)]">VN</span>
      </span>
    </span>
  );
}

/** Header tối giản: chỉ logo + tên DienVienVN ở giữa. */
export function GlobalNav() {
  const href = useDvvnHref();
  return (
    <nav className="dv-nav" aria-label="DienVienVN">
      <div className="mx-auto flex h-full max-w-[1024px] items-center justify-center px-4 md:px-[22px]">
        <Link href={href('/')} className="text-[17px] text-[#1d1d1f]" aria-label="DienVienVN — Trang chủ">
          <DvLogo />
        </Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const href = useDvvnHref();
  return (
    <footer className="bg-[var(--dv-bg-alt)] text-[var(--dv-text-secondary)]">
      <div className="mx-auto max-w-[980px] px-4 py-5 md:px-[22px]">
        <div className="dv-small space-y-2 border-b border-[#d2d2d7] pb-4">
          <p>
            1. Thời gian đếm ngược tính theo giờ Việt Nam (GMT+7). DienVienVN chính thức ra mắt lúc 00:00 ngày 11/11/2026.
          </p>
          <p>
            2. Hồ sơ diễn viên chỉ được dùng để giới thiệu diễn viên tới đạo diễn và nhà sản xuất. Bạn có thể yêu cầu chỉnh sửa
            hoặc xoá hồ sơ bất kỳ lúc nào.
          </p>
        </div>
        <div className="dv-small flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
          <p>Bản quyền © 2026 DienVienVN. Bảo lưu mọi quyền.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={href('/nop-ho-so')} className="hover:underline">Nộp hồ sơ diễn viên</Link>
            <span className="text-[#d2d2d7]">|</span>
            <Link href={`${href('/')}#ra-mat`} className="hover:underline">Ra mắt 11.11.2026</Link>
            <span className="text-[#d2d2d7]">|</span>
            <span>Việt Nam</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Hiệu ứng hiện dần khi cuộn tới, giống các section trên apple.com. */
export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('dv-in');
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            el.classList.add('dv-in');
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`dv-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
