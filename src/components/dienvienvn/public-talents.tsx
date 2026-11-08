'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link2, Search, SlidersHorizontal, UserRound, Video } from 'lucide-react';
import { EMPTY_FILTER, TalentFilter, TalentFilterPanel, activeCount, applyFilter } from './talent-filter';
import { youtubeId } from '@/lib/dienvienvn/selftapes';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import { useDvvnHref } from './base-path';
import { GlobalNav } from './site-chrome';

/* ---------------- Danh sách diễn viên ---------------- */
const fold = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const projectCount = (t: PublicTalent) => t.experience.reduce((n, g) => n + g.items.length, 0);
const isAct = (t: PublicTalent) => t.trainings.some(x => /ACT Academy/i.test(x));
const genderLabel = (g: PublicTalent['gender']) => (g === 'female' ? 'Nữ' : g === 'male' ? 'Nam' : null);

export function TalentDirectory({ talents }: { talents: PublicTalent[] }) {
  const href = useDvvnHref();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<TalentFilter>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');

  const indexed = useMemo(
    () => talents.map(t => ({ t, text: fold([t.name, t.username, ...t.skills.flatMap(g => g.items), ...t.experience.flatMap(g => g.items)].join(' ')) })),
    [talents]
  );
  const list = useMemo(() => {
    const words = fold(q.trim()).split(/\s+/).filter(Boolean);
    const matched = indexed.filter(({ text }) => words.every(w => text.includes(w))).map(x => x.t);
    return applyFilter(matched, filter);
  }, [indexed, q, filter]);
  const nActive = activeCount(filter);

  const inputCls = 'dv-input !h-11 !py-0 text-[15px]';
  const subtitle = (t: PublicTalent) =>
    [genderLabel(t.gender), t.height_cm ? `${t.height_cm} cm` : null, projectCount(t) ? `${projectCount(t)} dự án` : null, isAct(t) ? 'ACT Academy' : null]
      .filter(Boolean)
      .join(' · ') || `@${t.username}`;

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
            <div className="sticky top-11 z-20 -mx-4 mt-8 bg-[var(--dv-bg-alt)]/95 px-4 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full min-w-[220px] md:w-auto md:flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dv-text-tertiary)]" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tên, kỹ năng, phim đã đóng…" className={`${inputCls} !pl-11`} aria-label="Tìm diễn viên" />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className={`dv-btn !h-11 !py-0 text-[15px] ${nActive ? 'dv-btn-primary' : 'dv-btn-secondary'}`}
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Bộ lọc{nActive ? ` (${nActive})` : ''}
                </button>
                {nActive > 0 && (
                  <button type="button" onClick={() => setFilter(EMPTY_FILTER)} className="px-2 text-[14px] text-[var(--dv-text-secondary)] underline underline-offset-2">
                    Xoá lọc
                  </button>
                )}
                <div className="flex rounded-full border border-[#d2d2d7] bg-white p-1">
                  {(['grid', 'list'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`h-9 whitespace-nowrap rounded-full px-4 text-[14px] ${mode === m ? 'bg-[#1d1d1f] text-white' : 'text-[var(--dv-text-secondary)]'}`}
                    >
                      {m === 'grid' ? 'Lưới' : 'Danh sách'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[13px] text-[var(--dv-text-secondary)]">{list.length} diễn viên phù hợp</p>
            </div>
          )}

          {mode === 'grid' ? (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                      <p className="mt-0.5 truncate text-[13px] text-[var(--dv-text-secondary)]">{subtitle(t)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 space-y-2">
              {list.map(t => (
                <li key={t.username}>
                  <Link href={href(`/${t.username}`)} className="flex items-center gap-4 rounded-[14px] bg-white p-3 transition-shadow hover:shadow-[0_8px_30px_-16px_rgba(0,0,0,0.25)]">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#e8e8ed]">
                      {t.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.photos[0].url} alt={t.name} loading="lazy" className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#aeaeb2]">
                          <UserRound className="h-6 w-6" strokeWidth={1.3} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold">{t.name}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--dv-text-secondary)]">{subtitle(t)}</p>
                      {t.skills.length > 0 && (
                        <p className="mt-1 truncate text-[13px] text-[var(--dv-text-tertiary)]">{t.skills.flatMap(g => g.items).slice(0, 5).join(' · ')}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--dv-text-tertiary)]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {talents.length > 0 && list.length === 0 && (
            <p className="mt-6 text-[15px] text-[var(--dv-text-secondary)]">Không tìm thấy diễn viên phù hợp.</p>
          )}
        </div>
      </main>
      {filterOpen && (
        <TalentFilterPanel talents={talents} value={filter} onChange={setFilter} resultCount={list.length} onClose={() => setFilterOpen(false)} />
      )}
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
                {talent.trainings.some(t => /ACT Academy/i.test(t)) && (
                  <span className="rounded-full bg-[#1d1d1f] px-2.5 py-1 text-[12px] font-semibold text-white">ACT Academy</span>
                )}
                <span>{talent.age != null ? `${talent.age} tuổi · ` : ''}Diễn viên · DienVienVN</span>
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-[13px] text-[var(--dv-text)] hover:border-[#1d1d1f]">
                  <Link2 className="h-3.5 w-3.5" /> {copied ? 'Đã sao chép link' : `dienvienvn.com/${talent.username}`}
                </button>
              </div>

              {talent.selftapes.length > 0 && (
                <section className="dv-card mt-8 p-6">
                  <h2 className="text-[19px] font-semibold">Self-tape nổi bật</h2>
                  <ul className="mt-4 space-y-4">
                    {talent.selftapes.map((v, k) => {
                      const yt = youtubeId(v.url);
                      return (
                        <li key={v.url + k}>
                          {yt ? (
                            <div className="aspect-video overflow-hidden rounded-[14px] bg-black">
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${yt}`}
                                title={v.title || `Self-tape ${k + 1}`}
                                loading="lazy"
                                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="h-full w-full"
                              />
                            </div>
                          ) : (
                            <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[14px] bg-[var(--dv-bg-alt)] p-4 hover:bg-[#ededf0]">
                              <Video className="h-5 w-5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{v.title || `Self-tape ${k + 1}`}</span>
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            </a>
                          )}
                          {yt && v.title && <p className="mt-1.5 text-[14px] text-[var(--dv-text-secondary)]">{v.title}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {talent.experience.length > 0 && (
                <section className={`dv-card p-6 ${talent.selftapes.length ? 'mt-4' : 'mt-8'}`}>
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

              {talent.gallery.length > 0 && (
                <section className="dv-card mt-4 p-6">
                  <h2 className="text-[19px] font-semibold">Ảnh hoạt động</h2>
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {talent.gallery.map((g, k) => (
                      <li key={g.url + k}>
                        <figure>
                          <div className="aspect-[4/5] overflow-hidden rounded-[14px] bg-[#e8e8ed]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={g.url} alt={g.caption || `Ảnh hoạt động ${k + 1}`} loading="lazy" className="h-full w-full object-cover" />
                          </div>
                          {g.caption && <figcaption className="mt-1.5 text-[13px] leading-[1.4] text-[var(--dv-text-secondary)]">{g.caption}</figcaption>}
                        </figure>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {talent.experience.length === 0 && talent.skills.length === 0 && talent.trainings.length === 0 && (
                <p className="mt-8 text-[15px] text-[var(--dv-text-secondary)]">Diễn viên đang cập nhật thêm thông tin hồ sơ.</p>
              )}

              {/* Liên hệ / hồ sơ đầy đủ (số đo, liên hệ) chỉ dành cho đối tác đã được DienVienVN duyệt */}
              <section className="dv-card mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[17px] font-semibold">Muốn mời diễn viên này casting?</p>
                  <p className="mt-0.5 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
                    Số đo và thông tin liên hệ dành cho đạo diễn, nhà sản xuất là đối tác DienVienVN.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={href(`/doi-tac/dang-ky?next=${encodeURIComponent(href(`/doi-tac/${talent.username}`))}`)} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
                    Liên hệ
                  </Link>
                  <Link href={href(`/doi-tac/${talent.username}`)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
                    Đối tác đăng nhập
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
