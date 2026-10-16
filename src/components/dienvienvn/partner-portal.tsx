'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, LogOut, Mail, Phone, Printer, Search, UserRound } from 'lucide-react';
import { actorFetch, signOutActor, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { ageFromDob, ROLE_WILLINGNESS_OPTIONS, TATTOO_OPTIONS } from '@/lib/dienvienvn/casting-form';
import { PARTNER_TYPE_LABELS, PartnerTalent, PartnerType } from '@/lib/dienvienvn/partners';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { experienceGroups, foldVi, skillGroups, trainingList } from '@/lib/dienvienvn/talent-sections';
import { LoginGate } from './actor-pages';
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
    { label: 'Góc nghiêng', url: t.compcard_url }
  ].filter((p): p is { label: string; url: string } => !!p.url);
}

function summaryLine(t: PartnerTalent) {
  const age = t.dob ? ageFromDob(t.dob) : null;
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
  const api = usePartnerApi<{ partner: PartnerInfo; talents: PartnerTalent[] }>('/api/dienvienvn/partner/talents');
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
        age: t.dob ? ageFromDob(t.dob) : null,
        text: foldVi(
          [
            t.full_name,
            t.username,
            t.city ? provinceLabel(t.city) : '',
            ...skillGroups(t).flatMap(g => g.items),
            ...experienceGroups(t.acting_experience).flatMap(g => g.items),
            ...trainingList(t.academic_profile)
          ].join(' ')
        )
      })),
    [talents]
  );
  const cities = useMemo(() => Array.from(new Set(talents.map(t => t.city).filter((c): c is string => !!c))).sort(), [talents]);

  const list = useMemo(() => {
    const words = foldVi(q.trim()).split(/\s+/).filter(Boolean);
    const num = (v: string) => (v.trim() ? Number(v) : null);
    const [a1, a2, h1, h2] = [num(ageMin), num(ageMax), num(hMin), num(hMax)];
    return indexed
      .filter(({ t, age, text }) => {
        if (words.some(w => !text.includes(w))) return false;
        if (gender !== 'all' && t.gender !== gender) return false;
        if (city !== 'all' && t.city !== city) return false;
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
              {t.username ? (
                <Link href={href(`/doi-tac/${t.username}`)} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
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
  const href = useDvvnHref();
  const api = usePartnerApi<{ talent: PartnerTalent }>(`/api/dienvienvn/partner/talents/${encodeURIComponent(username)}`);
  const [i, setI] = useState(0);

  if (!api.data) return <Gate {...api} next={href(`/doi-tac/${username}`)} />;
  const t = api.data.talent;
  const photos = photosOf(t);
  const n = photos.length;
  const current = photos[Math.min(i, Math.max(n - 1, 0))];
  const age = t.dob ? ageFromDob(t.dob) : null;
  const experience = experienceGroups(t.acting_experience);
  const skills = skillGroups(t);
  const trainings = trainingList(t.academic_profile);
  const willingness = Array.from(new Set((t.role_willingness || []).map(w => WILLINGNESS_LABEL[w] || w)));
  const tattoos = (t.tattoos_piercings || []).map(id => TATTOO_OPTIONS.find(o => o.id === id)?.label || id);
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
