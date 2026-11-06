'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Lock, Mail, Phone, Printer, Video } from 'lucide-react';
import { ProducerApplicant, ProducerView } from '@/lib/projects/producer';
import { fetchProducerView } from '@/lib/projects/public-client';
import { projectTypeLabel, roleSummary } from '@/lib/projects/types';
import { ageFromDob } from '@/lib/dienvienvn/casting-form';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { formatVnDate } from './projects-section';
import { GlobalNav } from './site-chrome';
import { useDvvnHref } from './base-path';

const WILLINGNESS: Record<string, string> = {
  kissing_scene: 'Cảnh hôn',
  intimate_scene: 'Cảnh nóng 18+',
  swimsuit: 'Đồ bơi / Bikini',
  lingerie: 'Nội y',
  partial_nudity: 'Bán khỏa thân',
  hair_color: 'Đổi màu tóc',
  cut_hair: 'Cắt tóc ngắn',
  learn_new_skills: 'Học kỹ năng mới'
};

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p;
}

export function ProducerBoard({ token }: { token: string }) {
  const href = useDvvnHref();
  const [view, setView] = useState<ProducerView | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducerView(token)
      .then(setView)
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
        setView(null);
      });
  }, [token]);

  if (view === undefined) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[60vh] items-center justify-center bg-[var(--dv-bg-alt)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
        </main>
      </>
    );
  }

  if (!view) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
          <h1 className="dv-display dv-headline">Link không khả dụng.</h1>
          <p className="dv-subhead mt-3 text-[var(--dv-text-secondary)]">{error || 'Link đã bị thu hồi hoặc không đúng. Vui lòng liên hệ DienVienVN.'}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <GlobalNav />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20 print:bg-white print:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6 lg:pt-12">
          {view.limited && (
            <div className="mb-6 flex flex-col gap-3 rounded-[18px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5 print:hidden">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dv-text-secondary)]" />
                <p className="text-[14px] leading-[1.45] text-[var(--dv-text-secondary)]">
                  <span className="font-semibold text-[var(--dv-text)]">Đang xem thông tin công khai.</span> Tuổi, số đo, nơi ở và liên hệ của diễn viên chỉ hiện
                  khi bạn đăng nhập tài khoản đối tác DienVienVN.
                </p>
              </div>
              <Link href={href(`/dang-nhap?next=${encodeURIComponent(href(`/nsx/${token}`))}`)} className="dv-btn dv-btn-primary !h-10 shrink-0 !py-0 text-[14px]">
                Đăng nhập đối tác
              </Link>
            </div>
          )}
          <ProducerApplicants view={view} />
          <p className="mt-10 text-center text-[12px] text-[var(--dv-text-tertiary)]">
            Tài liệu nội bộ do DienVienVN cung cấp cho nhà sản xuất. Vui lòng không chia sẻ công khai.
          </p>
        </div>
      </main>
    </>
  );
}

/** Thông tin dự án + bộ lọc vai/giới tính + danh sách ứng viên (dùng cho link NSX và cổng đối tác). */
type ViewMode = 'grid' | 'list';

/** Dữ liệu đã gom sẵn của 1 ứng viên, dùng chung cho dạng lưới và dạng danh sách. */
function derive(applicant: ProducerApplicant) {
  const { talent: t, application } = applicant;
  const photos = [
    { key: 'headshot', label: 'Chân dung', url: t.headshot_url },
    { key: 'fullbody', label: 'Toàn thân', url: t.fullbody_url },
    { key: 'compcard', label: 'Nghiêng', url: t.compcard_url }
  ].filter(p => p.url) as { key: string; label: string; url: string }[];
  const age = t.dob ? ageFromDob(t.dob) : null;
  const measurements = [t.chest_cm, t.waist_cm, t.hip_cm].some(Boolean) ? `${t.chest_cm || '–'}-${t.waist_cm || '–'}-${t.hip_cm || '–'}` : null;
  const skills = Array.from(
    new Set(
      [
        ...(t.vietnamese_accents || []).map(a => `Giọng ${a.accent}`),
        ...(t.languages || []).filter(l => l.language !== 'Tiếng Việt').map(l => l.language),
        ...(t.martial_arts || []).map(m => m.style || m.name || ''),
        ...(t.dancing || []).map(d => d.style || d.name || ''),
        ...(t.instruments || []).map(i => i.name || i.style || ''),
        ...(t.sports || []).map(s => s.name || s.style || '')
      ].filter(Boolean)
    )
  );
  const exp = t.acting_experience;
  const credits = [
    ...(exp?.feature_films || []).map(f => `Phim · ${f.title}`),
    ...(exp?.short_films || []).map(f => `Phim ngắn · ${f.title}`),
    ...(exp?.web_dramas || []).map(f => `Web drama · ${f.title}`),
    ...(exp?.tv_shows || []).map(f => `Truyền hình · ${f.title}`),
    ...(exp?.commercials || []).map(c => `TVC · ${c.brand}`),
    ...(exp?.music_videos || []).map(m => `MV · ${m.song}`)
  ].filter(x => !/·\s*$/.test(x));
  const training = [
    t.academic_profile?.enrollments?.length ? `ACT Academy${t.academic_profile.highest_class_code ? ` (${t.academic_profile.highest_class_code})` : ''}` : null,
    ...(t.academic_profile?.external_trainings || []).map(e => e.school_name)
  ].filter(Boolean) as string[];
  const willingness = Array.from(new Set((t.role_willingness || []).map(w => WILLINGNESS[w] || w)));
  const workCities = Array.from(new Set((t.willing_work_cities || []).map(c => provinceLabel(c) || c))).filter(Boolean);
  const socials = [
    { label: 'Showreel', url: t.social_links?.showreel_url },
    { label: 'Facebook', url: t.social_links?.facebook },
    { label: 'Instagram', url: t.social_links?.instagram },
    { label: 'TikTok', url: t.social_links?.tiktok }
  ].filter((x): x is { label: string; url: string } => !!x.url);
  const gender = t.gender === 'female' ? 'Nữ' : t.gender === 'male' ? 'Nam' : 'Khác';
  return { t, application, photos, age, measurements, skills, credits, training, willingness, workCities, socials, gender, note: application.note?.trim() || '' };
}

export function ProducerApplicants({ view, profileHref }: { view: ProducerView; profileHref?: (talentId: string) => string | null }) {
  const [role, setRole] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [mode, setMode] = useState<ViewMode>('grid');
  const { project, applicants } = view;
  const list = useMemo(
    () => applicants.filter(a => (role === 'all' || a.application.role_id === role) && (gender === 'all' || a.talent.gender === gender)),
    [applicants, role, gender]
  );
  const countFor = (roleId: string) => applicants.filter(a => a.application.role_id === roleId).length;

  // Nhóm theo vai, đúng thứ tự vai trong dự án (NSX xem lần lượt từng vai)
  const groups = useMemo(() => {
    const known = new Set(project.roles.map(r => r.id));
    const out = project.roles
      .map(r => ({ id: r.id, name: r.name, need: [roleSummary(r), r.quantity ? `cần ${r.quantity} người` : null].filter(Boolean).join(' · '), items: list.filter(a => a.application.role_id === r.id) }))
      .filter(g => g.items.length > 0);
    const other = list.filter(a => !known.has(a.application.role_id));
    if (other.length) out.push({ id: 'other', name: 'Vai khác', need: '', items: other });
    return out;
  }, [project.roles, list]);

  return (
    <>
      <header>
        <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Danh sách ứng viên · {project.code}</p>
        <h1 className="dv-display dv-headline mt-1">{project.title}</h1>
        <p className="mt-2 text-[17px] text-[var(--dv-text-secondary)]">
          {[
            project.production_company,
            projectTypeLabel(project.project_type),
            project.location ? provinceLabel(project.location) : null,
            project.shooting_time,
            project.deadline ? `Hạn nộp ${formatVnDate(project.deadline)}` : null
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      {/* Bộ lọc */}
      <div className="sticky top-0 z-10 -mx-4 mt-6 border-b border-[#e8e8ed] bg-[var(--dv-bg-alt)]/95 px-4 py-3 backdrop-blur print:hidden md:mx-0 md:px-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="dv-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            <button type="button" className="dv-chip shrink-0" aria-pressed={role === 'all'} onClick={() => setRole('all')}>
              Tất cả · {applicants.length}
            </button>
            {project.roles
              .filter(r => countFor(r.id) > 0 || role === r.id)
              .map(r => (
                <button key={r.id} type="button" className="dv-chip shrink-0" aria-pressed={role === r.id} onClick={() => setRole(r.id)} title={roleSummary(r)}>
                  {r.name} · {countFor(r.id)}
                </button>
              ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className="dv-input !h-10 !w-auto !rounded-full !text-[14px]" aria-label="Lọc giới tính">
              <option value="all">Mọi giới tính</option>
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
            </select>
            <div className="flex h-10 rounded-full border border-[#d2d2d7] bg-white p-0.5" role="group" aria-label="Kiểu hiển thị">
              {(['grid', 'list'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`whitespace-nowrap rounded-full px-3.5 text-[14px] transition-colors ${mode === m ? 'bg-[var(--dv-accent)] text-white' : 'text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]'}`}
                >
                  {m === 'grid' ? 'Lưới' : 'Danh sách'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => window.print()} className="dv-btn dv-btn-ghost !hidden !h-10 !py-0 text-[14px] sm:!inline-flex">
              <Printer className="h-4 w-4" /> In / PDF
            </button>
          </div>
        </div>
      </div>

      {project.hide_contacts && (
        <p className="mt-4 text-[14px] text-[var(--dv-text-secondary)]">Thông tin liên hệ của diễn viên được bảo mật. Vui lòng liên hệ DienVienVN để kết nối.</p>
      )}

      {list.length === 0 ? (
        <div className="mt-10 rounded-[18px] bg-white p-12 text-center">
          <p className="text-[21px] font-semibold">Chưa có ứng viên.</p>
          <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Danh sách sẽ tự cập nhật khi đội casting duyệt thêm hồ sơ. Bạn chỉ cần mở lại link này.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-10 print:space-y-6">
          {groups.map(g => (
            <section key={g.id} className="break-inside-avoid-page">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#d2d2d7] pb-2">
                <h2 className="text-[24px] font-semibold leading-[1.17] tracking-[0.009em]">{g.name}</h2>
                {g.need && <p className="text-[15px] text-[var(--dv-text-secondary)]">{g.need}</p>}
                <span className="ml-auto text-[14px] text-[var(--dv-text-tertiary)]">{g.items.length} ứng viên</span>
              </div>
              {mode === 'grid' ? (
                <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-3">
                  {g.items.map(a => (
                    <ApplicantCard key={a.application.id} applicant={a} limited={!!view.limited} profileHref={profileHref?.(a.talent.id) || null} />
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {g.items.map(a => (
                    <ApplicantRow key={a.application.id} applicant={a} limited={!!view.limited} profileHref={profileHref?.(a.talent.id) || null} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/** Tách link trong lời nhắn thành thẻ <a> (link dài rút gọn, không làm vỡ bố cục). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {part.replace(/^https?:\/\//, '').slice(0, 40)}
            {part.replace(/^https?:\/\//, '').length > 40 ? '…' : ''}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">{children}</p>;
}

function Chips({ items, max = 5 }: { items: string[]; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, max).map(item => (
        <span key={item} className="rounded-full bg-[var(--dv-bg-alt)] px-2 py-[3px] text-[12px] leading-tight">
          {item}
        </span>
      ))}
      {items.length > max && <span className="px-1 py-[3px] text-[12px] leading-tight text-[var(--dv-text-tertiary)]">+{items.length - max}</span>}
    </div>
  );
}

function Name({ name, href, className }: { name: string; href?: string | null; className: string }) {
  return href ? (
    <Link href={href} className={`${className} hover:underline`}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  );
}

function SelftapeButton({ url, compact }: { url: string; compact?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--dv-accent)] font-medium text-white hover:bg-[var(--dv-accent-hover)] ${compact ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[14px]'}`}
    >
      <Video className="h-4 w-4" /> Self-tape
    </a>
  );
}

/* ---------- Dạng lưới: ảnh → chỉ số → kinh nghiệm & kỹ năng → hành động; thông tin phụ trong "Chi tiết" ---------- */
function ApplicantCard({ applicant, profileHref, limited = false }: { applicant: ProducerApplicant; profileHref?: string | null; limited?: boolean }) {
  const d = derive(applicant);
  const { t } = d;
  const [photo, setPhoto] = useState(d.photos[0]?.url || '');
  const [open, setOpen] = useState(false);
  const stats: [string, string | null][] = [
    ['Tuổi', d.age !== null ? String(d.age) : null],
    ['Cao', t.height_cm ? `${t.height_cm}` : null],
    ['Nặng', t.weight_kg ? `${t.weight_kg}` : null],
    ['Số đo', d.measurements]
  ];
  // Bản công khai: định hướng & mức độ sẵn sàng hiện luôn trên thẻ thay cho chỉ số ngoại hình
  const showWillingInline = limited && (d.willingness.length > 0 || d.workCities.length > 0);
  const hasDetails = d.training.length || (!showWillingInline && (d.willingness.length || d.workCities.length)) || d.note || d.socials.length || t.email || t.shoe_size || d.credits.length > 2;

  return (
    <li className="flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] break-inside-avoid print:border print:border-[#e8e8ed] print:shadow-none">
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#e8e8ed]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={t.full_name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" loading="lazy" />
        )}
        {d.photos.length > 1 && (
          <div className="absolute bottom-2.5 left-2.5 flex gap-1 rounded-[10px] bg-black/30 p-1 backdrop-blur print:hidden">
            {d.photos.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPhoto(p.url)}
                className={`h-10 w-[30px] overflow-hidden rounded-[6px] ring-2 transition ${photo === p.url ? 'ring-white' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                aria-label={p.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
        {d.application.selftape_url && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold shadow-sm">
            <Video className="h-3.5 w-3.5" /> Có self-tape
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Name name={t.full_name} href={profileHref} className="text-[18px] font-semibold leading-[1.22]" />
        <p className="mt-0.5 text-[13px] text-[var(--dv-text-secondary)]">{[d.gender, t.city ? provinceLabel(t.city) : null].filter(Boolean).join(' · ')}</p>

        {/* Chỉ số ngoại hình: đọc lướt theo cột (ẩn ở bản công khai) */}
        {!limited && (
        <dl className="mt-3 grid grid-cols-[0.8fr_0.9fr_0.9fr_1.7fr] gap-1 rounded-[12px] bg-[var(--dv-bg-alt)] px-2 py-2 text-center">
          {stats.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{k}</dt>
              <dd className="whitespace-nowrap text-[14px] font-semibold leading-tight tracking-[-0.01em]">{v || '–'}</dd>
            </div>
          ))}
        </dl>
        )}

        <div className="mt-3 space-y-2.5">
          {d.credits.length > 0 && (
            <div>
              <Label>Kinh nghiệm</Label>
              <ul className="mt-1 space-y-0.5 text-[13px] leading-[1.4]">
                {d.credits.slice(0, 2).map(c => (
                  <li key={c} className="truncate">
                    {c}
                  </li>
                ))}
              </ul>
              {d.credits.length > 2 && <p className="text-[12px] text-[var(--dv-text-tertiary)]">+{d.credits.length - 2} dự án khác</p>}
            </div>
          )}
          {d.skills.length > 0 && (
            <div>
              <Label>Kỹ năng</Label>
              <div className="mt-1">
                <Chips items={d.skills} />
              </div>
            </div>
          )}
          {showWillingInline && <WillingBlock willingness={d.willingness} cities={d.workCities} />}
        </div>

        {/* Chi tiết: mở khi cần (in ra PDF thì luôn hiện) */}
        {hasDetails && (
          <div className={`${open ? 'block' : 'hidden'} mt-3 space-y-2.5 border-t border-[#f0f0f2] pt-3 text-[13px] leading-[1.45] print:block`}>
            {d.credits.length > 2 && (
              <div>
                <Label>Toàn bộ kinh nghiệm</Label>
                <ul className="mt-1 space-y-0.5">
                  {d.credits.map(c => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {d.training.length > 0 && (
              <div>
                <Label>Đào tạo</Label>
                <p className="mt-1">{d.training.join(' · ')}</p>
              </div>
            )}
            {!showWillingInline && (d.willingness.length > 0 || d.workCities.length > 0) && <WillingBlock willingness={d.willingness} cities={d.workCities} />}
            {t.shoe_size && (
              <div>
                <Label>Size giày</Label>
                <p className="mt-1">{t.shoe_size}</p>
              </div>
            )}
            {d.note && (
              <div>
                <Label>Lời nhắn</Label>
                <p className="mt-1 whitespace-pre-line break-words rounded-[10px] bg-[var(--dv-bg-alt)] px-3 py-2">
                  <Linkified text={d.note} />
                </p>
              </div>
            )}
            {(d.socials.length > 0 || t.email) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {d.socials.map(sc => (
                  <a key={sc.label} href={sc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                    {sc.label === 'Showreel' && <ExternalLink className="h-3 w-3" />}
                    {sc.label}
                  </a>
                ))}
                {t.email && (
                  <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 break-all text-[var(--dv-text-secondary)]">
                    <Mail className="h-3 w-3" /> {t.email}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          <div className="flex items-center gap-2">
            {d.application.selftape_url && <SelftapeButton url={d.application.selftape_url} />}
            {hasDetails && (
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="inline-flex h-9 items-center rounded-full border border-[#d2d2d7] px-3.5 text-[14px] hover:border-[var(--dv-accent)] print:hidden"
                aria-expanded={open}
              >
                {open ? 'Thu gọn' : 'Chi tiết'}
              </button>
            )}
          </div>
          {t.phone && (
            <a href={`tel:${t.phone}`} className="mt-3 flex items-center gap-2 border-t border-[#f0f0f2] pt-3 text-[14px] font-semibold">
              <Phone className="h-4 w-4 shrink-0" /> {formatPhone(t.phone)}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------- Dạng danh sách: mỗi ứng viên 1 dòng để so sánh nhanh ---------- */
function ApplicantRow({ applicant, profileHref, limited = false }: { applicant: ProducerApplicant; profileHref?: string | null; limited?: boolean }) {
  const d = derive(applicant);
  const { t } = d;
  const thumb = d.photos[0]?.url;
  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-[14px] bg-white p-3 md:grid-cols-[64px_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)_264px] break-inside-avoid">
      <div className="relative row-span-2 aspect-[4/5] w-full overflow-hidden rounded-[10px] bg-[#e8e8ed] md:row-span-1">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={t.full_name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" loading="lazy" />
        )}
      </div>
      <div className="min-w-0">
        <Name name={t.full_name} href={profileHref} className="block truncate text-[16px] font-semibold" />
        <p className="truncate text-[13px] text-[var(--dv-text-secondary)]">{[d.gender, t.city ? provinceLabel(t.city) : null].filter(Boolean).join(' · ')}</p>
      </div>
      <p className="col-start-2 flex flex-wrap gap-x-2 text-[13px] md:col-start-auto md:text-[14px]">
        {(limited
          ? d.willingness.slice(0, 3)
          : [d.age !== null ? `${d.age} tuổi` : null, t.height_cm ? `${t.height_cm} cm` : null, t.weight_kg ? `${t.weight_kg} kg` : null, d.measurements]
        )
          .filter(Boolean)
          .map(x => (
            <span key={x as string} className="whitespace-nowrap">
              {x}
            </span>
          ))}
      </p>
      <div className="col-span-2 min-w-0 md:col-span-1">
        {d.credits[0] && <p className="truncate text-[13px]">{d.credits.slice(0, 2).join(' · ')}</p>}
        {d.skills.length > 0 && <p className="truncate text-[12px] text-[var(--dv-text-secondary)]">{d.skills.slice(0, 5).join(' · ')}</p>}
      </div>
      <div className="col-span-2 flex items-center gap-2 md:col-span-1 md:justify-end">
        {d.application.selftape_url && <SelftapeButton url={d.application.selftape_url} compact />}
        {t.phone && (
          <a href={`tel:${t.phone}`} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d2d2d7] px-3 text-[13px] font-semibold">
            <Phone className="h-3.5 w-3.5" /> {formatPhone(t.phone)}
          </a>
        )}
      </div>
    </li>
  );
}

/** Định hướng & mức độ sẵn sàng cho vai diễn. */
function WillingBlock({ willingness, cities }: { willingness: string[]; cities: string[] }) {
  return (
    <div className="space-y-2.5">
      {willingness.length > 0 && (
        <div>
          <Label>Sẵn sàng</Label>
          <div className="mt-1">
            <Chips items={willingness} max={8} />
          </div>
        </div>
      )}
      {cities.length > 0 && (
        <div>
          <Label>Nhận quay tại</Label>
          <p className="mt-1 text-[13px] leading-[1.4]">{cities.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}
