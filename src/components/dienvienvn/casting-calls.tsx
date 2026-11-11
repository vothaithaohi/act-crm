'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Loader2, MapPin, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { PROJECT_TYPES, ProjectRole, PublicProject, genderLabel, isDeadlinePassed, projectPathName, projectTypeLabel } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { useDvvnHref } from './base-path';
import { formatVnDate } from './projects-section';

const PAGE_SIZE = 10;

type Call = { key: string; project: PublicProject; role: ProjectRole; path: string };

const ageText = (r: ProjectRole) =>
  r.age_min && r.age_max ? `${r.age_min} - ${r.age_max}` : r.age_min ? `Từ ${r.age_min}` : r.age_max ? `Đến ${r.age_max}` : '';

function Tag({ icon: Icon, children, tone = 'gray' }: { icon: typeof MapPin; children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' }) {
  const cls = tone === 'green' ? 'bg-[#eaf6ee] text-[#1d5c33]' : tone === 'amber' ? 'bg-[#fdf3e1] text-[#7a4b0c]' : 'bg-[var(--dv-bg-alt)] text-[var(--dv-text)]';
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[14px] ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function CallTags({ c }: { c: Call }) {
  const { project: p, role: r } = c;
  return (
    <div className="flex flex-wrap gap-2">
      <Tag icon={Banknote} tone="green">
        {p.compensation || 'Thoả thuận'}
      </Tag>
      <Tag icon={UserRound} tone="amber">
        {genderLabel(r.gender)}
      </Tag>
      {p.location && <Tag icon={MapPin}>{provinceLabel(p.location)}</Tag>}
      {ageText(r) && <Tag icon={UserRound}>{ageText(r)} tuổi</Tag>}
      <Tag icon={Clapperboard}>{projectTypeLabel(p.project_type)}</Tag>
    </div>
  );
}

/** Trang /du-an: danh sách vai đang tuyển (theo mẫu castingnetworks.com/casting-calls). */
export function CastingCalls() {
  const href = useDvvnHref();
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const [type, setType] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [age, setAge] = useState('');
  const [place, setPlace] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  // Xem theo vai (sổ hết các vai) hoặc theo dự án (thu gọn, bấm vào xem các vai của dự án đó)
  const [view, setView] = useState<'role' | 'project'>('role');
  const [openProjects, setOpenProjects] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, []);

  const calls = useMemo<Call[]>(
    () =>
      (projects || []).flatMap(p =>
        p.roles.map(r => ({ key: `${p.id}:${r.id}`, project: p, role: r, path: href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`) }))
      ),
    [projects, href]
  );
  const places = useMemo(() => Array.from(new Set((projects || []).map(p => p.location).filter(Boolean) as string[])), [projects]);

  const list = useMemo(() => {
    const a = age ? Number(age) : null;
    return calls.filter(({ project: p, role: r }) => {
      if (type !== 'all' && p.project_type !== type) return false;
      if (gender !== 'all' && r.gender !== 'any' && r.gender !== gender) return false;
      if (a !== null && ((r.age_min && a < r.age_min) || (r.age_max && a > r.age_max))) return false;
      if (place && p.location !== place) return false;
      return true;
    });
  }, [calls, type, gender, age, place]);

  const groups = useMemo(() => {
    const map = new Map<string, { project: PublicProject; path: string; calls: Call[] }>();
    for (const c of list) {
      const g = map.get(c.project.id) || { project: c.project, path: c.path, calls: [] };
      g.calls.push(c);
      map.set(c.project.id, g);
    }
    return Array.from(map.values());
  }, [list]);

  useEffect(() => setPage(1), [type, gender, age, place, view]);
  const total = view === 'role' ? list.length : groups.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shownGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current =
    list.find(c => c.key === selected) ||
    (view === 'role' ? shown[0] : shownGroups.find(g => openProjects.includes(g.project.id))?.calls[0] || shownGroups[0]?.calls[0]);
  const toggleProject = (id: string) => setOpenProjects(o => (o.includes(id) ? o.filter(x => x !== id) : [...o, id]));
  const nFilters = (gender !== 'all' ? 1 : 0) + (age ? 1 : 0) + (place ? 1 : 0);

  const goPage = (n: number) => {
    setPage(n);
    document.getElementById('casting-calls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Một vai trong danh sách (compact: hiện trong dự án đang mở rộng, không lặp tên dự án). */
  const roleItem = (c: Call, compact = false) => {
                const active = current?.key === c.key;
                const body = (
                  <>
                    <p className="flex items-center gap-2 text-[15px] text-[var(--dv-text-secondary)]">
                      <Clapperboard className="h-4 w-4" /> {projectTypeLabel(c.project.project_type)}
                    </p>
                    <p className="dv-display mt-1.5 text-[24px] font-semibold leading-[1.2]">{c.role.name}</p>
                    {!compact && <p className="mt-1 text-[16px]">{c.project.display_name}</p>}
                    <div className="mt-4">
                      <CallTags c={c} />
                    </div>
                  </>
                );
                return (
                  <li key={c.key}>
                    {/* Điện thoại: bấm vào thẳng trang dự án; máy tính: chọn để xem chi tiết bên phải */}
                    <Link href={c.path} className="block rounded-[16px] border border-[#e0e0e5] p-5 lg:hidden">
                      {body}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelected(c.key)}
                      className={`hidden w-full rounded-[16px] border p-6 text-left transition-colors lg:block ${active ? 'border-[#1d1d1f] shadow-[0_6px_0_0_#1d1d1f]' : 'border-[#e0e0e5] hover:border-[#86868b]'}`}
                    >
                      {body}
                    </button>
                  </li>
                );
                };

  return (
    <div className="bg-white pb-16">
      {/* Loại dự án */}
      <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6">
        <div className="dv-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:justify-center md:px-0">
          {[{ id: 'all', label: 'Tất cả vai' }, ...PROJECT_TYPES].map(t => (
            <button key={t.id} type="button" className="dv-chip shrink-0" aria-pressed={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div id="casting-calls" className="mx-auto max-w-[1200px] scroll-mt-16 px-4 pt-10 md:px-6 md:pt-14">
        <h1 className="dv-display dv-headline">Dự án đang casting.</h1>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <div className="flex rounded-full border border-[#d2d2d7] bg-white p-1" role="group" aria-label="Cách xem">
            {(
              [
                ['role', 'Theo vai'],
                ['project', 'Theo dự án']
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={view === k}
                onClick={() => setView(k)}
                className={`h-8 whitespace-nowrap rounded-full px-4 text-[14px] ${view === k ? 'bg-[#1d1d1f] text-white' : 'text-[var(--dv-text-secondary)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setFilterOpen(true)} className={`dv-btn !h-10 !py-0 text-[14px] ${nFilters ? 'dv-btn-primary' : 'dv-btn-secondary'}`}>
            <SlidersHorizontal className="h-4 w-4" /> Bộ lọc ({nFilters})
          </button>
        </div>

        {!projects ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-[17px] text-[var(--dv-text-secondary)]">
            {calls.length ? 'Không có vai phù hợp bộ lọc.' : 'Hiện chưa có dự án nào đang nhận hồ sơ. Vui lòng quay lại sau.'}
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* Danh sách vai */}
            {view === 'role' ? (
              <ul className="space-y-4">{shown.map(c => roleItem(c))}</ul>
            ) : (
              <ul className="space-y-4">
                {shownGroups.map(g => {
                  const open = openProjects.includes(g.project.id);
                  return (
                    <li key={g.project.id} className="rounded-[16px] border border-[#e0e0e5]">
                      <button type="button" onClick={() => toggleProject(g.project.id)} aria-expanded={open} className="flex w-full items-start justify-between gap-4 p-5 text-left md:p-6">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-[15px] text-[var(--dv-text-secondary)]">
                            <Clapperboard className="h-4 w-4" /> {projectTypeLabel(g.project.project_type)}
                            {g.project.deadline ? ` · Hạn ${formatVnDate(g.project.deadline)}` : ''}
                          </span>
                          <span className="dv-display mt-1.5 block text-[24px] font-semibold leading-[1.2]">{g.project.display_name}</span>
                          <span className="mt-1 block text-[15px] text-[var(--dv-text-secondary)]">{g.calls.length} vai đang tuyển</span>
                        </span>
                        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && <ul className="space-y-3 border-t border-[#e0e0e5] p-4 md:p-5">{g.calls.map(c => roleItem(c, true))}</ul>}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Chi tiết vai đang chọn */}
            {current && (
              <aside className="hidden lg:block">
                <div className="sticky top-16 rounded-[16px] border border-[#1d1d1f] p-6">
                  <p className="flex items-center gap-2 text-[15px] text-[var(--dv-text-secondary)]">
                    <Clapperboard className="h-4 w-4" /> {projectTypeLabel(current.project.project_type)}
                  </p>
                  <p className="dv-display mt-1.5 text-[26px] font-semibold leading-[1.2]">{current.role.name}</p>
                  <p className="mt-1 text-[16px]">{current.project.display_name}</p>
                  <div className="mt-4">
                    <CallTags c={current} />
                  </div>
                  <p className="mt-6 text-[17px] font-semibold">Về vai diễn</p>
                  <p className="mt-2 line-clamp-6 whitespace-pre-line text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">
                    {current.role.description?.trim() || current.project.description?.trim() || 'Xem chi tiết dự án để biết thêm về vai diễn.'}
                  </p>
                  {current.project.deadline && (
                    <p className="mt-4 flex items-center gap-2 text-[15px]">
                      <CalendarClock className="h-4 w-4" /> <span className="font-semibold">Hạn nộp:</span> {formatVnDate(current.project.deadline)}
                    </p>
                  )}
                  <Link href={current.path} className="dv-btn dv-btn-primary mt-6 w-full">
                    Xem &amp; ứng tuyển
                  </Link>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Phân trang */}
        {pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Phân trang">
            <button type="button" disabled={page === 1} onClick={() => goPage(page - 1)} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30" aria-label="Trang trước">
              <ChevronLeft className="h-5 w-5" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => goPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`h-10 min-w-10 rounded-full px-3 text-[16px] ${n === page ? 'bg-[#1d1d1f] text-white' : 'hover:bg-[var(--dv-bg-alt)]'}`}
              >
                {n}
              </button>
            ))}
            <button type="button" disabled={page === pages} onClick={() => goPage(page + 1)} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30" aria-label="Trang sau">
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}

        {/* Theo địa điểm */}
        {places.length > 0 && (
          <section className="mt-16 text-center">
            <h2 className="dv-display text-[28px] font-semibold md:text-[32px]">Tìm dự án casting gần bạn</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {places.map(l => (
                <button key={l} type="button" className="dv-chip" aria-pressed={place === l} onClick={() => setPlace(place === l ? '' : l)}>
                  {provinceLabel(l)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bảng bộ lọc */}
      {filterOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setFilterOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Bộ lọc" onClick={e => e.stopPropagation()} className="flex h-full w-full max-w-[400px] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
              <p className="text-[19px] font-semibold">Bộ lọc</p>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label="Đóng" className="rounded-full p-2 hover:bg-[var(--dv-bg-alt)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Giới tính</p>
                <div className="flex rounded-full border border-[#d2d2d7] p-1">
                  {(
                    [
                      ['all', 'Tất cả'],
                      ['male', 'Nam'],
                      ['female', 'Nữ']
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGender(id)}
                      className={`h-9 flex-1 rounded-full text-[14px] ${gender === id ? 'bg-[#1d1d1f] text-white' : 'text-[var(--dv-text-secondary)]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Tuổi của bạn</p>
                <input inputMode="numeric" value={age} onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="VD: 25" className="dv-input" aria-label="Tuổi của bạn" />
              </div>
              {places.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Địa điểm</p>
                  <select value={place} onChange={e => setPlace(e.target.value)} className="dv-input" aria-label="Địa điểm">
                    <option value="">Mọi địa điểm</option>
                    {places.map(l => (
                      <option key={l} value={l}>
                        {provinceLabel(l)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-[#f0f0f2] px-5 py-4">
              <button
                type="button"
                disabled={!nFilters}
                onClick={() => {
                  setGender('all');
                  setAge('');
                  setPlace('');
                }}
                className="dv-btn dv-btn-secondary disabled:opacity-40"
              >
                Xoá lọc
              </button>
              <button type="button" onClick={() => setFilterOpen(false)} className="dv-btn dv-btn-primary flex-1">
                Xem {list.length} vai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
