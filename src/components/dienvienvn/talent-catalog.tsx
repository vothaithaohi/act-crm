'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, Search } from 'lucide-react';
import { actorFetch } from '@/lib/dienvienvn/actor-auth';
import type { ProducerApplicant, ProducerTalent } from '@/lib/projects/producer';
import { experienceGroups, foldVi, skillGroups } from '@/lib/dienvienvn/talent-sections';
import { useDvvnHref } from './base-path';
import { ApplicantCard, ApplicantRow } from './producer-board';
import { GlobalNav } from './site-chrome';

type CatalogData = { limited: boolean; label: string | null; talents: ProducerTalent[] };

const PAGE = 48;

/** Khoảng tuổi của 1 hồ sơ: bản công khai chỉ có "25–29", đối tác có tuổi thật. */
function ageSpan(t: ProducerTalent): [number, number] | null {
  if (typeof t.age === 'number') return [t.age, t.age];
  const m = /^(\d+)–(\d+)$/.exec(t.age_range || '');
  if (m) return [Number(m[1]), Number(m[2])];
  if (t.age_range === 'Dưới 18') return [0, 17];
  return null;
}

/** Link kho diễn viên gửi NSX: toàn bộ hồ sơ đã duyệt, lọc theo giới tính / tuổi / chiều cao / từ khoá. */
export function TalentCatalog({ token }: { token: string }) {
  const href = useDvvnHref();
  const [data, setData] = useState<CatalogData | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [hMin, setHMin] = useState('');
  const [hMax, setHMax] = useState('');
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    (async () => {
      const res = await actorFetch(`/api/dienvienvn/catalog/${encodeURIComponent(token)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.mode !== 'live') {
        setError(body.error || (body.mode === 'demo' ? 'Chế độ demo chưa hỗ trợ link kho diễn viên.' : 'Không tải được danh sách.'));
        return setData(null);
      }
      setData(body as CatalogData);
    })().catch(() => {
      setError('Mất kết nối mạng. Vui lòng tải lại trang.');
      setData(null);
    });
  }, [token]);

  const indexed = useMemo(
    () =>
      (data?.talents || []).map(t => ({
        t,
        text: foldVi(
          [t.full_name, ...skillGroups(t).flatMap(g => g.items), ...experienceGroups(t.acting_experience).flatMap(g => g.items)].join(' ')
        )
      })),
    [data]
  );

  const filtered = useMemo(() => {
    const words = foldVi(q.trim()).split(/\s+/).filter(Boolean);
    const num = (v: string) => (v ? Number(v) : null);
    const [a1, a2, h1, h2] = [num(ageMin), num(ageMax), num(hMin), num(hMax)];
    return indexed
      .filter(({ t, text }) => {
        if (words.some(w => !text.includes(w))) return false;
        if (gender !== 'all' && t.gender !== gender) return false;
        if (a1 !== null || a2 !== null) {
          const span = ageSpan(t);
          if (!span) return false;
          if (a1 !== null && span[1] < a1) return false;
          if (a2 !== null && span[0] > a2) return false;
        }
        if (h1 !== null && !(t.height_cm && t.height_cm >= h1)) return false;
        if (h2 !== null && !(t.height_cm && t.height_cm <= h2)) return false;
        return true;
      })
      .map(x => x.t);
  }, [indexed, q, gender, ageMin, ageMax, hMin, hMax]);

  useEffect(() => setShown(PAGE), [q, gender, ageMin, ageMax, hMin, hMax]);

  if (data === undefined) {
    return (
      <>
        <GlobalNav minimal />
        <main className="flex min-h-[60vh] items-center justify-center bg-[var(--dv-bg-alt)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
        </main>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <GlobalNav minimal />
        <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
          <h1 className="dv-display dv-headline">Link không khả dụng.</h1>
          <p className="dv-subhead mt-3 text-[var(--dv-text-secondary)]">{error}</p>
        </main>
      </>
    );
  }

  const next = href(`/kho/${token}`);
  const signupHref = href(`/doi-tac/dang-ky?next=${encodeURIComponent(next)}`);
  const asApplicant = (t: ProducerTalent): ProducerApplicant => ({ application: { id: t.id, role_id: '', selftape_url: null, note: null, created_at: '' }, talent: t });
  const inputCls = 'dv-input !h-11 !py-0 text-[15px]';

  return (
    <>
      <div className="print:hidden">
        <GlobalNav minimal />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6 lg:pt-12">
          {data.limited && (
            <div className="mb-6 flex flex-col gap-3 rounded-[18px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dv-text-secondary)]" />
                <p className="text-[14px] leading-[1.45] text-[var(--dv-text-secondary)]">
                  <span className="font-semibold text-[var(--dv-text)]">Số đo và thông tin liên hệ</span> của diễn viên chỉ dành cho đối tác
                  DienVienVN. Bấm &ldquo;Liên hệ&rdquo; trên thẻ diễn viên để đăng ký tài khoản đối tác.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={signupHref} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
                  Đăng ký đối tác
                </Link>
                <Link href={href(`/dang-nhap?next=${encodeURIComponent(next)}`)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
                  Đăng nhập
                </Link>
              </div>
            </div>
          )}

          <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Kho diễn viên DienVienVN</p>
          <h1 className="dv-display dv-headline mt-1">{data.label || 'Diễn viên đã được duyệt.'}</h1>
          <p className="mt-2 text-[17px] text-[var(--dv-text-secondary)]">
            {data.talents.length} hồ sơ đã được DienVienVN duyệt
          </p>

          <div className="sticky top-11 z-20 -mx-4 mt-6 bg-[var(--dv-bg-alt)]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[220px] md:w-auto md:flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dv-text-tertiary)]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tên, kỹ năng, phim đã đóng…" className={`${inputCls} !pl-11`} aria-label="Tìm diễn viên" />
              </div>
              <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className={`${inputCls} !w-[150px]`} aria-label="Giới tính">
                <option value="all">Mọi giới tính</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
              </select>
              <div className="flex items-center gap-1.5">
                <input inputMode="numeric" value={ageMin} onChange={e => setAgeMin(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Tuổi từ" aria-label="Tuổi từ" className={`${inputCls} !w-[84px] !px-3`} />
                <input inputMode="numeric" value={ageMax} onChange={e => setAgeMax(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="đến" aria-label="Tuổi đến" className={`${inputCls} !w-[68px] !px-3`} />
              </div>
              <div className="flex items-center gap-1.5">
                <input inputMode="numeric" value={hMin} onChange={e => setHMin(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Cao từ" aria-label="Chiều cao từ" className={`${inputCls} !w-[84px] !px-3`} />
                <input inputMode="numeric" value={hMax} onChange={e => setHMax(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="đến" aria-label="Chiều cao đến" className={`${inputCls} !w-[68px] !px-3`} />
              </div>
              <div className="flex rounded-full border border-[#d2d2d7] bg-white p-1">
                {(['grid', 'list'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`h-9 flex-1 whitespace-nowrap rounded-full px-4 text-[14px] ${mode === m ? 'bg-[#1d1d1f] text-white' : 'text-[var(--dv-text-secondary)]'}`}
                  >
                    {m === 'grid' ? 'Lưới' : 'Danh sách'}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[13px] text-[var(--dv-text-secondary)]">{filtered.length} diễn viên phù hợp</p>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-[15px] text-[var(--dv-text-secondary)]">Không có diễn viên phù hợp bộ lọc.</p>
          ) : mode === 'grid' ? (
            <ul className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.slice(0, shown).map(t => (
                <ApplicantCard key={t.id} applicant={asApplicant(t)} limited={data.limited} contactHref={data.limited ? signupHref : undefined} />
              ))}
            </ul>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.slice(0, shown).map(t => (
                <ApplicantRow key={t.id} applicant={asApplicant(t)} limited={data.limited} contactHref={data.limited ? signupHref : undefined} />
              ))}
            </ul>
          )}
          {filtered.length > shown && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setShown(s => s + PAGE)} className="dv-btn dv-btn-secondary">
                Xem thêm {Math.min(PAGE, filtered.length - shown)} diễn viên
              </button>
            </div>
          )}
          <p className="mt-10 text-center text-[12px] text-[var(--dv-text-tertiary)]">
            Tài liệu do DienVienVN cung cấp cho đạo diễn và nhà sản xuất. Vui lòng không chia sẻ công khai.
          </p>
        </div>
      </main>
    </>
  );
}
