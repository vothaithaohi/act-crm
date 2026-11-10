'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { PublicProject, isDeadlinePassed, projectPathName, projectTypeLabel } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { useDvvnHref } from './base-path';
import { formatVnDate } from './projects-section';
import { Reveal } from './site-chrome';

const MAX_CARDS = 6;

/** Nền tạm của thẻ khi chưa có ảnh dự án (mỗi dự án giữ cố định 1 nền theo mã). */
const BACKDROPS = [
  'linear-gradient(180deg,#4f6fb3 0%,#2b3a63 55%,#141b2e 100%)',
  'linear-gradient(180deg,#9b7bd4 0%,#4a3a78 55%,#1c1730 100%)',
  'linear-gradient(180deg,#7a6f8f 0%,#3b3550 55%,#17141f 100%)',
  'linear-gradient(180deg,#5f8f8a 0%,#2d4a4c 55%,#111d1f 100%)',
  'linear-gradient(180deg,#b07a6a 0%,#5a3a3a 55%,#1f1414 100%)',
  'linear-gradient(180deg,#6b7f99 0%,#334055 55%,#131820 100%)'
];

function backdropOf(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BACKDROPS[h % BACKDROPS.length];
}

/** Thẻ dự án (ảnh nền + loại dự án, tên, số vai, nút Ứng tuyển) — dùng chung cho trang chủ mới và /du-an. */
export function ProjectCard({ project: p, href }: { project: PublicProject; href: string }) {
  return (
    <Link
      href={href}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white md:p-6"
      style={{ background: backdropOf(p.id) }}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="relative">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-white/70">
          {projectTypeLabel(p.project_type)}
          {p.deadline ? ` · Hạn ${formatVnDate(p.deadline)}` : ''}
        </span>
        <span className="dv-display mt-1.5 line-clamp-2 block text-[22px] font-semibold leading-[1.2] md:text-[24px]">{p.display_name}</span>
        <span className="mt-1 block text-[14px] text-white/75">{p.roles.length} vai đang tuyển</span>
        <span className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[14px] font-semibold text-[#1d1d1f] transition-colors group-hover:bg-[#f0f0f2]">
          Ứng tuyển <ArrowUpRight className="h-4 w-4" />
        </span>
      </span>
    </Link>
  );
}

/** Trang chủ mới: "Dự án đang casting" dạng thẻ trượt ngang, tối đa 6 dự án, nhiều hơn thì có nút xem tất cả. */
export function ProjectSlider() {
  const href = useDvvnHref();
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState({ start: 0, size: 1 });

  useEffect(() => {
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, []);

  // Thanh tiến trình bên dưới theo vị trí đang cuộn
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const size = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
      const max = el.scrollWidth - el.clientWidth;
      setProgress({ size, start: max > 0 ? (el.scrollLeft / max) * (1 - size) : 0 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [projects]);

  if (!projects || projects.length === 0) return null;
  const shown = projects.slice(0, MAX_CARDS);

  return (
    <section id="du-an" className="scroll-mt-16 bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1100px] px-4">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="dv-display dv-headline">Dự án đang casting.</h2>
            <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">Vuốt hoặc kéo ngang để xem. Chọn vai phù hợp và ứng tuyển ngay hôm nay.</p>
          </div>
        </Reveal>
      </div>

      <ul
        ref={track}
        className="dv-scroll-x mx-auto mt-10 flex max-w-[1100px] snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2"
        aria-label="Dự án đang casting"
      >
        {shown.map(p => {
          const path = href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`);
          return (
            <li key={p.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-32px)/3)]">
              <ProjectCard project={p} href={path} />
            </li>
          );
        })}
      </ul>

      {/* Thanh cuộn mảnh: chỉ hiện khi có thẻ bị khuất */}
      {progress.size < 1 && (
        <div className="mx-auto mt-5 max-w-[1100px] px-4">
          <div className="h-1 overflow-hidden rounded-full bg-[#e8e8ed]">
            <div className="h-full rounded-full bg-[#86868b] transition-[margin] duration-100" style={{ width: `${progress.size * 100}%`, marginLeft: `${progress.start * 100}%` }} />
          </div>
        </div>
      )}

      {projects.length > MAX_CARDS && (
        <div className="mt-8 text-center">
          <Link href={href('/du-an')} className="dv-btn dv-btn-secondary">
            Xem tất cả {projects.length} dự án <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
