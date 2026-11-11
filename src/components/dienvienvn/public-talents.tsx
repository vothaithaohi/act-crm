'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Link2, SlidersHorizontal, UserRound } from 'lucide-react';
import { EMPTY_FILTER, TalentFilter, TalentFilterPanel, activeCount, applyFilter } from './talent-filter';
import type { PartnerTalent } from '@/lib/dienvienvn/partners';
import { actorFetch, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { TalentProfileBody } from './talent-profile-view';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import { TalentLink } from './talent-drawer';
import { GlobalNav } from './site-chrome';

/* ---------------- Danh sách diễn viên ---------------- */
const projectCount = (t: PublicTalent) => t.experience.reduce((n, g) => n + g.items.length, 0);
const isAct = (t: PublicTalent) => t.trainings.some(x => /ACT Academy/i.test(x));
const genderLabel = (g: PublicTalent['gender']) => (g === 'female' ? 'Nữ' : g === 'male' ? 'Nam' : null);

export function TalentDirectory({ talents }: { talents: PublicTalent[] }) {
  const [filter, setFilter] = useState<TalentFilter>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');

  // Chưa có ô tìm kiếm: chỉ lọc bằng bộ lọc (sẽ thêm tìm kiếm sau khi xem nhu cầu của nhà sản xuất)
  const list = useMemo(() => applyFilter(talents, filter), [talents, filter]);
  const nActive = activeCount(filter);

  const subtitle = (t: PublicTalent) =>
    [genderLabel(t.gender), t.height_cm ? `${t.height_cm} cm` : null, projectCount(t) ? `${projectCount(t)} dự án` : null, isAct(t) ? 'ACT Academy' : null]
      .filter(Boolean)
      .join(' · ') || `@${t.username}`;

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-10 md:pt-16">
        <div className="mx-auto max-w-[1120px]">
          <h1 className="dv-display dv-headline">Đúng người. Đúng vai.</h1>

          {talents.length > 0 && (
            <div className="sticky top-11 z-20 -mx-4 mt-6 bg-[var(--dv-bg-alt)]/95 px-4 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                {/* Bộ lọc bên trái; bảng lọc trượt ra từ cạnh trái */}
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
                <div className="ml-auto flex rounded-full border border-[#d2d2d7] bg-white p-1">
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
                  <TalentLink username={t.username} className="group block overflow-hidden rounded-[18px] bg-white transition-shadow hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)]">
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
                  </TalentLink>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 space-y-2">
              {list.map(t => (
                <li key={t.username}>
                  <TalentLink username={t.username} className="flex items-center gap-4 rounded-[14px] bg-white p-3 transition-shadow hover:shadow-[0_8px_30px_-16px_rgba(0,0,0,0.25)]">
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
                  </TalentLink>
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

/* ---------------- Hồ sơ diễn viên (trang riêng, cùng bố cục với cửa sổ hồ sơ) ---------------- */
export function PublicTalentProfile({ talent, shareUrl }: { talent: PublicTalent; shareUrl: string }) {
  const session = useActorSession();
  const [copied, setCopied] = useState(false);
  const [partner, setPartner] = useState<PartnerTalent | null>(null);

  // Đối tác đã duyệt đang đăng nhập: thấy thêm liên hệ và số đo
  useEffect(() => {
    if (session.status !== 'signed-in') return setPartner(null);
    let cancelled = false;
    actorFetch(`/api/dienvienvn/partner/talents/${encodeURIComponent(talent.username)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(b => !cancelled && setPartner((b?.talent as PartnerTalent) || null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session.status, talent.username]);

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
        <div className="mx-auto max-w-[1080px]">
          <h1 className="sr-only">{talent.name}</h1>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1.5 text-[13px] hover:border-[#1d1d1f]">
              <Link2 className="h-3.5 w-3.5" /> {copied ? 'Đã sao chép link' : `dienvienvn.com/${talent.username}`}
            </button>
          </div>
          <TalentProfileBody talent={talent} partner={partner} />
        </div>
      </main>
    </>
  );
}
