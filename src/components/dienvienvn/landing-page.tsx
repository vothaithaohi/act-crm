'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Clapperboard, Menu, X } from 'lucide-react';
import { CASTING_STEPS, LAUNCH_AT_MS } from '@/lib/dienvienvn/casting-form';
import { useActorSession } from '@/lib/dienvienvn/actor-auth';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { useDvvnHref } from './base-path';
import { FlipCountdown, useLaunched } from './flip-countdown';
import { ProjectsSection } from './projects-section';
import { DvLogo, Reveal, SiteFooter } from './site-chrome';

type Audience = 'talent' | 'hiring';

const fmt = (n: number) => n.toLocaleString('vi-VN');

/* ---------------- Thanh menu ---------------- */
function LandingNav() {
  const href = useDvvnHref();
  const session = useActorSession();
  const [open, setOpen] = useState(false);
  const links = [
    { href: `${href('/')}#du-an`, label: 'Dự án casting' },
    { href: href('/dien-vien'), label: 'Diễn viên' },
    { href: `${href('/')}#nha-san-xuat`, label: 'Nhà sản xuất' },
    { href: `${href('/')}#quy-trinh`, label: 'Cách hoạt động' }
  ];
  const signedIn = session.status === 'signed-in';
  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.08] bg-[rgba(250,250,252,0.85)] backdrop-blur-xl backdrop-saturate-150" aria-label="DienVienVN">
      <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <Link href={href('/')} className="text-[17px] text-[#1d1d1f]" aria-label="DienVienVN — Trang chủ">
          <DvLogo />
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {links.map(l => (
            <Link key={l.label} href={l.href} className="text-[14px] text-black/75 transition-colors hover:text-black">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href={href(signedIn ? '/tai-khoan' : '/dang-nhap')} className="hidden px-2 text-[14px] text-black/75 hover:text-black sm:inline">
            {signedIn ? 'Tài khoản' : 'Đăng nhập'}
          </Link>
          <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-primary !h-9 !px-4 !py-0 text-[14px]">
            Nộp hồ sơ
          </Link>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full md:hidden"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-black/[0.06] bg-white px-4 pb-5 pt-2 md:hidden">
          {[...links, { href: href(signedIn ? '/tai-khoan' : '/dang-nhap'), label: signedIn ? 'Tài khoản' : 'Đăng nhập' }].map(l => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block border-b border-[#f0f0f2] py-3.5 text-[17px] font-semibold last:border-0">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ---------------- Ảnh gương mặt diễn viên (đã đồng ý công khai) ---------------- */
function FaceMosaic({ faces }: { faces: HomeStats['faces'] }) {
  const href = useDvvnHref();
  if (faces.length < 3) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[28px] bg-[#1d1d1f]">
        <div className="text-center">
          <Clapperboard className="mx-auto h-24 w-24 text-[#f5f5f7] md:h-32 md:w-32" strokeWidth={0.8} />
          <p className="dv-display mt-6 text-[24px] font-semibold text-[#f5f5f7]">Đúng người. Đúng vai.</p>
        </div>
      </div>
    );
  }
  const cols = [0, 1, 2].map(c => faces.filter((_, i) => i % 3 === c).slice(0, 3));
  return (
    <div className="relative grid h-[340px] grid-cols-3 gap-2 overflow-hidden sm:h-[420px] sm:gap-3 md:h-[560px]" aria-label="Gương mặt diễn viên trên DienVienVN">
      {cols.map((col, c) => (
        <div key={c} className={`flex flex-col gap-3 ${c === 1 ? '-mt-16' : c === 2 ? 'mt-10' : ''}`}>
          {col.map(f => (
            <Link key={f.username} href={href(`/${f.username}`)} className="group relative block aspect-[3/4] overflow-hidden rounded-[18px] bg-[#1d1d1f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.photo} alt={f.name} loading="lazy" className="h-full w-full object-cover object-[50%_20%] transition-transform duration-700 group-hover:scale-[1.04]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-left text-[13px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {f.name}
              </span>
            </Link>
          ))}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

/* ---------------- Màn hình đầu: chọn "Tôi là diễn viên" / "Tôi tìm diễn viên" ---------------- */
function Hero({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const launched = useLaunched();
  const [audience, setAudience] = useState<Audience>('talent');
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    // Tính trên trình duyệt để không lệch giờ giữa máy chủ và người xem
    setDaysLeft(Math.max(0, Math.ceil((LAUNCH_AT_MS - Date.now()) / 86400000)));
  }, []);

  const talent = audience === 'talent';
  return (
    <section className="bg-black text-[#f5f5f7]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-6 md:pb-20 md:pt-16">
        <div>
          {!launched && daysLeft !== null && daysLeft > 0 && (
            <Link href={`${href('/')}#ra-mat`} className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] text-[#a1a1a6] hover:border-white/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f5f5f7]" /> Chính thức ra mắt 11.11.2026 · còn {daysLeft} ngày
            </Link>
          )}

          <div role="tablist" aria-label="Bạn là" className="inline-flex rounded-full bg-white/10 p-1">
            {(
              [
                ['talent', 'Tôi là diễn viên'],
                ['hiring', 'Tôi tìm diễn viên']
              ] as [Audience, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={audience === k}
                onClick={() => setAudience(k)}
                className={`h-9 rounded-full px-4 text-[14px] font-semibold transition-colors ${audience === k ? 'bg-[#f5f5f7] text-black' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <h1 key={audience} className="dv-display dv-pop mt-7 text-[40px] font-semibold leading-[1.08] tracking-[-0.01em] md:text-[60px] md:leading-[1.04]">
            {talent ? (
              stats.roles > 0 ? (
                <>
                  <span className="text-[#86868b]">Có </span>
                  {fmt(stats.roles)} vai diễn
                  <span className="text-[#86868b]"> đang chờ bạn.</span>
                </>
              ) : (
                <>
                  Vai diễn tiếp theo<span className="text-[#86868b]"> có thể là của bạn.</span>
                </>
              )
            ) : (
              <>
                Đúng gương mặt.<span className="text-[#86868b]"> Nhanh hơn.</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-[520px] text-[19px] leading-[1.42] text-[#a1a1a6] md:text-[21px]">
            {talent
              ? 'Một hồ sơ diễn viên chuẩn casting. Ứng tuyển trực tiếp các dự án phim điện ảnh, truyền hình, web drama và quảng cáo.'
              : 'Đăng casting call, nhận danh sách ứng viên đã được đội ngũ casting sàng lọc, xem self-tape và chọn người ngay trên một đường link.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {talent ? (
              <>
                <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-light">
                  Nộp hồ sơ miễn phí
                </Link>
                <Link href={`${href('/')}#du-an`} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
                  Xem dự án đang casting <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <Link href={href('/doi-tac/du-an/moi')} className="dv-btn dv-btn-light">
                  Đăng casting call
                </Link>
                <Link href={href('/doi-tac')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
                  Cổng đối tác <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        <FaceMosaic faces={stats.faces} />
      </div>
    </section>
  );
}

/* ---------------- Số liệu ---------------- */
function StatsStrip({ stats }: { stats: HomeStats }) {
  const items = [
    stats.roles > 0 ? { value: fmt(stats.roles), label: 'Vai đang tuyển' } : null,
    stats.projects > 0 ? { value: fmt(stats.projects), label: 'Dự án đang casting' } : null,
    stats.talents > 0 ? { value: fmt(stats.talents), label: 'Hồ sơ diễn viên đã duyệt' } : null,
    { value: '7 bước', label: 'Khoảng 10 phút để có hồ sơ' },
    { value: '0đ', label: 'Diễn viên nộp hồ sơ miễn phí' }
  ].filter(Boolean) as { value: string; label: string }[];
  return (
    <section className="border-b border-[#f0f0f2] bg-white px-4 py-12 md:py-16">
      <dl className={`mx-auto grid max-w-[1100px] grid-cols-2 gap-x-6 gap-y-8 ${items.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        {items.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <dt className="sr-only">{s.label}</dt>
            <dd className="dv-display text-[36px] font-semibold leading-none tracking-[-0.01em] md:text-[44px]">{s.value}</dd>
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-secondary)]">{s.label}</p>
          </Reveal>
        ))}
      </dl>
      {stats.companies.length >= 2 && (
        <Reveal className="mx-auto mt-12 max-w-[1100px] border-t border-[#f0f0f2] pt-8 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">Đang casting cùng các đơn vị sản xuất</p>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stats.companies.map(c => (
              <span key={c} className="dv-display text-[19px] font-semibold text-[#424245] md:text-[21px]">
                {c}
              </span>
            ))}
          </p>
        </Reveal>
      )}
    </section>
  );
}

/* ---------------- Gương mặt DienVienVN ---------------- */
function FacesSection({ faces }: { faces: HomeStats['faces'] }) {
  const href = useDvvnHref();
  if (faces.length < 4) return null;
  return (
    <section className="bg-[var(--dv-bg-alt)] px-4 py-16 md:py-24">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="dv-display dv-headline">Gương mặt DienVienVN.</h2>
            <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">Hồ sơ diễn viên đã được đội ngũ casting duyệt.</p>
          </div>
          <Link href={href('/dien-vien')} className="dv-link text-[17px]">
            Xem tất cả diễn viên <ChevronRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {faces.slice(0, 6).map((f, i) => (
            <li key={f.username}>
              <Reveal delay={i * 50}>
                <Link href={href(`/${f.username}`)} className="group block overflow-hidden rounded-[18px] bg-white">
                  <div className="aspect-[3/4] overflow-hidden bg-[#e8e8ed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.photo} alt={f.name} loading="lazy" className="h-full w-full object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <p className="truncate px-3 py-2.5 text-[15px] font-semibold">{f.name}</p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Dành cho diễn viên / nhà sản xuất ---------------- */
function AudienceTiles() {
  const href = useDvvnHref();
  const tiles = [
    {
      id: 'dien-vien',
      dark: false,
      eyebrow: 'Dành cho diễn viên',
      title: 'Một hồ sơ. Mọi dự án.',
      points: [
        'Ảnh chân dung, số đo, kinh nghiệm, kỹ năng trình bày đúng chuẩn đạo diễn cần xem',
        'Ứng tuyển vai bằng một lần bấm, gửi kèm self-tape',
        'Thông tin liên hệ chỉ được chia sẻ khi bạn được chọn'
      ],
      cta: { href: href('/nop-ho-so'), label: 'Nộp hồ sơ diễn viên' }
    },
    {
      id: 'nha-san-xuat',
      dark: true,
      eyebrow: 'Dành cho đạo diễn & nhà sản xuất',
      title: 'Tìm đúng gương mặt, nhanh hơn.',
      points: [
        'Tự đăng casting call, đội ngũ DienVienVN duyệt và mở nhận hồ sơ',
        'Ứng viên được sàng lọc sẵn, xem theo từng vai',
        'Xem ảnh, self-tape, chiều cao, kinh nghiệm trên một đường link'
      ],
      cta: { href: href('/doi-tac/du-an/moi'), label: 'Đăng casting call' }
    }
  ];
  return (
    <section className="bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {tiles.map(t => (
          <div key={t.id} id={t.id} className={`scroll-mt-16 rounded-[28px] px-6 py-12 md:px-12 md:py-16 ${t.dark ? 'bg-black text-[#f5f5f7]' : 'bg-[var(--dv-bg-alt)]'}`}>
            <Reveal>
              <p className={`text-[14px] font-semibold ${t.dark ? 'text-[#a1a1a6]' : 'text-[var(--dv-text-secondary)]'}`}>{t.eyebrow}</p>
              <h3 className="dv-display dv-headline mt-2">{t.title}</h3>
              <ul className="mt-8 space-y-4">
                {t.points.map(p => (
                  <li key={p} className="flex gap-3 text-[17px] leading-[1.42]">
                    <Check className={`mt-1 h-5 w-5 shrink-0 ${t.dark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`} />
                    <span className={t.dark ? 'text-[#d2d2d7]' : 'text-[var(--dv-text)]'}>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href={t.cta.href} className={`dv-btn mt-10 ${t.dark ? 'dv-btn-light' : 'dv-btn-primary'}`}>
                {t.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Quy trình ---------------- */
function Process() {
  const href = useDvvnHref();
  return (
    <section id="quy-trinh" className="scroll-mt-16 bg-white px-4 py-16 text-center md:py-24">
      <Reveal>
        <h2 className="dv-display dv-headline">Bảy bước. Khoảng mười phút.</h2>
        <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">
          Điền theo từng phần, quay lại chỉnh sửa bất kỳ lúc nào trước khi nộp.
        </p>
      </Reveal>
      <ol className="mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
        {CASTING_STEPS.map((s, i) => (
          <li key={s.id}>
            <Reveal delay={i * 60} className="h-full">
              <div className="h-full rounded-[18px] bg-[var(--dv-bg-alt)] p-6">
                <span className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">Bước {s.id}</span>
                <p className="mt-1 text-[19px] font-semibold leading-[1.21] tracking-[0.012em]">{s.title}</p>
                <p className="mt-2 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">{s.desc}</p>
              </div>
            </Reveal>
          </li>
        ))}
        <li>
          <Reveal delay={CASTING_STEPS.length * 60} className="h-full">
            <Link href={href('/nop-ho-so')} className="group flex h-full flex-col justify-between rounded-[18px] bg-[#1d1d1f] p-6 text-white transition-colors hover:bg-[#424245]">
              <span className="text-[14px] font-semibold text-white/75">Sẵn sàng?</span>
              <span className="mt-1 flex items-center gap-1 text-[19px] font-semibold leading-[1.21]">
                Nộp hồ sơ diễn viên <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        </li>
      </ol>
    </section>
  );
}

/* ---------------- Kết: đếm ngược ra mắt (trước 11.11) hoặc lời mời ---------------- */
function Closing() {
  const href = useDvvnHref();
  const launched = useLaunched();
  return (
    <section id="ra-mat" className="dv-tile dv-tile-dark scroll-mt-16 px-4 py-16 md:py-24">
      <Reveal>
        <p className="dv-eyebrow text-[#86868b]">{launched ? 'Đã ra mắt' : 'Coming Soon'}</p>
        <h2 className="dv-display dv-headline mt-2 text-[#f5f5f7]">{launched ? 'Vai diễn tiếp theo có thể là của bạn.' : 'Chính thức ra mắt 11.11.2026.'}</h2>
      </Reveal>
      {!launched && (
        <Reveal delay={120} className="mt-10 w-full">
          <FlipCountdown />
        </Reveal>
      )}
      <Reveal delay={200} className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-light">
          Nộp hồ sơ diễn viên
        </Link>
        <Link href={href('/doi-tac/du-an/moi')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
          Đăng casting call <ChevronRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </section>
  );
}

/** Trang chủ dạng landing page: menu, màn hình đầu 2 đối tượng, số liệu thật, dự án, gương mặt, quy trình, ra mắt. */
export function DienVienVNLanding({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  // Link trong email xác nhận rơi về trang chủ (chưa khai báo Redirect URL) → chuyển tiếp tới trang tạo mật khẩu
  useEffect(() => {
    const { search, hash } = window.location;
    if (/[?&]token_hash=/.test(search) || /access_token=|error_code=/.test(hash)) {
      window.location.replace(`${href('/tao-mat-khau')}${search}${hash}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <LandingNav />
      <main>
        <Hero stats={stats} />
        <StatsStrip stats={stats} />
        <ProjectsSection />
        <FacesSection faces={stats.faces} />
        <AudienceTiles />
        <Process />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
