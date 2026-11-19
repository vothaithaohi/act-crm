'use client';


import { useTx } from './i18n';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Link2, Loader2, MapPin, MonitorPlay, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { PROJECT_TYPES, ProjectRole, PublicProject, castingModeLabel, genderLabel, isDeadlinePassed, projectPathName, projectTypeLabel, roleSlug, sourceLabel } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { useDvvnHref } from './base-path';
import { formatVnDate } from './projects-section';

const PAGE_SIZE = 10;

type Call = { key: string; project: PublicProject; role: ProjectRole; path: string; rolePath: string };

/** Mô tả vai: hiện 2 dòng, dài hơn thì có "Xem thêm" để mở hết ngay trong ô (không chuyển trang). */
function RoleDescription({ text }: { text: string }) {
  const tx = useTx();
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setLong(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <div className="relative z-10 mt-2 w-fit max-w-full">
      <p ref={ref} className={`pointer-events-none whitespace-pre-line text-[15px] leading-[1.5] text-[var(--dv-text-secondary)] ${open ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {(long || open) && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="mt-1 inline-flex items-center gap-1 text-[15px] font-semibold text-[var(--dv-text)] hover:underline"
        >
          {tx(open ? 'Thu gọn' : '… Xem thêm')}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

/** Nút sao chép đúng link (dự án hoặc vai), bấm xong hiện "Đã sao chép link" 2 giây. */
function CopyLink({ path, label }: { path: string; label: string }) {
  const tx = useTx();
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(tx('Sao chép link:'), url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={tx(label)}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 text-[13px] text-[var(--dv-text)] transition-colors hover:border-[#86868b]"
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      <span>{tx(copied ? 'Đã sao chép link' : label)}</span>
    </button>
  );
}

const ageText = (r: ProjectRole) =>
  r.age_min && r.age_max ? `${r.age_min} - ${r.age_max}` : r.age_min ? `Từ ${r.age_min}` : r.age_max ? `Đến ${r.age_max}` : '';

function Tag({ icon: Icon, children, tone = 'gray' }: { icon: typeof MapPin; children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' }) {
  const tx = useTx();
  const cls = tone === 'green' ? 'bg-[#eaf6ee] text-[#1d5c33]' : tone === 'amber' ? 'bg-[#fdf3e1] text-[#7a4b0c]' : 'bg-[var(--dv-bg-alt)] text-[var(--dv-text)]';
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[14px] ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{tx(children)}</span>
    </span>
  );
}

function CallTags({ c }: { c: Call }) {
  const tx = useTx();
  const { project: p, role: r } = c;
  return (
    <div className="flex flex-wrap gap-2">
      <Tag icon={Banknote} tone="green">
        {tx(p.compensation || 'Thoả thuận')}
      </Tag>
      <Tag icon={UserRound} tone="amber">
        {tx(genderLabel(r.gender))}
      </Tag>
      {p.location && <Tag icon={MapPin}>{tx(provinceLabel(p.location))}</Tag>}
      {ageText(r) && <Tag icon={UserRound}>{tx(ageText(r))} {tx("tuổi")}</Tag>}
      <Tag icon={Clapperboard}>{tx(projectTypeLabel(p.project_type))}</Tag>
      {p.casting_mode && <Tag icon={MonitorPlay}>{tx(castingModeLabel(p.casting_mode))}</Tag>}
      {p.source && <Tag icon={Building2}>{tx(sourceLabel(p.source))}</Tag>}
    </div>
  );
}

/** Trang /du-an: danh sách vai đang tuyển (theo mẫu castingnetworks.com/casting-calls). */
export function CastingCalls() {
  const tx = useTx();
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

  useEffect(() => {
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, []);

  const calls = useMemo<Call[]>(
    () =>
      (projects || []).flatMap(p =>
        p.roles.map(r => {
          const path = href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`);
          return { key: `${p.id}:${r.id}`, project: p, role: r, path, rolePath: `${path}/${roleSlug(r, p.roles)}` };
        })
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
  const toggleProject = (id: string) => setOpenProjects(o => (o.includes(id) ? o.filter(x => x !== id) : [...o, id]));
  const nFilters = (gender !== 'all' ? 1 : 0) + (age ? 1 : 0) + (place ? 1 : 0);

  const goPage = (n: number) => {
    setPage(n);
    document.getElementById('casting-calls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Một vai trong danh sách: bấm vào mở trang của vai (link riêng); nút bên cạnh sao chép link vai. compact: trong dự án đang mở rộng. */
  const roleItem = (c: Call, compact = false) => (
    <li key={c.key} className="group relative rounded-[16px] border border-[#e0e0e5] p-5 transition-colors hover:border-[#86868b] md:p-6">
      {/* Cả ô là link tới trang vai; mô tả (Xem thêm) và nút Link vai nằm trên lớp link nên bấm riêng được */}
      <Link href={c.rolePath} className="absolute inset-0 rounded-[16px]" aria-label={c.role.name} />
      <p className="pointer-events-none relative flex items-center gap-2 pr-28 text-[15px] text-[var(--dv-text-secondary)] sm:pr-40">
        <Clapperboard className="h-4 w-4 shrink-0" /> {tx(projectTypeLabel(c.project.project_type))}
        {!compact && c.project.deadline ? tx(` · Hạn ${formatVnDate(c.project.deadline)}`) : ''}
      </p>
      <p className="dv-display pointer-events-none relative mt-1.5 text-[24px] font-semibold leading-[1.2]">{c.role.name}</p>
      {!compact && <p className="pointer-events-none relative mt-1 text-[16px]">{c.project.display_name}</p>}
      {c.role.description?.trim() && <RoleDescription text={c.role.description.trim()} />}
      <div className="pointer-events-none relative mt-4">
        <CallTags c={c} />
      </div>
      <div className="absolute right-4 top-4 z-10 md:right-5 md:top-5">
        <CopyLink path={c.rolePath} label="Link vai" />
      </div>
    </li>
  );

  return (
    <div className="bg-white pb-16">
      {/* Loại dự án */}
      <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6">
        <div className="dv-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:justify-center md:px-0">
          {[{ id: 'all', label: 'Tất cả vai' }, ...PROJECT_TYPES].map(t => (
            <button key={t.id} type="button" className="dv-chip shrink-0" aria-pressed={type === t.id} onClick={() => setType(t.id)}>
              {tx(t.label)}
            </button>
          ))}
        </div>
      </div>

      <div id="casting-calls" className="mx-auto max-w-[908px] scroll-mt-16 px-4 pt-10 md:px-6 md:pt-14">
        <h1 className="dv-display dv-headline">{tx("Dự án đang casting.")}</h1>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <div className="flex rounded-full border border-[#d2d2d7] bg-white p-1" role="group" aria-label={tx("Cách xem")}>
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
                {tx(label)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setFilterOpen(true)} className={`dv-btn !h-10 !py-0 text-[14px] ${nFilters ? 'dv-btn-primary' : 'dv-btn-secondary'}`}>
            <SlidersHorizontal className="h-4 w-4" /> {tx("Bộ lọc (")}{tx(nFilters)})
          </button>
        </div>

        {!projects ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-[17px] text-[var(--dv-text-secondary)]">
            {tx(calls.length ? 'Không có vai phù hợp bộ lọc.' : 'Hiện chưa có dự án nào đang nhận hồ sơ. Vui lòng quay lại sau.')}
          </p>
        ) : (
          <div className="mt-5">
            {/* Danh sách vai */}
            {view === 'role' ? (
              <ul className="space-y-4">{shown.map(c => roleItem(c))}</ul>
            ) : (
              <ul className="space-y-4">
                {shownGroups.map(g => {
                  const open = openProjects.includes(g.project.id);
                  return (
                    <li key={g.project.id} className="rounded-[16px] border border-[#e0e0e5]">
                      <div className="flex items-start justify-between gap-3 p-5 md:p-6">
                        <Link href={g.path} className="group min-w-0">
                          <span className="flex items-center gap-2 text-[15px] text-[var(--dv-text-secondary)]">
                            <Clapperboard className="h-4 w-4" /> {tx(projectTypeLabel(g.project.project_type))}
                            {tx(g.project.deadline ? ` · Hạn ${formatVnDate(g.project.deadline)}` : '')}
                          </span>
                          <span className="dv-display mt-1.5 block text-[24px] font-semibold leading-[1.2] group-hover:underline">{g.project.display_name}</span>
                        </Link>
                        <CopyLink path={g.path} label="Link dự án" />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProject(g.project.id)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-4 border-t border-[#f0f0f2] px-5 py-3 text-left text-[15px] text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)] md:px-6"
                      >
                        <span>
                          {tx(`${g.calls.length} vai đang tuyển`)} · {tx(open ? 'Thu gọn' : 'Xem các vai')}
                        </span>
                        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && <ul className="space-y-3 border-t border-[#e0e0e5] p-4 md:p-5">{g.calls.map(c => roleItem(c, true))}</ul>}
                    </li>
                  );
                })}
              </ul>
            )}

          </div>
        )}

        {/* Phân trang */}
        {pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label={tx("Phân trang")}>
            <button type="button" disabled={page === 1} onClick={() => goPage(page - 1)} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30" aria-label={tx("Trang trước")}>
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
                {tx(n)}
              </button>
            ))}
            <button type="button" disabled={page === pages} onClick={() => goPage(page + 1)} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30" aria-label={tx("Trang sau")}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}

        {/* Theo địa điểm */}
        {places.length > 0 && (
          <section className="mt-16 text-center">
            <h2 className="dv-display text-[28px] font-semibold md:text-[32px]">{tx("Tìm dự án casting gần bạn")}</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {places.map(l => (
                <button key={l} type="button" className="dv-chip" aria-pressed={place === l} onClick={() => setPlace(place === l ? '' : l)}>
                  {tx(provinceLabel(l))}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bảng bộ lọc */}
      {filterOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setFilterOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={tx("Bộ lọc")} onClick={e => e.stopPropagation()} className="flex h-full w-full max-w-[400px] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
              <p className="text-[19px] font-semibold">{tx("Bộ lọc")}</p>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label={tx("Đóng")} className="rounded-full p-2 hover:bg-[var(--dv-bg-alt)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{tx("Giới tính")}</p>
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
                      {tx(label)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{tx("Tuổi của bạn")}</p>
                <input inputMode="numeric" value={age} onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={tx("VD: 25")} className="dv-input" aria-label={tx("Tuổi của bạn")} />
              </div>
              {places.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{tx("Địa điểm")}</p>
                  <select value={place} onChange={e => setPlace(e.target.value)} className="dv-input" aria-label={tx("Địa điểm")}>
                    <option value="">{tx("Mọi địa điểm")}</option>
                    {places.map(l => (
                      <option key={l} value={l}>
                        {tx(provinceLabel(l))}
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
                {tx("Xoá lọc")}
              </button>
              <button type="button" onClick={() => setFilterOpen(false)} className="dv-btn dv-btn-primary flex-1">
                {tx("Xem")} {tx(list.length)} {tx("vai")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
