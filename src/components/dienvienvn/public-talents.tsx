'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link2, Search, UserRound } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import { useDvvnHref } from './base-path';
import { GlobalNav } from './site-chrome';

/* ---------------- Danh sách diễn viên ---------------- */
export function TalentDirectory({ talents }: { talents: PublicTalent[] }) {
  const href = useDvvnHref();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const k = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    if (!k) return talents;
    return talents.filter(t =>
      `${t.name} ${t.username}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').includes(k)
    );
  }, [q, talents]);

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-10 md:pt-16">
        <div className="mx-auto max-w-[1120px]">
          <h1 className="dv-display dv-headline">Diễn viên DienVienVN.</h1>
          <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">
            {talents.length > 0 ? `${talents.length} hồ sơ diễn viên đã được duyệt.` : 'Các hồ sơ đã duyệt sẽ sớm xuất hiện tại đây.'}
          </p>
          <p className="mt-3 text-[14px] text-[var(--dv-text-secondary)]">
            Đạo diễn, nhà sản xuất?{' '}
            <Link href={href('/doi-tac')} className="dv-link font-semibold">
              Đăng nhập cổng đối tác <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </p>

          {talents.length > 0 && (
            <div className="relative mt-8 max-w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dv-text-tertiary)]" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Tìm theo tên diễn viên"
                className="dv-input !pl-11"
                aria-label="Tìm diễn viên"
              />
            </div>
          )}

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map(t => (
              <li key={t.username}>
                <Link href={href(`/${t.username}`)} className="group block overflow-hidden rounded-[18px] bg-white transition-shadow hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)]">
                  <div className="aspect-[3/4] overflow-hidden bg-[#e8e8ed]">
                    {t.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.photos[0].url} alt={t.name} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#aeaeb2]">
                        <UserRound className="h-10 w-10" strokeWidth={1.3} />
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="truncate text-[16px] font-semibold leading-[1.25]">{t.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--dv-text-secondary)]">
                      {[t.experience.length ? `${t.experience.reduce((n, g) => n + g.items.length, 0)} dự án` : null, t.trainings[0]?.split(' · ')[0]]
                        .filter(Boolean)
                        .join(' · ') || `@${t.username}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {talents.length > 0 && list.length === 0 && (
            <p className="mt-6 text-[15px] text-[var(--dv-text-secondary)]">Không tìm thấy diễn viên phù hợp.</p>
          )}
        </div>
      </main>
    </>
  );
}

/* ---------------- Hồ sơ diễn viên ---------------- */
export function PublicTalentProfile({ talent, shareUrl }: { talent: PublicTalent; shareUrl: string }) {
  const href = useDvvnHref();
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const photos = talent.photos;
  const n = photos.length;
  const current = photos[Math.min(i, Math.max(n - 1, 0))];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-6 md:pt-10">
        <div className="mx-auto max-w-[1040px]">
          <Link href={href('/dien-vien')} className="dv-link text-[14px]">
            <ChevronLeft className="h-4 w-4" /> Tất cả diễn viên
          </Link>

          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)] md:gap-10">
            {/* Ảnh */}
            <div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-[#e8e8ed]">
                {current ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.url} alt={`${talent.name} — ${current.label}`} className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#aeaeb2]">
                    <UserRound className="h-14 w-14" strokeWidth={1.2} />
                  </div>
                )}
                {n > 1 && (
                  <>
                    <button type="button" aria-label="Ảnh trước" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur">
                      {photos.map((p, k) => (
                        <button
                          key={p.url}
                          type="button"
                          aria-label={`Xem ảnh ${k + 1}: ${p.label}`}
                          aria-current={k === i}
                          onClick={() => setI(k)}
                          className={`h-2 rounded-full transition-all ${k === i ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Thông tin */}
            <div>
              <h1 className="dv-display text-[36px] font-semibold leading-[1.1] md:text-[48px]">{talent.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-[var(--dv-text-secondary)]">
                <span>Diễn viên · DienVienVN</span>
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-[13px] text-[var(--dv-text)] hover:border-[#1d1d1f]">
                  <Link2 className="h-3.5 w-3.5" /> {copied ? 'Đã sao chép link' : `dienvienvn.com/${talent.username}`}
                </button>
              </div>

              {talent.experience.length > 0 && (
                <section className="dv-card mt-8 p-6">
                  <h2 className="text-[19px] font-semibold">Kinh nghiệm diễn xuất</h2>
                  <div className="mt-4 space-y-4">
                    {talent.experience.map(g => (
                      <div key={g.group}>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{g.group}</p>
                        <ul className="mt-1.5 space-y-1 text-[15px] leading-[1.47]">
                          {g.items.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {talent.skills.length > 0 && (
                <section className="dv-card mt-4 p-6">
                  <h2 className="text-[19px] font-semibold">Kỹ năng</h2>
                  <div className="mt-4 space-y-3">
                    {talent.skills.map(g => (
                      <div key={g.group}>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{g.group}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {g.items.map(item => (
                            <span key={item} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[14px]">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {talent.trainings.length > 0 && (
                <section className="dv-card mt-4 p-6">
                  <h2 className="text-[19px] font-semibold">Đào tạo diễn xuất</h2>
                  <ul className="mt-3 space-y-1 text-[15px] leading-[1.47]">
                    {talent.trainings.map(t => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}

              {talent.experience.length === 0 && talent.skills.length === 0 && talent.trainings.length === 0 && (
                <p className="mt-8 text-[15px] text-[var(--dv-text-secondary)]">Diễn viên đang cập nhật thêm thông tin hồ sơ.</p>
              )}

              <p className="mt-6 text-[14px] text-[var(--dv-text-secondary)]">
                Đối tác của DienVienVN?{' '}
                <Link href={href(`/doi-tac/${talent.username}`)} className="dv-link font-semibold">
                  Xem hồ sơ đầy đủ <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
