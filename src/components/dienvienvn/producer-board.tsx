'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Mail, Phone, Printer, Video } from 'lucide-react';
import { ProducerApplicant, ProducerView } from '@/lib/projects/producer';
import { fetchProducerView } from '@/lib/projects/public-client';
import { projectTypeLabel, roleSummary } from '@/lib/projects/types';
import { ageFromDob } from '@/lib/dienvienvn/casting-form';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { formatVnDate } from './projects-section';
import { GlobalNav } from './site-chrome';

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
export function ProducerApplicants({ view, profileHref }: { view: ProducerView; profileHref?: (talentId: string) => string | null }) {
  const [role, setRole] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const list = useMemo(
    () =>
      view.applicants.filter(
        a => (role === 'all' || a.application.role_id === role) && (gender === 'all' || a.talent.gender === gender)
      ),
    [view, role, gender]
  );
  const { project, applicants } = view;
  const countFor = (roleId: string) => applicants.filter(a => a.application.role_id === roleId).length;
  const roleName = (id: string) => project.roles.find(r => r.id === id)?.name || 'Vai khác';

  return (
    <>
          <header>
            <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">
              Danh sách ứng viên · {project.code}
            </p>
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
          <div className="mt-8 flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
            <div className="dv-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              <button type="button" className="dv-chip shrink-0" aria-pressed={role === 'all'} onClick={() => setRole('all')}>
                Tất cả vai · {applicants.length}
              </button>
              {project.roles.filter(r => countFor(r.id) > 0 || role === r.id).map(r => (
                <button key={r.id} type="button" className="dv-chip shrink-0" aria-pressed={role === r.id} onClick={() => setRole(r.id)} title={roleSummary(r)}>
                  {r.name} · {countFor(r.id)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className="dv-input !h-10 !w-auto !rounded-full !text-[14px]" aria-label="Lọc giới tính">
                <option value="all">Mọi giới tính</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
              </select>
              <button type="button" onClick={() => window.print()} className="dv-btn dv-btn-ghost !py-2 text-[14px]">
                <Printer className="h-4 w-4" /> In / Lưu PDF
              </button>
            </div>
          </div>

          {project.hide_contacts && (
            <p className="mt-4 text-[14px] text-[var(--dv-text-secondary)]">
              Thông tin liên hệ của diễn viên được bảo mật. Vui lòng liên hệ DienVienVN để kết nối.
            </p>
          )}

          {list.length === 0 ? (
            <div className="mt-10 rounded-[18px] bg-white p-12 text-center">
              <p className="text-[21px] font-semibold">Chưa có ứng viên.</p>
              <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">
                Danh sách sẽ tự cập nhật khi đội casting duyệt thêm hồ sơ. Bạn chỉ cần mở lại link này.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 print:gap-3">
              {list.map(a => (
                <ApplicantCard key={a.application.id} applicant={a} roleName={roleName(a.application.role_id)} profileHref={profileHref?.(a.talent.id) || null} />
              ))}
            </ul>
          )}
    </>
  );
}

/** Tách link trong lời nhắn thành thẻ <a> (link dài tự xuống dòng, không làm vỡ bố cục). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {part.replace(/^https?:\/\//, '').slice(0, 48)}
            {part.replace(/^https?:\/\//, '').length > 48 ? '…' : ''}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Chips({ items, max = 8 }: { items: string[]; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(item => (
        <span key={item} className="rounded-full bg-[var(--dv-bg-alt)] px-2.5 py-1 text-[13px] leading-none">
          {item}
        </span>
      ))}
      {items.length > max && <span className="px-1 py-1 text-[13px] leading-none text-[var(--dv-text-tertiary)]">+{items.length - max}</span>}
    </div>
  );
}

function ApplicantCard({ applicant, roleName, profileHref }: { applicant: ProducerApplicant; roleName: string; profileHref?: string | null }) {
  const { talent: t, application } = applicant;
  const photos = [
    { key: 'headshot', label: 'Chân dung', url: t.headshot_url },
    { key: 'fullbody', label: 'Toàn thân', url: t.fullbody_url },
    { key: 'compcard', label: 'Nghiêng', url: t.compcard_url }
  ].filter(p => p.url) as { key: string; label: string; url: string }[];
  const [photo, setPhoto] = useState(photos[0]?.url || '');
  const [noteOpen, setNoteOpen] = useState(false);
  const age = t.dob ? ageFromDob(t.dob) : null;

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
    ...(exp?.feature_films || []).map(f => f.title),
    ...(exp?.web_dramas || []).map(f => f.title),
    ...(exp?.tv_shows || []).map(f => f.title),
    ...(exp?.commercials || []).map(c => `TVC ${c.brand}`),
    ...(exp?.music_videos || []).map(m => `MV ${m.song}`)
  ].filter(Boolean);

  const training = [
    t.academic_profile?.enrollments?.length ? `ACT Academy${t.academic_profile.highest_class_code ? ` (${t.academic_profile.highest_class_code})` : ''}` : null,
    ...(t.academic_profile?.external_trainings || []).map(e => e.school_name)
  ].filter(Boolean) as string[];

  const willingness = Array.from(new Set((t.role_willingness || []).map(w => WILLINGNESS[w] || w)));
  const stats = [
    [t.chest_cm, t.waist_cm, t.hip_cm].some(Boolean) ? `Số đo ${t.chest_cm || '—'}-${t.waist_cm || '—'}-${t.hip_cm || '—'}` : null,
    t.shoe_size ? `Giày ${t.shoe_size}` : null
  ].filter(Boolean) as string[];

  const socials = [
    { label: 'Showreel', url: t.social_links?.showreel_url },
    { label: 'Facebook', url: t.social_links?.facebook },
    { label: 'Instagram', url: t.social_links?.instagram },
    { label: 'TikTok', url: t.social_links?.tiktok }
  ].filter((x): x is { label: string; url: string } => !!x.url);

  const note = application.note?.trim() || '';
  const longNote = note.length > 140;

  return (
    <li className="flex flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] break-inside-avoid print:border print:border-[#e8e8ed] print:shadow-none">
      {/* Khung ảnh cố định 4:5 cho mọi ứng viên: ảnh lấp đầy và cắt phần dư (ưu tiên phần mặt ở trên) */}
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#e8e8ed]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={t.full_name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" loading="lazy" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold shadow-sm backdrop-blur">{roleName}</span>
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-[12px] bg-black/30 p-1.5 backdrop-blur print:hidden">
            {photos.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPhoto(p.url)}
                className={`h-12 w-9 overflow-hidden rounded-[8px] ring-2 transition ${photo === p.url ? 'ring-white' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                aria-label={p.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-[22px] font-semibold leading-[1.18] tracking-[0.004em]">
          {profileHref ? (
            <Link href={profileHref} className="hover:underline">
              {t.full_name}
            </Link>
          ) : (
            t.full_name
          )}
        </h3>
        <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">
          {[
            t.gender === 'female' ? 'Nữ' : t.gender === 'male' ? 'Nam' : 'Khác',
            age !== null ? `${age} tuổi` : null,
            t.height_cm ? `${t.height_cm} cm` : null,
            t.weight_kg ? `${t.weight_kg} kg` : null,
            t.city ? provinceLabel(t.city) : null
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {stats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stats.map(s => (
              <span key={s} className="rounded-[8px] border border-[#e8e8ed] px-2 py-1 text-[13px] leading-none text-[var(--dv-text-secondary)]">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-4 border-t border-[#f0f0f2] pt-5 text-[15px] leading-[1.47]">
          {skills.length > 0 && (
            <Section label="Kỹ năng">
              <Chips items={skills} />
            </Section>
          )}
          {credits.length > 0 && (
            <Section label="Kinh nghiệm">
              <ul className="space-y-0.5">
                {credits.slice(0, 4).map(c => (
                  <li key={c} className="line-clamp-1">
                    {c}
                  </li>
                ))}
              </ul>
              {credits.length > 4 && <p className="mt-0.5 text-[13px] text-[var(--dv-text-tertiary)]">+{credits.length - 4} dự án khác</p>}
            </Section>
          )}
          {training.length > 0 && <Section label="Đào tạo">{training.join(' · ')}</Section>}
          {willingness.length > 0 && (
            <Section label="Sẵn sàng">
              <Chips items={willingness} max={6} />
            </Section>
          )}
          {note && (
            <Section label="Lời nhắn">
              <div className="rounded-[12px] bg-[var(--dv-bg-alt)] px-3.5 py-3 text-[14px] leading-[1.5]">
                <p className={`whitespace-pre-line break-words ${longNote && !noteOpen ? 'line-clamp-3' : ''}`}>
                  <Linkified text={note} />
                </p>
                {longNote && (
                  <button type="button" onClick={() => setNoteOpen(v => !v)} className="mt-1 text-[13px] font-semibold print:hidden">
                    {noteOpen ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}
              </div>
            </Section>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-6">
          {(application.selftape_url || socials.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {application.selftape_url && (
                <a
                  href={application.selftape_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--dv-accent)] px-4 text-[14px] font-medium text-white hover:bg-[var(--dv-accent-hover)]"
                >
                  <Video className="h-4 w-4" /> Self-tape
                </a>
              )}
              {socials.map(sc => (
                <a
                  key={sc.label}
                  href={sc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] px-3.5 text-[14px] hover:border-[var(--dv-accent)]"
                >
                  {sc.label === 'Showreel' && <ExternalLink className="h-3.5 w-3.5" />}
                  {sc.label}
                </a>
              ))}
            </div>
          )}
          {(t.phone || t.email) && (
            <div className="space-y-1.5 rounded-[14px] border border-[#f0f0f2] px-4 py-3 text-[15px]">
              {t.phone && (
                <a href={`tel:${t.phone}`} className="flex items-center gap-2.5 font-semibold text-[var(--dv-text)]">
                  <Phone className="h-4 w-4 shrink-0" /> {formatPhone(t.phone)}
                </a>
              )}
              {t.email && (
                <a href={`mailto:${t.email}`} className="flex items-center gap-2.5 break-all text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]">
                  <Mail className="h-4 w-4 shrink-0" /> {t.email}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
