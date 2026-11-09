'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, Clapperboard, Menu, X } from 'lucide-react';
import { CASTING_STEPS } from '@/lib/dienvienvn/casting-form';
import { useActorSession } from '@/lib/dienvienvn/actor-auth';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { useDvvnHref } from './base-path';
import { FlipCountdown, useLaunched } from './flip-countdown';
import { ProjectsSection } from './projects-section';
import { DvLogo, Reveal, SiteFooter } from './site-chrome';

/** Trang chủ chia 2 luồng: diễn viên và người tìm diễn viên. Mỗi luồng chỉ hiện phần dành cho mình. */
type Audience = 'talent' | 'hiring';

const fmt = (n: number) => n.toLocaleString('vi-VN');

/* ---------------- Thanh menu ---------------- */
/** Menu thả xuống "Dành cho nhà sản xuất" (kiểu Find Talent của Backstage). */
function hiringLinks(href: (p: string) => string) {
  return [
    { href: href('/doi-tac/du-an/moi'), label: 'Đăng tuyển dự án', desc: 'Đăng casting call, tìm diễn viên cho các vai' },
    { href: href('/doi-tac/tuyen-dung/moi'), label: 'Đăng tuyển dụng ekip', desc: 'Tuyển ekip audition, trường quay, hậu kỳ' },
    { href: href('/tai-sao-chon-dienvienvn'), label: 'Tại sao chọn DienVienVN?', desc: 'Quy trình làm việc và quyền lợi của đối tác' }
  ];
}

/** Rê chuột: mở menu. Bấm: chuyển trang chủ sang "Tôi tìm diễn viên". */
function HiringDropdown({ linkCls, active, onSelect }: { linkCls: string; active: boolean; onSelect: () => void }) {
  const href = useDvvnHref();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onSelect();
        }}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${linkCls} inline-flex items-center gap-1 ${open ? '!text-black' : ''} ${active ? '!text-black font-semibold' : ''}`}
      >
        Dành cho nhà sản xuất <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div role="menu" className="w-[320px] rounded-[18px] border border-black/[0.06] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]">
            {hiringLinks(href).map(l => (
              <Link key={l.label} role="menuitem" href={l.href} onClick={() => setOpen(false)} className="block rounded-[12px] px-4 py-3 hover:bg-[var(--dv-bg-alt)]">
                <span className="block text-[15px] font-semibold text-[#1d1d1f]">{l.label}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.4] text-[var(--dv-text-secondary)]">{l.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LandingNav({ audience, onAudience }: { audience: Audience; onAudience: (a: Audience) => void }) {
  const href = useDvvnHref();
  const session = useActorSession();
  const [open, setOpen] = useState(false);
  const signedIn = session.status === 'signed-in';
  const go = (a: Audience) => {
    onAudience(a);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const linkCls = 'text-[14px] text-black/75 transition-colors hover:text-black';
  const mobileCls = 'block w-full border-b border-[#f0f0f2] py-3.5 text-left text-[17px] font-semibold';
  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.08] bg-[rgba(250,250,252,0.85)] backdrop-blur-xl backdrop-saturate-150" aria-label="DienVienVN">
      <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <Link href={href('/')} className="text-[17px] text-[#1d1d1f]" aria-label="DienVienVN — Trang chủ">
          <DvLogo />
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          <button type="button" onClick={() => go('talent')} className={`${linkCls} ${audience === 'talent' ? '!text-black font-semibold' : ''}`}>
            Dành cho diễn viên
          </button>
          <HiringDropdown linkCls={linkCls} active={audience === 'hiring'} onSelect={() => go('hiring')} />
          <Link href={href('/dien-vien')} className={linkCls}>
            Diễn viên
          </Link>
          <Link href={href('/du-an')} className={linkCls}>
            Dự án đang casting
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href={href(signedIn ? '/tai-khoan' : '/dang-nhap')} className="hidden px-2 text-[14px] text-black/75 hover:text-black sm:inline">
            {signedIn ? 'Tài khoản' : 'Đăng nhập'}
          </Link>
          {audience === 'talent' ? (
            <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-primary !h-9 !px-4 !py-0 text-[14px]">
              Nộp hồ sơ
            </Link>
          ) : (
            <Link href={href('/doi-tac/du-an/moi')} className="dv-btn dv-btn-primary !h-9 !px-4 !py-0 text-[14px]">
              Đăng casting
            </Link>
          )}
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
          <button type="button" onClick={() => go('talent')} className={mobileCls}>
            Dành cho diễn viên
          </button>
          <div className="border-b border-[#f0f0f2] py-3.5">
            <button type="button" onClick={() => go('hiring')} className="w-full text-left text-[17px] font-semibold">
              Dành cho nhà sản xuất
            </button>
            <div className="mt-1.5 space-y-0.5">
              {hiringLinks(href).map(l => (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block py-1.5 pl-3 text-[15px] text-black/75">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href={href('/dien-vien')} onClick={() => setOpen(false)} className={mobileCls}>
            Diễn viên
          </Link>
          <Link href={href('/du-an')} onClick={() => setOpen(false)} className={mobileCls}>
            Dự án đang casting
          </Link>
          <Link href={href(signedIn ? '/tai-khoan' : '/dang-nhap')} onClick={() => setOpen(false)} className={`${mobileCls} border-0`}>
            {signedIn ? 'Tài khoản' : 'Đăng nhập'}
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ---------------- Cột ảnh gương mặt tự chạy lên (diễn viên đã đồng ý công khai) ---------------- */
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
  // Mỗi cột cần đủ ảnh để cao hơn khung, rồi nhân đôi để chạy vòng liền mạch
  const cols = [0, 1, 2].map(c => {
    let col = faces.filter((_, i) => i % 3 === c);
    if (!col.length) col = faces;
    while (col.length < 4) col = [...col, ...col];
    return col;
  });
  const durations = ['46s', '38s', '52s'];
  return (
    <div className="dv-marquee relative grid h-[340px] grid-cols-3 gap-2 overflow-hidden sm:h-[420px] sm:gap-3 md:h-[560px]" aria-label="Gương mặt diễn viên trên DienVienVN">
      {cols.map((col, c) => (
        <div key={c} className={c === 1 ? '-mt-24' : c === 2 ? '-mt-10' : ''}>
          <div className="dv-marquee-up" style={{ ['--dv-marquee-dur' as string]: durations[c] }}>
            {[...col, ...col].map((f, i) => (
              <Link
                key={`${f.username}-${i}`}
                href={href(`/${f.username}`)}
                tabIndex={i >= col.length ? -1 : undefined}
                aria-hidden={i >= col.length || undefined}
                className="group relative mb-2 block aspect-[3/4] overflow-hidden rounded-[18px] bg-[#1d1d1f] sm:mb-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.photo} alt={i >= col.length ? '' : f.name} loading="lazy" className="h-full w-full object-cover object-[50%_20%] transition-transform duration-700 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-left text-[13px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {f.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

/* ---------------- Màn hình đầu ---------------- */
function Hero({ stats, audience, onAudience }: { stats: HomeStats; audience: Audience; onAudience: (a: Audience) => void }) {
  const href = useDvvnHref();
  const talent = audience === 'talent';
  return (
    <section className="bg-black text-[#f5f5f7]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-6 md:pb-20 md:pt-16">
        <div>
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
                onClick={() => onAudience(k)}
                className={`h-9 rounded-full px-4 text-[14px] font-semibold transition-colors ${audience === k ? 'bg-[#f5f5f7] text-black' : 'text-[#a1a1a6] hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div key={audience} className="dv-pop">
            <h1 className="dv-display mt-7 text-[40px] font-semibold leading-[1.08] tracking-[-0.01em] md:text-[60px] md:leading-[1.04]">
              {talent ? (
                <>
                  Vào vai.<span className="text-[#86868b]"> Vào việc. Vào nghề.</span>
                </>
              ) : (
                <>
                  Tìm đúng người,<span className="text-[#86868b]"> cho đúng vai.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[540px] text-[21px] leading-[1.33] text-[#a1a1a6] md:text-[26px]">
              {talent ? (
                stats.roles > 0 ? (
                  <>
                    Có <span className="font-semibold text-[#f5f5f7]">{fmt(stats.roles)} vai diễn</span> đang chờ bạn.
                  </>
                ) : (
                  'Vai diễn tiếp theo có thể là của bạn.'
                )
              ) : stats.talents > 0 ? (
                <>
                  Có <span className="font-semibold text-[#f5f5f7]">{fmt(stats.talents)} diễn viên tài năng</span> đang sẵn sàng tỏa sáng.
                </>
              ) : (
                'Những diễn viên tài năng đang sẵn sàng tỏa sáng.'
              )}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {talent ? (
              <>
                <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-light">
                  Nộp hồ sơ miễn phí
                </Link>
                <Link href={href('/du-an')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
                  Xem dự án đang casting <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <Link href={href('/doi-tac/du-an/moi')} className="dv-btn dv-btn-light">
                  Đăng casting call
                </Link>
                <Link href={href('/doi-tac/dang-ky')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
                  Đăng ký tài khoản đối tác <ChevronRight className="h-4 w-4" />
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

/* ---------------- Những gương mặt tài năng ---------------- */
function FacesSection({ faces }: { faces: HomeStats['faces'] }) {
  const href = useDvvnHref();
  if (faces.length < 4) return null;
  return (
    <section className="bg-[var(--dv-bg-alt)] px-4 py-16 md:py-24">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="dv-display dv-headline">Những gương mặt tài năng.</h2>
          <Link href={href('/dien-vien')} className="dv-link text-[17px]">
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </Link>
        </Reveal>
        {/* Điện thoại: cuộn ngang; máy tính: 6 thẻ một hàng. Ảnh cùng tỉ lệ, cùng tông, tên đặt trên ảnh */}
        <ul className="dv-scroll-x -mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {faces.slice(0, 6).map((f, i) => (
            <li key={f.username} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <Reveal delay={i * 50}>
                <Link
                  href={href(`/${f.username}`)}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-[#1d1d1f] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.photo}
                    alt={f.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-[50%_18%] [filter:saturate(0.9)_contrast(1.03)] transition duration-500 group-hover:scale-[1.04] group-hover:[filter:none]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3.5 pb-3.5 pt-14">
                    {f.act && (
                      <span className="mb-1.5 inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#1d1d1f]">
                        ACT Academy
                      </span>
                    )}
                    <span className="line-clamp-2 block text-[15px] font-semibold leading-[1.25] text-white">{f.name}</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Khối lợi ích của từng luồng ---------------- */
function AudienceTile({ audience }: { audience: Audience }) {
  const href = useDvvnHref();
  const t =
    audience === 'talent'
      ? {
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
        }
      : {
          id: 'nha-san-xuat',
          dark: true,
          eyebrow: 'Dành cho đạo diễn & nhà sản xuất',
          title: 'Tìm đúng người. Vào đúng vai.',
          points: [
            'Nền tảng đăng tải casting call miễn phí',
            'DienVienVN duyệt và mở nhận hồ sơ',
            'Theo dõi quy trình tiếp nhận và xử lý hồ sơ diễn viên trên cùng một nền tảng'
          ],
          cta: { href: href('/doi-tac/du-an/moi'), label: 'Đăng casting call' }
        };
  return (
    <section className="bg-white p-3">
      <div
        id={t.id}
        className={`mx-auto grid scroll-mt-16 gap-8 rounded-[28px] px-6 py-12 md:grid-cols-2 md:gap-12 md:px-14 md:py-16 ${t.dark ? 'bg-black text-[#f5f5f7]' : 'bg-[var(--dv-bg-alt)]'}`}
      >
        <Reveal>
          <p className={`text-[14px] font-semibold ${t.dark ? 'text-[#a1a1a6]' : 'text-[var(--dv-text-secondary)]'}`}>{t.eyebrow}</p>
          <h2 className="dv-display dv-headline mt-2">{t.title}</h2>
          <Link href={t.cta.href} className={`dv-btn mt-8 ${t.dark ? 'dv-btn-light' : 'dv-btn-primary'}`}>
            {t.cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <Reveal delay={100}>
          <ul className="space-y-5 md:pt-8">
            {t.points.map(p => (
              <li key={p} className="flex gap-3 text-[17px] leading-[1.42] md:text-[19px]">
                <Check className={`mt-1 h-5 w-5 shrink-0 ${t.dark ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`} />
                <span className={t.dark ? 'text-[#d2d2d7]' : 'text-[var(--dv-text)]'}>{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Cách hoạt động của từng luồng ---------------- */
const PARTNER_STEPS = [
  { id: 1, title: 'Đăng ký tài khoản đối tác', desc: 'Điền thông tin, DienVienVN duyệt và gửi email kích hoạt' },
  { id: 2, title: 'Đăng casting call', desc: 'Miễn phí: thông tin dự án, các vai cần tuyển, yêu cầu self-tape' },
  { id: 3, title: 'DienVienVN duyệt & mở nhận hồ sơ', desc: 'Diễn viên phù hợp ứng tuyển trực tiếp trên DienVienVN' },
  { id: 4, title: 'Nhận shortlist ứng viên', desc: 'Xem ảnh, self-tape, chiều cao, kinh nghiệm theo từng vai' }
];

function Process({ audience }: { audience: Audience }) {
  const href = useDvvnHref();
  const talent = audience === 'talent';
  const steps = talent ? CASTING_STEPS : PARTNER_STEPS;
  const cta = talent ? { href: href('/nop-ho-so'), label: 'Nộp hồ sơ diễn viên' } : { href: href('/doi-tac/dang-ky'), label: 'Đăng ký đối tác' };
  return (
    <section id="quy-trinh" className="scroll-mt-16 bg-white px-4 py-16 text-center md:py-24">
      <Reveal>
        <h2 className="dv-display dv-headline">{talent ? 'Vai diễn phù hợp chỉ cách bạn 07 bước.' : 'Từ casting call đến shortlist.'}</h2>
        <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">
          {talent ? 'Điền theo từng phần, quay lại chỉnh sửa bất kỳ lúc nào trước khi nộp.' : 'Bốn bước trên cùng một nền tảng.'}
        </p>
      </Reveal>
      <ol className={`mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-3 text-left sm:grid-cols-2 ${talent ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
        {steps.map((s, i) => (
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
          <Reveal delay={steps.length * 60} className="h-full">
            <Link href={cta.href} className="group flex h-full flex-col justify-between rounded-[18px] bg-[#1d1d1f] p-6 text-white transition-colors hover:bg-[#424245]">
              <span className="text-[14px] font-semibold text-white/75">Sẵn sàng?</span>
              <span className="mt-1 flex items-center gap-1 text-[19px] font-semibold leading-[1.21]">
                {cta.label} <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        </li>
      </ol>
    </section>
  );
}

/* ---------------- Kết: đếm ngược ra mắt (trước 11.11) ---------------- */
function Closing({ audience }: { audience: Audience }) {
  const href = useDvvnHref();
  const launched = useLaunched();
  const talent = audience === 'talent';
  return (
    <section id="ra-mat" className="dv-tile dv-tile-dark scroll-mt-16 px-4 py-16 md:py-24">
      <Reveal>
        <p className="dv-eyebrow text-[#86868b]">{launched ? 'Đã ra mắt' : 'Coming Soon'}</p>
        <h2 className="dv-display dv-headline mt-2 text-[#f5f5f7]">
          {launched ? (talent ? 'Vai diễn tiếp theo có thể là của bạn.' : 'Tìm đúng người, cho đúng vai.') : 'Chính thức ra mắt 11.11.2026.'}
        </h2>
      </Reveal>
      {!launched && (
        <Reveal delay={120} className="mt-10 w-full">
          <FlipCountdown />
        </Reveal>
      )}
      <Reveal delay={200} className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {talent ? (
          <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-light">
            Nộp hồ sơ diễn viên
          </Link>
        ) : (
          <>
            <Link href={href('/doi-tac/du-an/moi')} className="dv-btn dv-btn-light">
              Đăng casting call
            </Link>
            <Link href={href('/doi-tac/dang-ky')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
              Đăng ký đối tác <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </Reveal>
    </section>
  );
}

/**
 * Trang chủ: menu, màn hình đầu chọn luồng "Tôi là diễn viên" / "Tôi tìm diễn viên".
 * Luồng diễn viên: dự án đang casting, gương mặt, lợi ích, 7 bước nộp hồ sơ.
 * Luồng tìm diễn viên: gương mặt, lợi ích cho nhà sản xuất, 4 bước đăng casting.
 * Link có #nha-san-xuat mở thẳng luồng tìm diễn viên.
 */
export function DienVienVNLanding({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const [audience, setAudience] = useState<Audience>('talent');

  useEffect(() => {
    // Link trong email xác nhận rơi về trang chủ (chưa khai báo Redirect URL) → chuyển tiếp tới trang tạo mật khẩu
    const { search, hash } = window.location;
    if (/[?&]token_hash=/.test(search) || /access_token=|error_code=/.test(hash)) {
      window.location.replace(`${href('/tao-mat-khau')}${search}${hash}`);
      return;
    }
    const fromHash = () => {
      if (window.location.hash === '#nha-san-xuat') setAudience('hiring');
      else if (window.location.hash === '#du-an' || window.location.hash === '#dien-vien') setAudience('talent');
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const talent = audience === 'talent';
  return (
    <>
      <LandingNav audience={audience} onAudience={setAudience} />
      <main>
        <Hero stats={stats} audience={audience} onAudience={setAudience} />
        {talent && <ProjectsSection />}
        <FacesSection faces={stats.faces} />
        <AudienceTile audience={audience} />
        <Process audience={audience} />
        <Closing audience={audience} />
      </main>
      <SiteFooter />
    </>
  );
}
