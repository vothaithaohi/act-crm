'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [role, setRole] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    fetchProducerView(token)
      .then(setView)
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
        setView(null);
      });
  }, [token]);

  const list = useMemo(
    () =>
      (view?.applicants || []).filter(
        a => (role === 'all' || a.application.role_id === role) && (gender === 'all' || a.talent.gender === gender)
      ),
    [view, role, gender]
  );

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

  const { project, applicants } = view;
  const countFor = (roleId: string) => applicants.filter(a => a.application.role_id === roleId).length;
  const roleName = (id: string) => project.roles.find(r => r.id === id)?.name || 'Vai khác';

  return (
    <>
      <div className="print:hidden">
        <GlobalNav />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20 print:bg-white print:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6 lg:pt-12">
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
              {project.roles.map(r => (
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
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
              {list.map(a => (
                <ApplicantCard key={a.application.id} applicant={a} roleName={roleName(a.application.role_id)} />
              ))}
            </ul>
          )}

          <p className="mt-10 text-center text-[12px] text-[var(--dv-text-tertiary)]">
            Tài liệu nội bộ do DienVienVN cung cấp cho nhà sản xuất. Vui lòng không chia sẻ công khai.
          </p>
        </div>
      </main>
    </>
  );
}

function ApplicantCard({ applicant, roleName }: { applicant: ProducerApplicant; roleName: string }) {
  const { talent: t, application } = applicant;
  const photos = [
    { key: 'headshot', label: 'Chân dung', url: t.headshot_url },
    { key: 'fullbody', label: 'Toàn thân', url: t.fullbody_url },
    { key: 'compcard', label: 'Nghiêng', url: t.compcard_url }
  ].filter(p => p.url) as { key: string; label: string; url: string }[];
  const [photo, setPhoto] = useState(photos[0]?.url || '');
  const age = t.dob ? ageFromDob(t.dob) : null;

  const skills = [
    ...(t.vietnamese_accents || []).map(a => `Giọng ${a.accent}`),
    ...(t.languages || []).filter(l => l.language !== 'Tiếng Việt').map(l => l.language),
    ...(t.martial_arts || []).map(m => m.style || m.name || ''),
    ...(t.dancing || []).map(d => d.style || d.name || ''),
    ...(t.instruments || []).map(i => i.name || i.style || ''),
    ...(t.sports || []).map(s => s.name || s.style || '')
  ].filter(Boolean);

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
  ].filter(Boolean);

  const measurements = [t.chest_cm, t.waist_cm, t.hip_cm].some(Boolean)
    ? `${t.chest_cm || '—'}-${t.waist_cm || '—'}-${t.hip_cm || '—'}`
    : null;

  return (
    <li className="flex flex-col overflow-hidden rounded-[18px] bg-white break-inside-avoid print:border print:border-[#e8e8ed]">
      <div className="relative aspect-[3/4] bg-[#e8e8ed]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={t.full_name} className="h-full w-full object-cover object-top" loading="lazy" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold backdrop-blur">{roleName}</span>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 print:hidden">
          {photos.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPhoto(p.url)}
              className={`h-14 w-11 overflow-hidden rounded-[8px] border-2 ${photo === p.url ? 'border-[var(--dv-blue)]' : 'border-transparent'}`}
              aria-label={p.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.011em]">{t.full_name}</p>
        <p className="mt-1 text-[14px] text-[var(--dv-text-secondary)]">
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

        <dl className="mt-4 space-y-2 text-[13px] leading-[1.38]">
          {measurements && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Số đo</dt>
              <dd>
                {measurements}
                {t.shoe_size ? ` · Giày ${t.shoe_size}` : ''}
              </dd>
            </div>
          )}
          {skills.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Kỹ năng</dt>
              <dd>{skills.join(', ')}</dd>
            </div>
          )}
          {credits.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Kinh nghiệm</dt>
              <dd>{credits.slice(0, 4).join(', ')}{credits.length > 4 ? ` +${credits.length - 4}` : ''}</dd>
            </div>
          )}
          {training.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Đào tạo</dt>
              <dd>{training.join(', ')}</dd>
            </div>
          )}
          {(t.role_willingness || []).length > 0 && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Sẵn sàng</dt>
              <dd>{(t.role_willingness || []).map(w => WILLINGNESS[w] || w).join(', ')}</dd>
            </div>
          )}
          {application.note && (
            <div className="flex gap-2">
              <dt className="w-[86px] shrink-0 text-[var(--dv-text-tertiary)]">Lời nhắn</dt>
              <dd className="italic">{application.note}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto space-y-2 pt-5 text-[14px]">
          {application.selftape_url && (
            <a href={application.selftape_url} target="_blank" rel="noreferrer" className="dv-link font-semibold">
              <Video className="h-4 w-4" /> Xem self-tape
            </a>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {t.social_links?.showreel_url && (
              <a href={t.social_links.showreel_url} target="_blank" rel="noreferrer" className="dv-link">
                <ExternalLink className="h-3.5 w-3.5" /> Showreel
              </a>
            )}
            {t.social_links?.facebook && (
              <a href={t.social_links.facebook} target="_blank" rel="noreferrer" className="dv-link">Facebook</a>
            )}
            {t.social_links?.instagram && (
              <a href={t.social_links.instagram} target="_blank" rel="noreferrer" className="dv-link">Instagram</a>
            )}
            {t.social_links?.tiktok && (
              <a href={t.social_links.tiktok} target="_blank" rel="noreferrer" className="dv-link">TikTok</a>
            )}
          </div>
          {(t.phone || t.email) && (
            <div className="space-y-1 border-t border-[#f0f0f2] pt-3">
              {t.phone && (
                <a href={`tel:${t.phone}`} className="flex items-center gap-2 font-semibold text-[var(--dv-text)]">
                  <Phone className="h-3.5 w-3.5" /> {formatPhone(t.phone)}
                </a>
              )}
              {t.email && (
                <a href={`mailto:${t.email}`} className="flex items-center gap-2 text-[var(--dv-text-secondary)]">
                  <Mail className="h-3.5 w-3.5" /> {t.email}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
