'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Loader2, LogOut, Mail, Phone, Plus, Printer, Search, Trash2, UserRound } from 'lucide-react';
import { actorFetch, signOutActor, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { ageFromDob, bodyMarkLabel, ROLE_WILLINGNESS_OPTIONS } from '@/lib/dienvienvn/casting-form';
import { PARTNER_TYPE_LABELS, PartnerProjectSummary, PartnerTalent, PartnerType } from '@/lib/dienvienvn/partners';
import type { ProducerView } from '@/lib/projects/producer';
import { PROJECT_TYPES, ProjectRole, RoleGender, projectTypeLabel } from '@/lib/projects/types';
import { ABROAD, ALL_PROVINCES } from '@/lib/dienvienvn/provinces';
import { CheckOption, Field, SelectInput, TextInput } from './form-fields';
import { ProducerApplicants } from './producer-board';
import { formatVnDate } from './projects-section';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { experienceGroups, foldVi, skillGroups, trainingList } from '@/lib/dienvienvn/talent-sections';
import { LoginGate } from './actor-pages';
import { CREW_JOB_STATUS, CrewJob } from '@/lib/dienvienvn/crew-jobs';
import { CrewFormA, CrewJobFields, crewFormFrom, crewFormPayload } from './crew-job-fields';
import { CrewProfileDetails } from './crew-profile-view';
import type { CrewApplicantView } from '@/lib/dienvienvn/crew-server';
import { useDvvnHref } from './base-path';
import { GlobalNav } from './site-chrome';

type PartnerInfo = { full_name: string; company: string | null; partner_type: PartnerType };

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

const WILLINGNESS_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_WILLINGNESS_OPTIONS.flatMap(o => o.ids.map(id => [id, o.label.replace(/^Sẵn sàng /, '')]))
);

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p;
}

function photosOf(t: PartnerTalent) {
  return [
    { label: 'Chân dung', url: t.headshot_url },
    { label: 'Toàn thân', url: t.fullbody_url },
    { label: 'Góc nghiêng', url: t.compcard_url },
    ...(t.gallery || []).map((g, k) => ({ label: g.caption || `Ảnh ${k + 1}`, url: g.url }))
  ].filter((p): p is { label: string; url: string } => !!p.url);
}

/** Tuổi: máy chủ chỉ gửi số tuổi (không gửi ngày sinh) cho đối tác. */
const ageOfTalent = (t: PartnerTalent) => t.age ?? (t.dob ? ageFromDob(t.dob) : null);

/** Mã hồ sơ đối tác gửi cho DienVienVN khi cần tên đầy đủ / liên hệ của diễn viên. */
const profileCode = (id: string) => `DV-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

function summaryLine(t: PartnerTalent) {
  const age = ageOfTalent(t);
  return [GENDER_LABEL[t.gender] || null, age !== null ? `${age} tuổi` : null, t.height_cm ? `${t.height_cm} cm` : null, t.city ? provinceLabel(t.city) : null]
    .filter(Boolean)
    .join(' · ');
}

/** Gọi API đối tác kèm phiên đăng nhập; xử lý chưa đăng nhập / không phải đối tác. */
function usePartnerApi<T>(url: string) {
  const session = useActorSession();
  const [state, setState] = useState<{ data?: T; error?: string; notPartner?: boolean; demo?: boolean }>({});

  useEffect(() => {
    if (session.status !== 'signed-in') return;
    let cancelled = false;
    (async () => {
      const res = await actorFetch(url);
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.status === 401) return signOutActor();
      if (body.mode === 'demo') return setState({ demo: true });
      if (!res.ok) return setState({ error: body.error || 'Không tải được dữ liệu.', notPartner: !!body.notPartner });
      setState({ data: body as T });
    })().catch(() => !cancelled && setState({ error: 'Mất kết nối mạng. Vui lòng tải lại trang.' }));
    return () => {
      cancelled = true;
    };
  }, [session.status, url]);

  return { session, ...state };
}

function PortalShell({ children, partner }: { children: React.ReactNode; partner?: PartnerInfo }) {
  const href = useDvvnHref();
  const router = useRouter();
  const logout = async () => {
    await signOutActor();
    router.replace(href('/doi-tac'));
  };
  return (
    <>
      <div className="print:hidden">
        <GlobalNav />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-6 md:pt-10 print:bg-white print:p-0">
        <div className="mx-auto max-w-[1120px]">
          {partner && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <p className="text-[14px] text-[var(--dv-text-secondary)]">
                Cổng đối tác · <span className="font-semibold text-[var(--dv-text)]">{partner.full_name}</span>
                {partner.company ? ` · ${partner.company}` : ` · ${PARTNER_TYPE_LABELS[partner.partner_type] || 'Đối tác'}`}
              </p>
              <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 text-[14px] text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]">
                <LogOut className="h-4 w-4" /> Đăng xuất
              </button>
            </div>
          )}
          {children}
          <p className="mt-12 text-center text-[12px] text-[var(--dv-text-tertiary)]">
            Tài liệu bảo mật DienVienVN cung cấp riêng cho đối tác. Vui lòng không chia sẻ thông tin cá nhân của diễn viên ra bên ngoài.
          </p>
        </div>
      </main>
    </>
  );
}

function Gate({ session, error, notPartner, demo, next }: { session: ReturnType<typeof useActorSession>; error?: string; notPartner?: boolean; demo?: boolean; next: string }) {
  const router = useRouter();
  const href = useDvvnHref();
  if (session.status === 'signed-out') {
    return (
      <LoginGate
        partner
        title="Cổng đối tác."
        description="Dành cho đạo diễn, nhà sản xuất và đối tác casting của DienVienVN. Đăng nhập để xem đầy đủ hồ sơ diễn viên đã duyệt."
        next={next}
      />
    );
  }
  if (session.status === 'unavailable' || demo) {
    return (
      <PortalShell>
        <div className="dv-card mx-auto max-w-[460px] p-8 text-center">
          <h1 className="dv-display text-[28px] font-semibold">Chưa mở cổng đối tác.</h1>
          <p className="mt-3 text-[15px] text-[var(--dv-text-secondary)]">Hệ thống tài khoản chưa được kết nối. Vui lòng quay lại sau.</p>
        </div>
      </PortalShell>
    );
  }
  if (error) {
    return (
      <PortalShell>
        <div className="dv-card mx-auto max-w-[460px] p-8 text-center">
          <h1 className="dv-display text-[24px] font-semibold">{notPartner ? 'Chưa có quyền đối tác.' : 'Có lỗi xảy ra.'}</h1>
          <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">{error}</p>
          {notPartner && (
            <button
              type="button"
              className="dv-btn dv-btn-secondary mt-6 w-full"
              onClick={async () => {
                await signOutActor();
                router.replace(href(`/dang-nhap?next=${encodeURIComponent(next)}`));
              }}
            >
              Đăng nhập bằng tài khoản khác
            </button>
          )}
        </div>
      </PortalShell>
    );
  }
  return (
    <PortalShell>
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
      </div>
    </PortalShell>
  );
}

/* ---------------- Danh sách diễn viên cho đối tác ---------------- */
export function PartnerDirectory() {
  const href = useDvvnHref();
  const api = usePartnerApi<{ partner: PartnerInfo; talents: PartnerTalent[]; projects?: PartnerProjectSummary[] }>('/api/dienvienvn/partner/talents');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('all');
  const [city, setCity] = useState('all');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [hMin, setHMin] = useState('');
  const [hMax, setHMax] = useState('');

  const talents = useMemo(() => api.data?.talents || [], [api.data]);
  const indexed = useMemo(
    () =>
      talents.map(t => ({
        t,
        age: ageOfTalent(t),
        text: foldVi(
          [
            t.full_name,
            ...(t.willing_work_cities || []).map(c => provinceLabel(c)),
            ...skillGroups(t).flatMap(g => g.items),
            ...experienceGroups(t.acting_experience).flatMap(g => g.items),
            ...trainingList(t.academic_profile)
          ].join(' ')
        )
      })),
    [talents]
  );
  // Lọc theo nơi diễn viên nhận quay (đối tác không được biết nơi ở)
  const cities = useMemo(() => Array.from(new Set(talents.flatMap(t => t.willing_work_cities || []).filter(Boolean))).sort(), [talents]);

  const list = useMemo(() => {
    const words = foldVi(q.trim()).split(/\s+/).filter(Boolean);
    const num = (v: string) => (v.trim() ? Number(v) : null);
    const [a1, a2, h1, h2] = [num(ageMin), num(ageMax), num(hMin), num(hMax)];
    return indexed
      .filter(({ t, age, text }) => {
        if (words.some(w => !text.includes(w))) return false;
        if (gender !== 'all' && t.gender !== gender) return false;
        if (city !== 'all' && !(t.willing_work_cities || []).includes(city)) return false;
        if (a1 !== null && (age === null || age < a1)) return false;
        if (a2 !== null && (age === null || age > a2)) return false;
        if (h1 !== null && (!t.height_cm || t.height_cm < h1)) return false;
        if (h2 !== null && (!t.height_cm || t.height_cm > h2)) return false;
        return true;
      })
      .map(x => x.t);
  }, [indexed, q, gender, city, ageMin, ageMax, hMin, hMax]);

  if (!api.data) return <Gate {...api} next={href('/doi-tac')} />;

  const filtered = q || gender !== 'all' || city !== 'all' || ageMin || ageMax || hMin || hMax;
  const reset = () => {
    setQ('');
    setGender('all');
    setCity('all');
    setAgeMin('');
    setAgeMax('');
    setHMin('');
    setHMax('');
  };

  return (
    <PortalShell partner={api.data.partner}>
      <section className="mb-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="dv-display text-[28px] font-semibold leading-[1.14]">Dự án của bạn.</h2>
              <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">
                {(api.data.projects || []).length
                  ? 'Ứng viên đã được đội casting duyệt cho từng vai, tự cập nhật.'
                  : 'Đăng casting call để diễn viên trên DienVienVN ứng tuyển vào dự án của bạn.'}
              </p>
            </div>
            <Link href={href('/doi-tac/du-an/moi')} className="dv-btn dv-btn-primary !h-11 !py-0 text-[15px]">
              <Plus className="h-4 w-4" /> Đăng casting mới
            </Link>
          </div>
          {(api.data.projects || []).length > 0 && (
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(api.data.projects || []).map(p => (
              <li key={p.id}>
                <Link
                  href={href(`/doi-tac/du-an/${p.path || p.id}`)}
                  className="group flex h-full flex-col rounded-[18px] bg-white p-5 transition-shadow hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)]"
                >
                  <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">
                    <span>{p.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${
                        p.status === 'draft' ? 'bg-[#fff6e0] text-[#8c5f2a]' : p.status === 'open' ? 'bg-[#e8f5ec] text-[#1e6b3a]' : 'bg-[var(--dv-bg-alt)]'
                      }`}
                    >
                      {p.status === 'draft' ? 'Chờ DienVienVN duyệt' : p.status === 'open' ? 'Đang casting' : 'Đã đóng'}
                    </span>
                  </p>
                  <p className="mt-1 text-[19px] font-semibold leading-[1.25]">{p.title}</p>
                  <p className="mt-1 text-[14px] text-[var(--dv-text-secondary)]">
                    {[p.production_company, projectTypeLabel(p.project_type), p.deadline ? `Hạn nộp ${formatVnDate(p.deadline)}` : null].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-auto pt-4 text-[15px] font-semibold">
                    {p.applicants} ứng viên · {p.roles} vai <ChevronRight className="inline h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          )}
      </section>

      <PartnerCrewJobsSection />

      <h1 className="dv-display dv-headline">Kho diễn viên DienVienVN.</h1>
      <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">{talents.length} hồ sơ đã duyệt · thông tin đầy đủ dành riêng cho đối tác.</p>

      <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dv-text-tertiary)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tên, kỹ năng, phim đã đóng…" className="dv-input !pl-11" aria-label="Tìm diễn viên" />
        </div>
        <select value={gender} onChange={e => setGender(e.target.value)} className="dv-input" aria-label="Giới tính">
          <option value="all">Mọi giới tính</option>
          <option value="female">Nữ</option>
          <option value="male">Nam</option>
          <option value="other">Khác</option>
        </select>
        <select value={city} onChange={e => setCity(e.target.value)} className="dv-input" aria-label="Tỉnh/thành">
          <option value="all">Mọi tỉnh/thành</option>
          {cities.map(c => (
            <option key={c} value={c}>
              {provinceLabel(c)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:max-w-[640px]">
        <RangeInput label="Tuổi" min={ageMin} max={ageMax} onMin={setAgeMin} onMax={setAgeMax} />
        <RangeInput label="Chiều cao (cm)" min={hMin} max={hMax} onMin={setHMin} onMax={setHMax} />
      </div>

      <div className="mt-4 flex items-center gap-3 text-[14px] text-[var(--dv-text-secondary)]">
        <span>{list.length} diễn viên</span>
        {filtered && (
          <button type="button" onClick={reset} className="underline underline-offset-2 hover:text-[var(--dv-text)]">
            Xoá bộ lọc
          </button>
        )}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map(t => {
          const photo = photosOf(t)[0];
          const inner = (
            <>
              <div className="aspect-[3/4] overflow-hidden bg-[#e8e8ed]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt={t.full_name} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#aeaeb2]">
                    <UserRound className="h-10 w-10" strokeWidth={1.3} />
                  </div>
                )}
              </div>
              <div className="px-4 py-3.5">
                <p className="truncate text-[16px] font-semibold leading-[1.25]">{t.full_name}</p>
                <p className="mt-0.5 truncate text-[13px] text-[var(--dv-text-secondary)]">{summaryLine(t) || '—'}</p>
              </div>
            </>
          );
          const cls = 'group block overflow-hidden rounded-[18px] bg-white transition-shadow hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)]';
          return (
            <li key={t.id}>
              <Link href={href(`/doi-tac/${t.id}`)} className={cls}>
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="mt-6 text-[15px] text-[var(--dv-text-secondary)]">Không có diễn viên phù hợp bộ lọc.</p>}
    </PortalShell>
  );
}

function RangeInput({ label, min, max, onMin, onMax }: { label: string; min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  const cls = 'dv-input !h-11 min-w-0 flex-1 text-center';
  const clean = (v: string) => v.replace(/\D/g, '').slice(0, 3);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[112px] shrink-0 text-[14px] text-[var(--dv-text-secondary)]">{label}</span>
      <input inputMode="numeric" value={min} onChange={e => onMin(clean(e.target.value))} placeholder="từ" aria-label={`${label} từ`} className={cls} />
      <span className="text-[var(--dv-text-tertiary)]">–</span>
      <input inputMode="numeric" value={max} onChange={e => onMax(clean(e.target.value))} placeholder="đến" aria-label={`${label} đến`} className={cls} />
    </div>
  );
}

/* ---------------- Hồ sơ đầy đủ cho đối tác ---------------- */
export function PartnerTalentProfile({ username }: { username: string }) {
  // "username" ở đây là mã hồ sơ (UUID); link cũ theo username vẫn mở được
  const href = useDvvnHref();
  const api = usePartnerApi<{ talent: PartnerTalent }>(`/api/dienvienvn/partner/talents/${encodeURIComponent(username)}`);
  const [i, setI] = useState(0);

  if (!api.data) return <Gate {...api} next={href(`/doi-tac/${username}`)} />;
  const t = api.data.talent;
  const photos = photosOf(t);
  const n = photos.length;
  const current = photos[Math.min(i, Math.max(n - 1, 0))];
  const age = ageOfTalent(t);
  const experience = experienceGroups(t.acting_experience);
  const skills = skillGroups(t);
  const trainings = trainingList(t.academic_profile);
  const willingness = Array.from(new Set((t.role_willingness || []).map(w => WILLINGNESS_LABEL[w] || w)));
  const tattoos = (t.tattoos_piercings || []).map(bodyMarkLabel);
  const measurements = [t.chest_cm, t.waist_cm, t.hip_cm].some(Boolean) ? `${t.chest_cm || '—'} - ${t.waist_cm || '—'} - ${t.hip_cm || '—'}` : null;
  const socials = [
    { label: 'Showreel', url: t.social_links?.showreel_url },
    { label: 'Facebook', url: t.social_links?.facebook },
    { label: 'Instagram', url: t.social_links?.instagram },
    { label: 'TikTok', url: t.social_links?.tiktok }
  ].filter((s): s is { label: string; url: string } => !!s.url && /^https?:\/\//i.test(s.url));

  const facts: [string, string | null][] = [
    ['Giới tính', GENDER_LABEL[t.gender] || null],
    ['Tuổi', age !== null ? `${age} tuổi${t.dob ? ` (${t.dob.slice(0, 4)})` : ''}` : null],
    ['Chiều cao', t.height_cm ? `${t.height_cm} cm` : null],
    ['Cân nặng', t.weight_kg ? `${t.weight_kg} kg` : null],
    ['Số đo 3 vòng', measurements],
    ['Size giày', t.shoe_size || null],
    ['Nơi ở', t.city ? provinceLabel(t.city) : null],
    ['Nhận quay tại', (t.willing_work_cities || []).length ? t.willing_work_cities.map(provinceLabel).join(', ') : null],
    ['Hình xăm', tattoos.length ? tattoos.join(', ') : null]
  ];

  return (
    <PortalShell>
      <div className="flex items-center justify-between print:hidden">
        <Link href={href('/doi-tac')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Kho diễn viên
        </Link>
        <button type="button" onClick={() => window.print()} className="dv-btn dv-btn-ghost !py-2 text-[14px]">
          <Printer className="h-4 w-4" /> In / Lưu PDF
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)] md:gap-10 print:grid-cols-[260px_1fr] print:gap-6">
        <div className="space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-[#e8e8ed]">
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={`${t.full_name} — ${current.label}`} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center text-[#aeaeb2]">
                <UserRound className="h-14 w-14" strokeWidth={1.2} />
              </div>
            )}
            {n > 1 && (
              <>
                <button type="button" aria-label="Ảnh trước" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white print:hidden">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white print:hidden">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="flex gap-2 print:hidden">
              {photos.map((p, k) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setI(k)}
                  aria-label={p.label}
                  className={`h-20 w-[60px] overflow-hidden rounded-[10px] border-2 ${k === i ? 'border-[var(--dv-accent)]' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="dv-display text-[36px] font-semibold leading-[1.1] md:text-[48px]">{t.full_name}</h1>
          <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">{summaryLine(t)}</p>

          {!t.phone && !t.email && (
          <section className="dv-card mt-6 p-6 print:hidden">
            <h2 className="text-[19px] font-semibold">Muốn liên hệ diễn viên này?</h2>
            <p className="mt-2 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
              Hồ sơ chưa có thông tin liên hệ. Vui lòng gửi mã hồ sơ{' '}
              <span className="font-semibold text-[var(--dv-text)]">{profileCode(t.id)}</span> cho đội ngũ DienVienVN để được kết nối.
            </p>
          </section>
          )}

          {(t.phone || t.email || socials.length > 0) && (
            <section className="dv-card mt-6 p-6">
              <h2 className="text-[19px] font-semibold">Liên hệ</h2>
              <div className="mt-3 space-y-2 text-[15px]">
                {t.phone && (
                  <a href={`tel:${t.phone}`} className="flex items-center gap-2 font-semibold">
                    <Phone className="h-4 w-4 shrink-0" /> {formatPhone(t.phone)}
                  </a>
                )}
                {t.email && (
                  <a href={`mailto:${t.email}`} className="flex items-center gap-2 break-all text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]">
                    <Mail className="h-4 w-4 shrink-0" /> {t.email}
                  </a>
                )}
                {socials.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {socials.map(s => (
                      <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="dv-link">
                        <ExternalLink className="h-3.5 w-3.5" /> {s.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="dv-card mt-4 p-6">
            <h2 className="text-[19px] font-semibold">Thông tin & số đo</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{k}</dt>
                    <dd className="mt-0.5 text-[15px]">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {experience.length > 0 && (
            <section className="dv-card mt-4 p-6">
              <h2 className="text-[19px] font-semibold">Kinh nghiệm diễn xuất</h2>
              <div className="mt-4 space-y-4">
                {experience.map(g => (
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

          {(skills.length > 0 || willingness.length > 0) && (
            <section className="dv-card mt-4 p-6">
              <h2 className="text-[19px] font-semibold">Kỹ năng & sẵn sàng</h2>
              <div className="mt-4 space-y-3">
                {[...skills, ...(willingness.length ? [{ group: 'Sẵn sàng cho vai diễn', items: willingness }] : [])].map(g => (
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

          {trainings.length > 0 && (
            <section className="dv-card mt-4 p-6">
              <h2 className="text-[19px] font-semibold">Đào tạo diễn xuất</h2>
              <ul className="mt-3 space-y-1 text-[15px] leading-[1.47]">
                {trainings.map(x => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

/* ---------------- Ứng viên của 1 dự án được gắn cho đối tác ---------------- */
type BoardData = ProducerView & {
  id: string;
  status: 'draft' | 'open' | 'closed';
  own: boolean;
  editable: boolean;
  form: ProjectForm | null;
};

export function PartnerProjectBoard({ projectId }: { projectId: string }) {
  const href = useDvvnHref();
  const api = usePartnerApi<BoardData>(`/api/dienvienvn/partner/projects/${encodeURIComponent(projectId)}`);
  if (!api.data) return <Gate {...api} next={href(`/doi-tac/du-an/${projectId}`)} />;
  const d = api.data;
  return (
    <PortalShell>
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href={href('/doi-tac')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Cổng đối tác
        </Link>
        {d.editable && (
          <Link href={href(`/doi-tac/du-an/${d.id}/sua`)} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
            Sửa casting
          </Link>
        )}
      </div>
      {d.own && d.status === 'draft' && (
        <div className="mb-6 rounded-[16px] border border-[#f1e2bf] bg-[#fff8e8] px-5 py-4 text-[15px] leading-[1.47] print:hidden">
          <p className="font-semibold">Đang chờ DienVienVN duyệt.</p>
          <p className="mt-0.5 text-[var(--dv-text-secondary)]">
            Casting call chưa hiện với diễn viên. Đội ngũ DienVienVN sẽ kiểm tra và mở nhận hồ sơ. Trong lúc chờ, bạn vẫn sửa được thông tin.
          </p>
        </div>
      )}
      {d.own && d.status === 'open' && (
        <div className="mb-6 rounded-[16px] border border-[#cfe9d6] bg-[#f0faf3] px-5 py-4 text-[15px] leading-[1.47] print:hidden">
          <p className="font-semibold">Đang nhận hồ sơ trên DienVienVN.</p>
          <p className="mt-0.5 text-[var(--dv-text-secondary)]">
            Diễn viên ứng tuyển và được đội casting duyệt sẽ tự hiện bên dưới. Cần chỉnh sửa dự án, vui lòng liên hệ DienVienVN.
          </p>
        </div>
      )}
      <ProducerApplicants view={d} profileHref={id => href(`/doi-tac/${id}`)} />
    </PortalShell>
  );
}

/* ---------------- Đối tác đăng / sửa casting call ---------------- */
type ProjectForm = {
  title: string;
  hide_title: boolean;
  production_company: string;
  project_type: string;
  description: string;
  location: string;
  shooting_time: string;
  compensation: string;
  deadline: string;
  roles: ProjectRole[];
  selftape_required: boolean;
  selftape_brief: string;
};

const newRoleId = () => Math.random().toString(36).slice(2, 10);
const blankRole = (name = ''): ProjectRole => ({ id: newRoleId(), name, gender: 'any', age_min: null, age_max: null, quantity: 1, description: '' });
const blankForm = (): ProjectForm => ({
  title: '',
  hide_title: false,
  production_company: '',
  project_type: 'feature_film',
  description: '',
  location: '',
  shooting_time: '',
  compensation: '',
  deadline: '',
  roles: [blankRole()],
  selftape_required: false,
  selftape_brief: ''
});

export function PartnerProjectForm({ projectId }: { projectId?: string }) {
  const href = useDvvnHref();
  const router = useRouter();
  const editing = !!projectId;
  // Đăng mới: kiểm tra quyền đối tác qua API danh sách; sửa: tải dự án
  const api = usePartnerApi<{ partner?: PartnerInfo; form?: ProjectForm | null; editable?: boolean; id?: string }>(
    editing ? `/api/dienvienvn/partner/projects/${encodeURIComponent(projectId as string)}` : '/api/dienvienvn/partner/talents'
  );
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!api.data || form) return;
    if (editing) {
      if (api.data.form) setForm({ ...blankForm(), ...api.data.form, roles: api.data.form.roles?.length ? api.data.form.roles : [blankRole()] });
    } else setForm({ ...blankForm(), production_company: api.data.partner?.company || '' });
  }, [api.data, editing, form]);

  const next = editing ? href(`/doi-tac/du-an/${projectId}/sua`) : href('/doi-tac/du-an/moi');
  if (!api.data) return <Gate {...api} next={next} />;
  if (editing && (!api.data.form || !api.data.editable)) {
    return (
      <PortalShell>
        <div className="dv-card mx-auto max-w-[520px] p-8 text-center">
          <h1 className="dv-display text-[24px] font-semibold">Không sửa được dự án này.</h1>
          <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
            Chỉ sửa được casting call do bạn đăng khi còn chờ duyệt. Dự án đã mở nhận hồ sơ, vui lòng liên hệ DienVienVN để chỉnh sửa.
          </p>
          <Link href={href(`/doi-tac/du-an/${projectId}`)} className="dv-btn dv-btn-secondary mt-6">
            Về dự án
          </Link>
        </div>
      </PortalShell>
    );
  }
  if (!form) return <Gate {...api} next={next} />;

  const set = (patch: Partial<ProjectForm>) => setForm(f => (f ? { ...f, ...patch } : f));
  const setRole = (id: string, patch: Partial<ProjectRole>) => set({ roles: form.roles.map(r => (r.id === id ? { ...r, ...patch } : r)) });
  const num = (v: string) => (v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '').slice(0, 3)) : null);

  const submit = async () => {
    setError('');
    if (form.title.trim().length < 2) return setError('Vui lòng nhập tên dự án.');
    const roles = form.roles.filter(r => r.name.trim() || (r.description || '').trim());
    if (!roles.length || roles.some(r => !r.name.trim())) return setError('Mỗi vai cần có tên vai.');
    if (roles.some(r => r.age_min && r.age_max && r.age_min > r.age_max)) return setError('Độ tuổi "từ" phải nhỏ hơn "đến".');
    setBusy(true);
    try {
      const res = await actorFetch(editing ? `/api/dienvienvn/partner/projects/${projectId}` : '/api/dienvienvn/partner/projects', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, roles, deadline: form.deadline || null })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.id) return setError(body.error || 'Không lưu được. Vui lòng thử lại.');
      router.push(href(`/doi-tac/du-an/${body.id}`));
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const addBulk = () => {
    const names = (bulk || '').split('\n').map(x => x.replace(/^[\s\-•*\d.)]+/, '').trim()).filter(Boolean).slice(0, 50);
    if (names.length) set({ roles: [...form.roles.filter(r => r.name.trim() || (r.description || '').trim()), ...names.map(n => blankRole(n))] });
    setBulk(null);
  };

  return (
    <PortalShell>
      <div className="mx-auto max-w-[780px]">
        <Link href={href(editing ? `/doi-tac/du-an/${projectId}` : '/doi-tac')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> {editing ? 'Về dự án' : 'Cổng đối tác'}
        </Link>
        <h1 className="dv-display dv-headline mt-4">{editing ? 'Sửa casting call.' : 'Đăng casting call.'}</h1>
        <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">
          Casting call sẽ hiện cho diễn viên trên DienVienVN sau khi đội ngũ DienVienVN duyệt.
        </p>

        <section className="dv-card mt-8 space-y-5 p-6 md:p-8">
          <h2 className="text-[21px] font-semibold">Thông tin dự án</h2>
          <Field label="Tên dự án / tên phim" required htmlFor="pp-title">
            <TextInput id="pp-title" value={form.title} onChange={e => set({ title: e.target.value })} placeholder="VD: Một Phim Linh Đình" />
          </Field>
          <CheckOption checked={form.hide_title} onChange={() => set({ hide_title: !form.hide_title })}>
            Ẩn tên dự án với diễn viên (diễn viên chỉ thấy &ldquo;Dự án DV-xx&rdquo;)
          </CheckOption>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Công ty sản xuất" htmlFor="pp-company">
              <TextInput id="pp-company" value={form.production_company} onChange={e => set({ production_company: e.target.value })} />
            </Field>
            <Field label="Loại dự án" htmlFor="pp-type">
              <SelectInput id="pp-type" value={form.project_type} onChange={e => set({ project_type: e.target.value })}>
                {PROJECT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Địa điểm quay" htmlFor="pp-location">
              <SelectInput id="pp-location" value={form.location} onChange={e => set({ location: e.target.value })}>
                <option value="">Chưa xác định</option>
                {ALL_PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value={ABROAD}>Nước ngoài</option>
              </SelectInput>
            </Field>
            <Field label="Thời gian quay" htmlFor="pp-time">
              <TextInput id="pp-time" value={form.shooting_time} onChange={e => set({ shooting_time: e.target.value })} placeholder="VD: Tháng 12/2026" />
            </Field>
            <Field label="Thù lao" htmlFor="pp-pay">
              <TextInput id="pp-pay" value={form.compensation} onChange={e => set({ compensation: e.target.value })} placeholder="VD: Thoả thuận" />
            </Field>
            <Field label="Hạn nộp hồ sơ" htmlFor="pp-deadline">
              <TextInput id="pp-deadline" type="date" value={form.deadline} onChange={e => set({ deadline: e.target.value })} />
            </Field>
          </div>
          <Field label="Giới thiệu dự án" htmlFor="pp-desc" hint="Nội dung phim, yêu cầu chung… (diễn viên sẽ đọc phần này)">
            <textarea id="pp-desc" rows={4} className="dv-input" value={form.description} onChange={e => set({ description: e.target.value })} />
          </Field>
        </section>

        <section className="dv-card mt-4 space-y-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[21px] font-semibold">Vai cần tuyển ({form.roles.length})</h2>
            <button type="button" onClick={() => setBulk(bulk === null ? '' : null)} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
              Thêm nhanh nhiều vai
            </button>
          </div>
          {bulk !== null && (
            <div className="space-y-2 rounded-[14px] bg-[var(--dv-bg-alt)] p-4">
              <Field label="Mỗi dòng một tên vai" htmlFor="pp-bulk">
                <textarea id="pp-bulk" rows={5} autoFocus className="dv-input" value={bulk} onChange={e => setBulk(e.target.value)} placeholder={'Chàng trai 1\nCô gái số 1\nNgười mẹ…'} />
              </Field>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setBulk(null)} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
                  Huỷ
                </button>
                <button type="button" onClick={addBulk} disabled={!bulk.trim()} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
                  Thêm vai
                </button>
              </div>
            </div>
          )}
          <ol className="space-y-3">
            {form.roles.map((r, i) => (
              <li key={r.id} className="rounded-[16px] border border-[#e8e8ed] p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--dv-text-tertiary)]">VAI {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Nhân bản vai"
                      aria-label="Nhân bản vai"
                      onClick={() => {
                        const copy = { ...r, id: newRoleId(), name: r.name ? `${r.name} (bản sao)` : '' };
                        const roles = [...form.roles];
                        roles.splice(i + 1, 0, copy);
                        set({ roles });
                      }}
                      className="rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Xoá vai"
                      aria-label="Xoá vai"
                      disabled={form.roles.length === 1}
                      onClick={() => (!r.name.trim() || window.confirm(`Xoá vai "${r.name}"?`)) && set({ roles: form.roles.filter(x => x.id !== r.id) })}
                      className="rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[#fff0f0] hover:text-[#b00020] disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_80px_80px_90px]">
                  <Field label="Tên vai" required htmlFor={`pp-r-${r.id}`} className="col-span-2 sm:col-span-1">
                    <TextInput id={`pp-r-${r.id}`} value={r.name} onChange={e => setRole(r.id, { name: e.target.value })} placeholder="VD: Nữ chính – Linh" />
                  </Field>
                  <Field label="Giới tính" htmlFor={`pp-g-${r.id}`}>
                    <SelectInput id={`pp-g-${r.id}`} value={r.gender} onChange={e => setRole(r.id, { gender: e.target.value as RoleGender })}>
                      <option value="any">Nam / Nữ</option>
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </SelectInput>
                  </Field>
                  <Field label="Tuổi từ" htmlFor={`pp-a1-${r.id}`}>
                    <TextInput id={`pp-a1-${r.id}`} inputMode="numeric" value={r.age_min ?? ''} onChange={e => setRole(r.id, { age_min: num(e.target.value) })} />
                  </Field>
                  <Field label="Đến" htmlFor={`pp-a2-${r.id}`}>
                    <TextInput id={`pp-a2-${r.id}`} inputMode="numeric" value={r.age_max ?? ''} onChange={e => setRole(r.id, { age_max: num(e.target.value) })} />
                  </Field>
                  <Field label="Số lượng" htmlFor={`pp-q-${r.id}`}>
                    <TextInput id={`pp-q-${r.id}`} inputMode="numeric" value={r.quantity ?? ''} onChange={e => setRole(r.id, { quantity: num(e.target.value) })} />
                  </Field>
                </div>
                <Field label="Mô tả vai" htmlFor={`pp-d-${r.id}`} className="mt-3">
                  <textarea
                    id={`pp-d-${r.id}`}
                    rows={3}
                    className="dv-input"
                    value={r.description || ''}
                    onChange={e => setRole(r.id, { description: e.target.value })}
                    placeholder="Tính cách, ngoại hình, kỹ năng cần có…"
                  />
                </Field>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => set({ roles: [...form.roles, blankRole()] })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#d2d2d7] text-[15px] font-semibold text-[var(--dv-text-secondary)] hover:border-[var(--dv-accent)] hover:text-[var(--dv-text)]"
          >
            <Plus className="h-4 w-4" /> Thêm vai
          </button>
        </section>

        <section className="dv-card mt-4 space-y-4 p-6 md:p-8">
          <h2 className="text-[21px] font-semibold">Self-tape</h2>
          <CheckOption checked={form.selftape_required} onChange={() => set({ selftape_required: !form.selftape_required })}>
            Bắt buộc diễn viên gửi video self-tape khi ứng tuyển
          </CheckOption>
          <Field label="Hướng dẫn quay self-tape" htmlFor="pp-tape" hint="Không bắt buộc">
            <textarea
              id="pp-tape"
              rows={3}
              className="dv-input"
              value={form.selftape_brief}
              onChange={e => set({ selftape_brief: e.target.value })}
              placeholder="VD: Quay ngang, giới thiệu bản thân 30 giây, đọc đoạn thoại đính kèm…"
            />
          </Field>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-[12px] bg-[#fff0f0] p-3 text-[14px] text-[#b00020]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href={href(editing ? `/doi-tac/du-an/${projectId}` : '/doi-tac')} className="dv-btn dv-btn-secondary">
            Huỷ
          </Link>
          <button type="button" onClick={submit} disabled={busy} className="dv-btn dv-btn-primary">
            {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
            {editing ? 'Lưu thay đổi' : 'Gửi DienVienVN duyệt'}
          </button>
        </div>
      </div>
    </PortalShell>
  );
}

/* ---------------- Tin tuyển ekip của đối tác ---------------- */
function PartnerCrewJobsSection() {
  const href = useDvvnHref();
  const api = usePartnerApi<{ jobs: (CrewJob & { applicant_count?: number })[] }>('/api/dienvienvn/partner/crew-jobs');
  const jobs = api.data?.jobs || [];
  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="dv-display text-[28px] font-semibold leading-[1.14]">Tin tuyển ekip.</h2>
          <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">
            Tuyển ekip audition, trường quay, hậu kỳ — hiện tại dienvienvn.com/tuyen-dung sau khi DienVienVN duyệt.
          </p>
        </div>
        <Link href={href('/doi-tac/tuyen-dung/moi')} className="dv-btn dv-btn-secondary !h-11 !py-0 text-[15px]">
          <Plus className="h-4 w-4" /> Đăng tin tuyển ekip
        </Link>
      </div>
      {jobs.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map(j => (
            <li key={j.id} className="flex h-full flex-col rounded-[18px] bg-white p-5">
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                  j.status === 'draft' ? 'bg-[#fff6e0] text-[#8c5f2a]' : j.status === 'open' ? 'bg-[#e8f5ec] text-[#1e6b3a]' : 'bg-[var(--dv-bg-alt)]'
                }`}
              >
                {j.status === 'draft' ? 'Chờ DienVienVN duyệt' : CREW_JOB_STATUS[j.status].label}
              </span>
              <p className="mt-2 text-[17px] font-semibold leading-[1.3]">{j.title}</p>
              <p className="mt-1 text-[14px] text-[var(--dv-text-secondary)]">{j.positions.join(' · ')}</p>
              {j.status === 'draft' ? (
                <Link href={href(`/doi-tac/tuyen-dung/${j.id}/sua`)} className="dv-link mt-auto pt-4 text-[14px]">
                  Sửa tin <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link href={href(`/doi-tac/tuyen-dung/${j.id}/ung-vien`)} className="dv-link mt-auto pt-4 text-[14px]">
                  Xem ứng viên ({j.applicant_count || 0}) <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ứng viên ekip của một tin tuyển (chỉ hồ sơ đã được DienVienVN duyệt). */
export function PartnerCrewApplicants({ jobId }: { jobId: string }) {
  const href = useDvvnHref();
  const api = usePartnerApi<{ job: { id: string; title: string; company: string | null } | null; applicants: CrewApplicantView[] }>(
    `/api/dienvienvn/partner/crew-jobs/${encodeURIComponent(jobId)}/applicants`
  );
  if (!api.data) return <Gate {...api} next={href(`/doi-tac/tuyen-dung/${jobId}/ung-vien`)} />;
  const { job, applicants } = api.data;
  return (
    <PortalShell>
      <div className="mx-auto max-w-[880px]">
        <Link href={href('/doi-tac')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Cổng đối tác
        </Link>
        <h1 className="dv-display dv-headline mt-4">Ứng viên.</h1>
        {job && <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">{job.title}</p>}
        {applicants.length === 0 ? (
          <div className="dv-card mt-8 p-10 text-center">
            <p className="text-[19px] font-semibold">Chưa có ứng viên.</p>
            <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Hồ sơ ứng viên hiện tại đây sau khi DienVienVN duyệt. Bạn sẽ nhận email khi có ứng viên mới.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {applicants.map(a => (
              <li key={a.id} className="dv-card p-6">
                <CrewProfileDetails p={a} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}

/** Đối tác đăng / sửa tin tuyển ekip (sửa được khi còn chờ duyệt). */
export function PartnerCrewJobForm({ jobId }: { jobId?: string }) {
  const href = useDvvnHref();
  const router = useRouter();
  const editing = !!jobId;
  const api = usePartnerApi<{ job?: CrewJob; editable?: boolean; jobs?: CrewJob[]; company?: string }>(
    editing ? `/api/dienvienvn/partner/crew-jobs/${encodeURIComponent(jobId as string)}` : '/api/dienvienvn/partner/crew-jobs'
  );
  const [form, setForm] = useState<CrewFormA | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!api.data || form) return;
    setForm(crewFormFrom(api.data.job, api.data.company || ''));
  }, [api.data, form]);

  const next = editing ? href(`/doi-tac/tuyen-dung/${jobId}/sua`) : href('/doi-tac/tuyen-dung/moi');
  if (!api.data) return <Gate {...api} next={next} />;
  if (editing && !api.data.editable) {
    return (
      <PortalShell>
        <div className="dv-card mx-auto max-w-[520px] p-8 text-center">
          <h1 className="dv-display text-[24px] font-semibold">Không sửa được tin này.</h1>
          <p className="mt-3 text-[15px] text-[var(--dv-text-secondary)]">Tin đã được duyệt. Vui lòng liên hệ DienVienVN để chỉnh sửa.</p>
          <Link href={href('/doi-tac')} className="dv-btn dv-btn-secondary mt-6">
            Về cổng đối tác
          </Link>
        </div>
      </PortalShell>
    );
  }
  if (!form) return <Gate {...api} next={next} />;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await actorFetch(editing ? `/api/dienvienvn/partner/crew-jobs/${jobId}` : '/api/dienvienvn/partner/crew-jobs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crewFormPayload(form, editing))
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.id) return setError(body.error || 'Không lưu được. Vui lòng thử lại.');
      router.push(href('/doi-tac?tin=da-gui'));
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalShell>
      <div className="mx-auto max-w-[780px]">
        <Link href={href('/doi-tac')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Cổng đối tác
        </Link>
        <h1 className="dv-display dv-headline mt-4">{editing ? 'Sửa tin tuyển ekip.' : 'Đăng tin tuyển ekip.'}</h1>
        <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">Tin hiện tại dienvienvn.com/tuyen-dung sau khi đội ngũ DienVienVN duyệt.</p>

        <div className="mt-8">
          <CrewJobFields value={form} onChange={setForm} multi={!editing} />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-[12px] bg-[#fff0f0] p-3 text-[14px] text-[#b00020]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href={href('/doi-tac')} className="dv-btn dv-btn-secondary">
            Huỷ
          </Link>
          <button type="button" onClick={submit} disabled={busy} className="dv-btn dv-btn-primary">
            {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
            {editing ? 'Lưu thay đổi' : 'Gửi DienVienVN duyệt'}
          </button>
        </div>
      </div>
    </PortalShell>
  );
}
