'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { PublicProject, genderLabel, isDeadlinePassed, projectPathName, projectTypeLabel } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { useDvvnHref } from './base-path';
import type { Audience } from './landing-page';
import { formatVnDate } from './projects-section';

const BACKDROPS = [
  'linear-gradient(180deg,#4f6fb3 0%,#2b3a63 55%,#141b2e 100%)',
  'linear-gradient(180deg,#9b7bd4 0%,#4a3a78 55%,#1c1730 100%)',
  'linear-gradient(180deg,#7a6f8f 0%,#3b3550 55%,#17141f 100%)',
  'linear-gradient(180deg,#5f8f8a 0%,#2d4a4c 55%,#111d1f 100%)',
  'linear-gradient(180deg,#b07a6a 0%,#5a3a3a 55%,#1f1414 100%)',
  'linear-gradient(180deg,#6b7f99 0%,#334055 55%,#131820 100%)'
];
const backdropOf = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BACKDROPS[h % BACKDROPS.length];
};

const NAV_H = 44;
/** Số vai tiêu biểu hiện trên trang chủ; xem hết ở trang Dự án. */
const FEATURED_ROLES = 9;
const SET_PHOTO = '/dienvienvn/home/set-quay.jpg';

/**
 * 9 vai tiêu biểu: ưu tiên vai chính (tên / mô tả có "chính"), rồi vai đầu tiên của mỗi dự án,
 * rồi các vai còn lại — giữ thứ tự dự án mới nhất trước.
 */
function featuredRoles(projects: PublicProject[]) {
  const all = projects.flatMap(p => p.roles.map((r, i) => ({ p, r, i })));
  const isLead = (x: (typeof all)[number]) => /chính/i.test(`${x.r.name} ${x.r.description || ''}`);
  const rank = (x: (typeof all)[number]) => (isLead(x) ? 0 : x.i === 0 ? 1 : 2);
  return all
    .map((x, order) => ({ ...x, order }))
    .sort((a, b) => rank(a) - rank(b) || a.order - b.order)
    .slice(0, FEATURED_ROLES);
}
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Hàng thẻ trượt theo cuộn trang (kiểu talentsystems.com/about-us): khi cuộn tới, tiêu đề + hàng thẻ đứng yên trên màn hình,
 * cuộn tiếp thì hàng thẻ trượt sang trái đúng bằng quãng đã cuộn; trượt hết hàng thì trang đi tiếp xuống dưới.
 * Người bật "giảm chuyển động": hàng thẻ vuốt ngang bình thường.
 */
function ScrollRail({ title, children }: { title: string; children: React.ReactNode }) {
  const outer = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Quãng trượt = phần hàng thẻ còn thừa ra ngoài khung (đo lại khi đổi kích thước / thêm thẻ)
  useIsoLayoutEffect(() => {
    const t = track.current;
    const f = frame.current;
    if (!t || !f) return;
    const measure = () => setDistance(Math.max(0, t.scrollWidth - f.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    ro.observe(f);
    return () => ro.disconnect();
  }, [children, reduced]);

  useEffect(() => {
    const o = outer.current;
    const t = track.current;
    if (!o || !t || reduced) {
      if (t) t.style.transform = '';
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const scrolled = NAV_H - o.getBoundingClientRect().top;
      const p = distance > 0 ? Math.min(1, Math.max(0, scrolled / distance)) : 0;
      t.style.transform = `translate3d(${-p * distance}px,0,0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [distance, reduced]);

  const heading = (
    <div className="mx-auto w-full max-w-[1100px] px-4 md:px-0">
      <h2 className="dv-display max-w-[460px] text-[28px] font-semibold leading-[1.15] text-[#f5f5f7] md:text-[40px]">{title}</h2>
    </div>
  );

  if (reduced) {
    return (
      <section className="bg-[#111111] pb-20 pt-14 md:pb-28">
        {heading}
        <div ref={frame} className="mx-auto mt-10 max-w-[1100px] overflow-x-auto px-4 md:px-0">
          <div ref={track} className="flex w-max gap-4 pb-2">
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    // Chiều cao = 1 màn hình + quãng trượt: cuộn hết quãng này thì hàng thẻ vừa trượt tới thẻ cuối
    <section ref={outer} className="relative bg-[#111111]" style={{ height: `calc(100vh - ${NAV_H}px + ${distance}px)` }}>
      <div className="sticky flex flex-col justify-center overflow-hidden py-10" style={{ top: NAV_H, height: `calc(100vh - ${NAV_H}px)` }}>
        {heading}
        {/* Khung thẳng lề với tiêu đề; thẻ đầu bắt đầu đúng lề trái, thẻ tràn ra phải */}
        <div ref={frame} className="mx-auto mt-8 w-full max-w-[1100px] px-4 md:mt-10 md:px-0">
          <div ref={track} className="flex w-max gap-4 will-change-transform md:gap-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

const CARD = 'relative flex h-[min(56vh,520px)] aspect-[4/5] shrink-0 flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white md:p-6';

/** Thẻ cuối "Xem tất cả" (có hình), bấm vào sang trang xem tất cả. */
function SeeAllCard({ href, label, photo }: { href: string; label: string; photo?: string }) {
  return (
    <Link href={href} className={`${CARD} group bg-[#1d1d1f]`}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover object-[50%_18%] opacity-60 transition duration-500 group-hover:scale-[1.04]" />
      )}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <span className="relative flex items-end justify-between gap-3">
        <span className="dv-display text-[28px] font-semibold leading-[1.15] md:text-[32px]">{label}</span>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1d1d1f] transition-transform group-hover:translate-x-1">
          <ArrowRight className="h-5 w-5" />
        </span>
      </span>
    </Link>
  );
}

/** Trang chủ mới 02: "Lịch casting đang mở cho bạn" (mọi vai đang mở) / "Gương mặt sẵn sàng…" (đối tác). */
export function CastingRail({ audience, stats }: { audience: Audience; stats: HomeStats }) {
  const href = useDvvnHref();
  const talent = audience === 'talent';
  const [projects, setProjects] = useState<PublicProject[] | null>(null);

  useEffect(() => {
    if (!talent || projects) return;
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, [talent, projects]);

  const seeAllPhoto = stats.faces[0]?.photo;

  if (talent) {
    const roles = featuredRoles(projects || []);
    return (
      <ScrollRail title="Lịch casting đang mở cho bạn.">
        {projects === null && <div className={`${CARD} animate-pulse bg-white/5`} />}
        {roles.map(({ p, r }) => {
          const age = r.age_min && r.age_max ? `${r.age_min}–${r.age_max} tuổi` : r.age_min ? `Từ ${r.age_min} tuổi` : r.age_max ? `Đến ${r.age_max} tuổi` : '';
          return (
            <Link
              key={`${p.id}:${r.id}`}
              href={href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`)}
              className={`${CARD} group`}
              style={{ background: backdropOf(p.id) }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="relative">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-white/70">
                  {projectTypeLabel(p.project_type)}
                  {p.deadline ? ` · Hạn ${formatVnDate(p.deadline)}` : ''}
                </span>
                <span className="dv-display mt-1.5 line-clamp-2 block text-[22px] font-semibold leading-[1.2] md:text-[24px]">{r.name}</span>
                <span className="mt-1 line-clamp-1 block text-[14px] text-white/75">{p.display_name}</span>
                <span className="mt-1 block text-[14px] text-white/75">{[genderLabel(r.gender), age].filter(Boolean).join(' · ')}</span>
                <span className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[14px] font-semibold text-[#1d1d1f] transition-colors group-hover:bg-[#f0f0f2]">
                  Ứng tuyển <ArrowUpRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          );
        })}
        {projects !== null && <SeeAllCard href={href('/du-an')} label="Xem tất cả dự án" photo={SET_PHOTO} />}
      </ScrollRail>
    );
  }

  return (
    <ScrollRail title="Gương mặt sẵn sàng cho vai diễn tiếp theo.">
      {stats.faces.slice(0, 10).map(f => (
        <Link key={f.username} href={href(`/${f.username}`)} className={`${CARD} group !p-0 bg-[#1d1d1f]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.photo} alt={f.name} loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover object-[50%_18%] transition duration-500 group-hover:scale-[1.04]" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-16 text-white">
            {f.act && <span className="mb-1.5 inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#1d1d1f]">ACT Academy</span>}
            <span className="block text-[17px] font-semibold">{f.name}</span>
          </span>
        </Link>
      ))}
      <SeeAllCard href={href('/dien-vien')} label="Xem tất cả diễn viên" photo={stats.faces[10]?.photo || seeAllPhoto} />
    </ScrollRail>
  );
}
