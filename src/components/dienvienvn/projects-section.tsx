'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PublicProject, isDeadlinePassed, projectPathName, projectTypeLabel } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { useDvvnHref } from './base-path';
import { Reveal } from './site-chrome';
import { ProjectCard } from './project-slider';

export function formatVnDate(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** "Dự án đang casting" trên trang chủ — ẩn hẳn khi chưa có dự án nào mở. */
export function ProjectsSection({ page = false }: { page?: boolean } = {}) {
  const href = useDvvnHref();
  const [projects, setProjects] = useState<PublicProject[] | null>(null);

  useEffect(() => {
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, []);

  if (!projects) return null;
  if (projects.length === 0) {
    if (!page) return null;
    return (
      <section className="dv-tile dv-tile-light px-4 py-16 md:py-24">
        <h1 className="dv-display dv-headline">Dự án đang casting.</h1>
        <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">Hiện chưa có dự án nào đang nhận hồ sơ. Vui lòng quay lại sau.</p>
      </section>
    );
  }
  if (page) {
    // Trang /du-an: lưới thẻ dự án cùng kiểu trang chủ mới
    return (
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <h1 className="dv-display dv-headline">Dự án đang casting.</h1>
            <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">
              {projects.length} dự án đang nhận hồ sơ. Chọn vai phù hợp và ứng tuyển ngay hôm nay.
            </p>
          </Reveal>
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(p => (
              <li key={p.id}>
                <ProjectCard project={p} href={href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`)} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  const Title = 'h2';

  return (
    <section id="du-an" className="dv-tile dv-tile-light scroll-mt-11 px-4 py-16 md:py-24">
      <Reveal>
        <Title className="dv-display dv-headline">Dự án đang casting.</Title>
        <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">
          Chọn vai phù hợp và ứng tuyển ngay hôm nay.
        </p>
      </Reveal>
      <div
        className={`mx-auto mt-12 grid max-w-[980px] grid-cols-1 gap-3 text-left ${projects.length > 1 ? 'md:grid-cols-2' : 'max-w-[560px]'}`}
      >
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={i * 80} className="h-full">
            <Link
              href={href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`)}
              className="group flex h-full flex-col rounded-[18px] bg-[var(--dv-bg-alt)] p-6 transition-colors hover:bg-[#ededf0] md:p-8"
            >
              <span className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">{projectTypeLabel(p.project_type)}</span>
              <span className="dv-display mt-1 text-[24px] font-semibold leading-[1.17] tracking-[0.009em] md:text-[28px] md:leading-[1.14]">
                {p.display_name}
              </span>
              <span className="mt-2 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
                {[p.location ? provinceLabel(p.location) : null, p.shooting_time, `${p.roles.length} vai đang tuyển`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className="mt-auto flex items-center justify-between gap-3 pt-6">
                <span className="text-[14px] text-[var(--dv-text-secondary)]">
                  {p.deadline ? `Hạn nộp ${formatVnDate(p.deadline)}` : ''}
                </span>
                <span className="dv-link text-[17px]">
                  Ứng tuyển <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
