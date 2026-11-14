'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, HelpCircle, Loader2, Lock, Mail, Phone, Play, Printer, Video, X } from 'lucide-react';
import { ProducerApplicant, ProducerView } from '@/lib/projects/producer';
import { fetchProducerView, saveProducerDecision } from '@/lib/projects/public-client';
import { PRODUCER_DECISIONS, ProducerDecision, projectTypeLabel, roleSummary } from '@/lib/projects/types';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import type { PartnerTalent } from '@/lib/dienvienvn/partners';
import { experienceGroups, skillGroups, trainingList } from '@/lib/dienvienvn/talent-sections';
import { TalentProfileBody } from './talent-profile-view';
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

/** Mã hồ sơ đối tác gửi DienVienVN khi cần tên đầy đủ / liên hệ của diễn viên. */
function profileCode(id: string) {
  return `DV-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p;
}

export function ProducerBoard({ token }: { token: string }) {
  const href = useDvvnHref();
  // "Liên hệ" khi chưa đăng nhập → đăng ký đối tác, xong quay lại đúng link này
  const signupHref = href(`/doi-tac/dang-ky?next=${encodeURIComponent(href(`/nsx/${token}`))}`);
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
        <GlobalNav minimal />
        <main className="flex min-h-[60vh] items-center justify-center bg-[var(--dv-bg-alt)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
        </main>
      </>
    );
  }

  if (!view) {
    return (
      <>
        <GlobalNav minimal />
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
        <GlobalNav minimal />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20 print:bg-white print:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6 lg:pt-12">
          {view.limited && (
            <div className="mb-6 flex flex-col gap-3 rounded-[18px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5 print:hidden">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dv-text-secondary)]" />
                <p className="text-[14px] leading-[1.45] text-[var(--dv-text-secondary)]">
                  <span className="font-semibold text-[var(--dv-text)]">Số đo và thông tin liên hệ</span> của diễn viên chỉ dành cho đối
                  tác DienVienVN. Bấm &ldquo;Liên hệ&rdquo; trên thẻ diễn viên để đăng ký tài khoản đối tác — sau khi được duyệt, bạn xem được số điện thoại và email.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={signupHref} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
                  Đăng ký đối tác
                </Link>
                <Link href={href(`/dang-nhap?next=${encodeURIComponent(href(`/nsx/${token}`))}`)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
                  Đăng nhập
                </Link>
              </div>
            </div>
          )}
          <ProducerApplicants view={view} contactHref={view.limited ? signupHref : undefined} decisionTarget={{ token }} />
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
    { key: 'compcard', label: 'Nghiêng', url: t.compcard_url },
    ...(t.gallery || []).map((g, k) => ({ key: `gallery-${k}`, label: g.caption || `Ảnh ${k + 1}`, url: g.url }))
  ].filter(p => p.url) as { key: string; label: string; url: string }[];
  const age = t.age ?? (t.dob ? ageFromDob(t.dob) : null);
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

/** Hồ sơ ứng viên dạng trang hồ sơ diễn viên (cửa sổ trượt), self-tape là video nộp riêng cho vai này. */
function toProfile(a: ProducerApplicant, roleName: string): PublicTalent {
  const t = a.talent;
  const tapes = tapesOf(a.application);
  return {
    username: '',
    name: t.full_name,
    age: t.age ?? (t.dob ? ageFromDob(t.dob) : null),
    gender: (t.gender as PublicTalent['gender']) || null,
    height_cm: t.height_cm || null,
    weight_kg: t.weight_kg || null,
    act_levels: [],
    willingness: Array.isArray(t.role_willingness) ? t.role_willingness : [],
    work_cities: Array.from(new Set((t.willing_work_cities || []).map(c => provinceLabel(c) || c).filter(Boolean))),
    photos: [
      { label: 'Chân dung', url: t.headshot_url },
      { label: 'Toàn thân', url: t.fullbody_url },
      { label: 'Góc nghiêng', url: t.compcard_url }
    ].filter((p): p is { label: string; url: string } => !!p.url),
    experience: experienceGroups(t.acting_experience),
    skills: skillGroups(t),
    trainings: trainingList(t.academic_profile),
    gallery: (t.gallery || []).filter(g => g?.url).map(g => ({ url: g.url, caption: g.caption || '' })),
    selftapes: tapes.map((url, i) => ({ url, title: `Self-tape vai ${roleName}${tapes.length > 1 ? ` (${i + 1})` : ''}` }))
  };
}

const DECISION_UI: Record<ProducerDecision, { label: string; icon: typeof Check; on: string; badge: string }> = {
  pick: { label: 'Chọn', icon: Check, on: 'bg-[#1f8f4e] text-white border-[#1f8f4e]', badge: 'bg-[#1f8f4e] text-white' },
  maybe: { label: 'Cân nhắc', icon: HelpCircle, on: 'bg-[#b8892f] text-white border-[#b8892f]', badge: 'bg-[#b8892f] text-white' },
  reject: { label: 'Loại', icon: X, on: 'bg-[#6e6e73] text-white border-[#6e6e73]', badge: 'bg-[#6e6e73] text-white' }
};

/** Chọn / Cân nhắc / Loại: bấm lại nút đang bật để bỏ đánh dấu. */
function DecisionButtons({ value, onChange, compact = false }: { value: ProducerDecision | null; onChange: (d: ProducerDecision) => void; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-1.5 print:hidden ${compact ? 'w-full md:w-[252px]' : ''}`} role="group" aria-label="Lựa chọn của nhà sản xuất">
      {PRODUCER_DECISIONS.map(d => {
        const ui = DECISION_UI[d];
        const on = value === d;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={e => {
              e.stopPropagation();
              onChange(d);
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border font-semibold transition-colors ${compact ? 'h-8 text-[12.5px]' : 'h-9 text-[13.5px]'} ${
              on ? ui.on : 'border-[#d2d2d7] bg-white text-[var(--dv-text)] hover:border-[#1d1d1f]'
            }`}
          >
            <ui.icon className="h-3.5 w-3.5" /> {ui.label}
          </button>
        );
      })}
    </div>
  );
}

function DecisionBadge({ value }: { value: ProducerDecision | null }) {
  if (!value) return null;
  const ui = DECISION_UI[value];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-sm ${ui.badge}`}>
      <ui.icon className="h-3.5 w-3.5" /> {value === 'pick' ? 'Đã chọn' : ui.label}
    </span>
  );
}

export function ProducerApplicants({
  view,
  profileHref,
  contactHref,
  decisionTarget
}: {
  view: ProducerView;
  profileHref?: (talentId: string) => string | null;
  /** Có: nút "Liên hệ" dẫn tới trang này (đăng ký đối tác). Không: nút hiện hướng dẫn gửi mã hồ sơ. */
  contactHref?: string;
  /** Có: NSX đánh dấu Chọn / Cân nhắc / Loại (lưu lên hệ thống, ACT xem trong CRM). */
  decisionTarget?: { token: string } | { projectId: string };
}) {
  const [role, setRole] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [mode, setMode] = useState<ViewMode>('grid');
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const { project, applicants } = view;
  const limited = !!view.limited;
  const [decisions, setDecisions] = useState<Record<string, ProducerDecision | null>>(() =>
    Object.fromEntries(applicants.map(a => [a.application.id, a.application.producer_decision || null]))
  );
  const decisionOf = (a: ProducerApplicant) => decisions[a.application.id] || null;
  const roleName = (id: string) => project.roles.find(r => r.id === id)?.name || 'Vai khác';

  const picked = applicants.filter(a => decisionOf(a) === 'pick');
  // Bỏ hết lựa chọn → tự tắt "Chỉ xem đã chọn"
  useEffect(() => {
    if (!picked.length && onlyPicked) setOnlyPicked(false);
  }, [picked.length, onlyPicked]);

  const decide = async (a: ProducerApplicant, d: ProducerDecision) => {
    if (!decisionTarget) return;
    const id = a.application.id;
    const prev = decisions[id] || null;
    const next = prev === d ? null : d;
    setDecisions(m => ({ ...m, [id]: next }));
    setSaveError('');
    const r = await saveProducerDecision(decisionTarget, id, next);
    if (!r.ok) {
      setDecisions(m => ({ ...m, [id]: prev }));
      setSaveError(r.error);
    }
  };

  const list = applicants.filter(
    a => (role === 'all' || a.application.role_id === role) && (gender === 'all' || a.talent.gender === gender) && (!onlyPicked || decisionOf(a) === 'pick')
  );
  const countFor = (roleId: string) => applicants.filter(a => a.application.role_id === roleId).length;
  const pickedFor = (roleId: string) => picked.filter(a => a.application.role_id === roleId).length;

  // Nhóm theo vai, đúng thứ tự vai trong dự án (NSX xem lần lượt từng vai)
  const known = new Set(project.roles.map(r => r.id));
  const groups = project.roles
    .map(r => ({
      id: r.id,
      name: r.name,
      need: [roleSummary(r), r.quantity ? `cần ${r.quantity} người` : null].filter(Boolean).join(' · '),
      description: (r.description || '').trim(),
      items: list.filter(a => a.application.role_id === r.id)
    }))
    .filter(g => g.items.length > 0);
  const other = list.filter(a => !known.has(a.application.role_id));
  if (other.length) groups.push({ id: 'other', name: 'Vai khác', need: '', description: '', items: other });

  const opened = openId ? applicants.find(a => a.application.id === openId) || null : null;
  const copyPicked = async () => {
    const text = picked
      .map(a => [a.talent.full_name, roleName(a.application.role_id), a.talent.phone ? formatPhone(a.talent.phone) : '', a.talent.email || ''].filter(Boolean).join(' — '))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* trình duyệt chặn sao chép */
    }
  };
  const roleCard = (active: boolean) =>
    `flex w-[200px] shrink-0 flex-col rounded-[16px] border p-3.5 text-left transition-colors md:w-[220px] ${
      active ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white' : 'border-[#e5e5ea] bg-white hover:border-[#1d1d1f]'
    }`;

  return (
    <>
      <header>
        <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Shortlist diễn viên · {project.code}</p>
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

      {/* Các vai: bấm để xem ứng viên của vai đó */}
      <div className="dv-scroll-x -mx-4 mt-6 flex gap-2.5 overflow-x-auto px-4 pb-1 print:hidden md:mx-0 md:flex-wrap md:px-0">
        <button type="button" className={roleCard(role === 'all')} aria-pressed={role === 'all'} onClick={() => setRole('all')}>
          <span className="text-[16px] font-semibold">Tất cả vai</span>
          <span className={`mt-auto pt-2 text-[13px] ${role === 'all' ? 'text-white/80' : 'text-[var(--dv-text-secondary)]'}`}>
            {applicants.length} ứng viên{picked.length ? ` · ${picked.length} đã chọn` : ''}
          </span>
        </button>
        {project.roles
          .filter(r => countFor(r.id) > 0 || role === r.id)
          .map(r => {
            const active = role === r.id;
            return (
              <button key={r.id} type="button" className={roleCard(active)} aria-pressed={active} onClick={() => setRole(r.id)}>
                <span className="truncate text-[16px] font-semibold">{r.name}</span>
                <span className={`mt-0.5 line-clamp-2 text-[12.5px] leading-[1.35] ${active ? 'text-white/75' : 'text-[var(--dv-text-secondary)]'}`}>{roleSummary(r)}</span>
                <span className={`mt-auto pt-2 text-[13px] font-medium ${active ? 'text-white' : ''}`}>
                  {countFor(r.id)} ứng viên
                  {pickedFor(r.id) ? <span className={active ? 'text-[#7ee2a8]' : 'text-[#1f8f4e]'}> · {pickedFor(r.id)} đã chọn</span> : null}
                </span>
              </button>
            );
          })}
      </div>

      {/* Thanh công cụ */}
      <div className="sticky top-0 z-10 -mx-4 mt-4 border-b border-[#e8e8ed] bg-[var(--dv-bg-alt)]/95 px-4 py-3 backdrop-blur print:hidden md:mx-0 md:px-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {decisionTarget ? (
            <label
              className={`inline-flex select-none items-center gap-2.5 text-[14px] font-medium ${picked.length ? 'cursor-pointer' : 'cursor-not-allowed text-[var(--dv-text-tertiary)]'}`}
              title={picked.length ? undefined : 'Bấm "Chọn" trên thẻ diễn viên để mở bộ lọc này'}
            >
              <button
                type="button"
                role="switch"
                aria-checked={onlyPicked}
                disabled={!picked.length}
                onClick={() => setOnlyPicked(v => !v)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${onlyPicked ? 'bg-[#1f8f4e]' : 'bg-[#d2d2d7]'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${onlyPicked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
              Chỉ xem diễn viên đã chọn{picked.length ? ` (${picked.length})` : ''}
            </label>
          ) : (
            <span />
          )}
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
        {saveError && <p className="mt-2 text-[13px] font-medium text-[#c4314b]">{saveError}</p>}
      </div>

      {/* Liên hệ của các diễn viên đã chọn */}
      {decisionTarget && picked.length > 0 && (
        <section className="mt-6 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[19px] font-semibold">Diễn viên đã chọn · {picked.length}</h2>
            {!limited && (
              <button type="button" onClick={copyPicked} className="dv-btn dv-btn-secondary !h-9 !px-4 !py-0 text-[13.5px] print:hidden">
                <Copy className="h-4 w-4" /> {copied ? 'Đã sao chép' : 'Sao chép danh sách liên hệ'}
              </button>
            )}
          </div>
          <ul className="mt-3 divide-y divide-[#f0f0f2]">
            {picked.map(a => {
              const t = a.talent;
              return (
                <li key={a.application.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                  <button type="button" onClick={() => setOpenId(a.application.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="h-12 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[#e8e8ed]">
                      {t.headshot_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.headshot_url} alt="" className="h-full w-full object-cover object-[50%_20%]" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold hover:underline">{t.full_name}</span>
                      <span className="block truncate text-[13px] text-[var(--dv-text-secondary)]">Vai {roleName(a.application.role_id)}</span>
                    </span>
                  </button>
                  {limited ? null : (
                    <div className="flex flex-wrap items-center gap-2">
                      {t.phone && (
                        <a href={`tel:${t.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3.5 text-[13.5px] font-semibold text-white">
                          <Phone className="h-4 w-4" /> {formatPhone(t.phone)}
                        </a>
                      )}
                      {t.email && (
                        <a href={`mailto:${t.email}`} className="inline-flex h-9 max-w-[260px] items-center gap-1.5 rounded-full border border-[#d2d2d7] px-3.5 text-[13.5px]">
                          <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{t.email}</span>
                        </a>
                      )}
                      {!t.phone && !t.email && <ContactButton code={profileCode(t.id)} compact />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {limited && (
            <div className="mt-3 flex flex-col gap-3 rounded-[14px] bg-[var(--dv-bg-alt)] p-3.5 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p className="flex items-start gap-2 text-[14px] leading-[1.45]">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Đăng nhập tài khoản đối tác để xem số điện thoại và email của các diễn viên đã chọn.
              </p>
              {contactHref && (
                <Link href={contactHref} className="dv-btn dv-btn-primary !h-10 shrink-0 !py-0 text-[14px]">
                  Xem liên hệ
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {list.length === 0 ? (
        <div className="mt-10 rounded-[18px] bg-white p-12 text-center">
          <p className="text-[21px] font-semibold">{onlyPicked ? 'Chưa chọn diễn viên nào ở vai này.' : 'Chưa có ứng viên.'}</p>
          {!onlyPicked && (
            <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Danh sách sẽ tự cập nhật khi đội ngũ DienVienVN chọn thêm ứng viên vào shortlist. Bạn chỉ cần mở lại link này.</p>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-10 print:space-y-6">
          {groups.map(g => (
            <section key={g.id} className="break-inside-avoid-page">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#d2d2d7] pb-2">
                <h2 className="text-[24px] font-semibold leading-[1.17] tracking-[0.009em]">{g.name}</h2>
                {g.need && <p className="text-[15px] text-[var(--dv-text-secondary)]">{g.need}</p>}
                <span className="ml-auto text-[14px] text-[var(--dv-text-tertiary)]">{g.items.length} ứng viên</span>
              </div>
              {g.description && <RoleDescription text={g.description} />}
              {mode === 'grid' ? (
                <ul className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-3">
                  {g.items.map(a => (
                    <ShortlistCard
                      key={a.application.id}
                      applicant={a}
                      decision={decisionOf(a)}
                      onDecide={decisionTarget ? d => decide(a, d) : undefined}
                      onOpen={() => setOpenId(a.application.id)}
                      contactHref={contactHref}
                    />
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {g.items.map(a => (
                    <ShortlistRow
                      key={a.application.id}
                      applicant={a}
                      decision={decisionOf(a)}
                      onDecide={decisionTarget ? d => decide(a, d) : undefined}
                      onOpen={() => setOpenId(a.application.id)}
                      contactHref={contactHref}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {opened && (
        <ApplicantDrawer
          applicant={opened}
          roleName={roleName(opened.application.role_id)}
          limited={limited}
          decision={decisionOf(opened)}
          onDecide={decisionTarget ? d => decide(opened, d) : undefined}
          contactHref={contactHref}
          profileHref={limited ? null : profileHref?.(opened.talent.id) || null}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

/* ---------- Thẻ ứng viên: ảnh lớn → tên, tuổi, chiều cao → self-tape → Chọn / Cân nhắc / Loại ---------- */
function ShortlistCard({
  applicant,
  decision,
  onDecide,
  onOpen,
  contactHref
}: {
  applicant: ProducerApplicant;
  decision: ProducerDecision | null;
  onDecide?: (d: ProducerDecision) => void;
  onOpen: () => void;
  contactHref?: string;
}) {
  const d = derive(applicant);
  const { t } = d;
  const tapes = tapesOf(d.application);
  const facts = [d.age !== null ? `${d.age} tuổi` : t.age_range ? `${t.age_range} tuổi` : null, t.height_cm ? `${t.height_cm} cm` : null, d.gender].filter(Boolean).join(' · ');
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-opacity break-inside-avoid print:border print:border-[#e8e8ed] print:shadow-none ${
        decision === 'pick' ? 'ring-2 ring-[#1f8f4e]' : ''
      } ${decision === 'reject' ? 'opacity-55 hover:opacity-100' : ''}`}
    >
      <button type="button" onClick={onOpen} className="group relative block aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#e8e8ed]" aria-label={`Xem hồ sơ ${t.full_name}`}>
        {d.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.photos[0].url} alt={t.full_name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
        )}
        <span className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          <DecisionBadge value={decision} />
          {t.act && <span className="rounded-full bg-[#1d1d1f]/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">ACT Academy</span>}
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 print:hidden">
          Xem hồ sơ
        </span>
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <button type="button" onClick={onOpen} className="text-left text-[16px] font-semibold leading-[1.25] hover:underline sm:text-[18px]">
          {t.full_name}
        </button>
        {facts && <p className="mt-0.5 text-[13px] text-[var(--dv-text-secondary)] sm:text-[14px]">{facts}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          {tapes.length > 0 ? (
            tapes.map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--dv-accent)] px-3 text-[13.5px] font-semibold text-white hover:bg-[var(--dv-accent-hover)]"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" /> {tapes.length > 1 ? `Self-tape ${i + 1}` : 'Xem self-tape'}
              </a>
            ))
          ) : (
            <span className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[var(--dv-bg-alt)] px-3 text-[13px] text-[var(--dv-text-tertiary)]">Chưa có self-tape</span>
          )}
        </div>

        {onDecide && (
          <div className="mt-2">
            <DecisionButtons value={decision} onChange={onDecide} />
          </div>
        )}

        {t.phone ? (
          <a href={`tel:${t.phone}`} className="mt-3 flex items-center gap-2 border-t border-[#f0f0f2] pt-3 text-[14px] font-semibold">
            <Phone className="h-4 w-4 shrink-0" /> {formatPhone(t.phone)}
          </a>
        ) : (
          <div className="mt-3 border-t border-[#f0f0f2] pt-3">
            <ContactButton code={profileCode(t.id)} href={contactHref} compact />
          </div>
        )}
      </div>
    </li>
  );
}

/* ---------- Dạng danh sách: mỗi ứng viên 1 dòng để so sánh nhanh ---------- */
function ShortlistRow({
  applicant,
  decision,
  onDecide,
  onOpen,
  contactHref
}: {
  applicant: ProducerApplicant;
  decision: ProducerDecision | null;
  onDecide?: (d: ProducerDecision) => void;
  onOpen: () => void;
  contactHref?: string;
}) {
  const d = derive(applicant);
  const { t } = d;
  const facts = [d.age !== null ? `${d.age} tuổi` : t.age_range ? `${t.age_range} tuổi` : null, t.height_cm ? `${t.height_cm} cm` : null, d.gender].filter(Boolean).join(' · ');
  return (
    <li
      className={`grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-[14px] bg-white p-3 md:grid-cols-[56px_minmax(0,1fr)_auto_auto] break-inside-avoid ${
        decision === 'pick' ? 'ring-2 ring-[#1f8f4e]' : ''
      } ${decision === 'reject' ? 'opacity-55 hover:opacity-100' : ''}`}
    >
      <button type="button" onClick={onOpen} className="relative row-span-2 aspect-[4/5] w-full overflow-hidden rounded-[10px] bg-[#e8e8ed] md:row-span-1" aria-label={`Xem hồ sơ ${t.full_name}`}>
        {d.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.photos[0].url} alt={t.full_name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" loading="lazy" />
        )}
      </button>
      <div className="min-w-0">
        <button type="button" onClick={onOpen} className="flex max-w-full items-center gap-2 text-left">
          <span className="truncate text-[16px] font-semibold hover:underline">{t.full_name}</span>
          {decision && <DecisionBadge value={decision} />}
        </button>
        <p className="truncate text-[13px] text-[var(--dv-text-secondary)]">{[facts, t.act ? 'ACT Academy' : null].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
        <SelftapeButtons urls={tapesOf(d.application)} compact />
        {t.phone ? (
          <a href={`tel:${t.phone}`} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d2d2d7] px-3 text-[13px] font-semibold">
            <Phone className="h-3.5 w-3.5" /> {formatPhone(t.phone)}
          </a>
        ) : (
          <ContactButton code={profileCode(t.id)} href={contactHref} compact />
        )}
      </div>
      {onDecide && (
        <div className="col-span-2 md:col-span-1">
          <DecisionButtons value={decision} onChange={onDecide} compact />
        </div>
      )}
    </li>
  );
}

/** Cửa sổ hồ sơ ứng viên trượt từ phải: bố cục như trang hồ sơ diễn viên + nút Chọn / Cân nhắc / Loại. */
function ApplicantDrawer({
  applicant,
  roleName,
  limited,
  decision,
  onDecide,
  contactHref,
  profileHref,
  onClose
}: {
  applicant: ProducerApplicant;
  roleName: string;
  limited: boolean;
  decision: ProducerDecision | null;
  onDecide?: (d: ProducerDecision) => void;
  contactHref?: string;
  profileHref: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  const profile = toProfile(applicant, roleName);
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/45 backdrop-blur-[2px] print:hidden" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Hồ sơ ${applicant.talent.full_name}`}
        onClick={e => e.stopPropagation()}
        className="dv-slide-in-right flex h-full w-full max-w-[1080px] flex-col bg-[var(--dv-bg-alt)] shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-black/[0.06] bg-white/90 px-3 py-2.5 backdrop-blur md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-white hover:bg-black">
              <X className="h-5 w-5" />
            </button>
            <p className="truncate text-[14px] font-semibold">Ứng tuyển vai {roleName}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDecide && (
              <div className="w-[264px]">
                <DecisionButtons value={decision} onChange={onDecide} compact />
              </div>
            )}
            {profileHref && (
              <Link href={profileHref} target="_blank" rel="noopener" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[14px] text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)] md:inline-flex">
                Tab mới <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <TalentProfileBody talent={profile} partner={limited ? null : (applicant.talent as unknown as PartnerTalent)} contactHref={contactHref} />
        </div>
      </div>
    </div>
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

/** Các self-tape diễn viên gửi kèm đơn (tick từ thư viện + link dán thêm), bỏ trùng. */
function tapesOf(a: ProducerApplicant['application']): string[] {
  return Array.from(new Set([...(a.selftape_urls || []), a.selftape_url || ''].filter(Boolean)));
}

function SelftapeButtons({ urls, compact }: { urls: string[]; compact?: boolean }) {
  return (
    <>
      {urls.map((u, i) => (
        <SelftapeButton key={u} url={u} compact={compact} label={urls.length > 1 ? `Self-tape ${i + 1}` : 'Self-tape'} />
      ))}
    </>
  );
}

function SelftapeButton({ url, compact, label = 'Self-tape' }: { url: string; compact?: boolean; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--dv-accent)] font-medium text-white hover:bg-[var(--dv-accent-hover)] ${compact ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[14px]'}`}
    >
      <Video className="h-4 w-4" /> {label}
    </a>
  );
}

/* ---------- Dạng lưới: ảnh → chỉ số → kinh nghiệm & kỹ năng → hành động; thông tin phụ trong "Chi tiết" ---------- */
export function ApplicantCard({
  applicant,
  profileHref,
  limited = false,
  contactHref
}: {
  applicant: ProducerApplicant;
  profileHref?: string | null;
  limited?: boolean;
  contactHref?: string;
}) {
  const d = derive(applicant);
  const { t } = d;
  const [photo, setPhoto] = useState(d.photos[0]?.url || '');
  const [open, setOpen] = useState(false);
  const stats: [string, string | null][] = [
    ['Tuổi', d.age !== null ? String(d.age) : t.age_range || null],
    ['Cao (cm)', t.height_cm ? `${t.height_cm}` : null],
    ['Nặng (kg)', t.weight_kg ? `${t.weight_kg}` : null],
    ...(d.measurements ? ([['Số đo', d.measurements]] as [string, string][]) : [])
  ];
  // Bản công khai: định hướng & mức độ sẵn sàng hiện luôn trên thẻ thay cho chỉ số ngoại hình
  const showWillingInline = false;
  const hasDetails = d.training.length || (!showWillingInline && (d.willingness.length || d.workCities.length)) || d.note || d.socials.length || t.email || t.shoe_size || d.credits.length > 2;

  return (
    <li className="flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] break-inside-avoid print:border print:border-[#e8e8ed] print:shadow-none">
      {(
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
        {t.act && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center rounded-full bg-[#1d1d1f]/85 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-white backdrop-blur">
            ACT Academy
          </span>
        )}
        {tapesOf(d.application).length > 0 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold shadow-sm">
            <Video className="h-3.5 w-3.5" /> {tapesOf(d.application).length > 1 ? `${tapesOf(d.application).length} self-tape` : 'Có self-tape'}
          </span>
        )}
      </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Name name={t.full_name} href={limited ? null : profileHref} className="text-[18px] font-semibold leading-[1.22]" />
          {(
            <span className="shrink-0 rounded-full bg-[var(--dv-bg-alt)] px-2 py-0.5 text-[11px] font-semibold tracking-[0.03em] text-[var(--dv-text-secondary)]">
              {profileCode(t.id)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-[var(--dv-text-secondary)]">{[d.gender, t.city ? provinceLabel(t.city) : null].filter(Boolean).join(' · ')}</p>

        {/* Chỉ số ngoại hình: đọc lướt theo cột (bản công khai không có tuổi, số đo 3 vòng) */}
        {(
        <dl className={`mt-3 grid ${stats.length > 3 ? 'grid-cols-[0.8fr_0.9fr_0.9fr_1.7fr]' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 rounded-[12px] bg-[var(--dv-bg-alt)] px-2 py-2 text-center`}>
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
          <div className="flex flex-wrap items-center gap-2">
            <SelftapeButtons urls={tapesOf(d.application)} />
            {(contactHref || !t.phone) && <ContactButton code={profileCode(t.id)} href={contactHref} />}
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
export function ApplicantRow({
  applicant,
  profileHref,
  limited = false,
  contactHref
}: {
  applicant: ProducerApplicant;
  profileHref?: string | null;
  limited?: boolean;
  contactHref?: string;
}) {
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
        <p className="truncate text-[13px] text-[var(--dv-text-secondary)]">{[d.gender, t.act ? 'ACT Academy' : null, t.city ? provinceLabel(t.city) : null].filter(Boolean).join(' · ')}</p>
      </div>
      <p className="col-start-2 flex flex-wrap gap-x-2 text-[13px] md:col-start-auto md:text-[14px]">
        {[d.age !== null ? `${d.age} tuổi` : t.age_range ? `${t.age_range} tuổi` : null, t.height_cm ? `${t.height_cm} cm` : null, t.weight_kg ? `${t.weight_kg} kg` : null, d.measurements]
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
        <SelftapeButtons urls={tapesOf(d.application)} compact />
        {(contactHref || !t.phone) && <ContactButton code={profileCode(t.id)} href={contactHref} compact />}
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

/**
 * Nút "Liên hệ" trên thẻ diễn viên. Chưa đăng nhập: dẫn tới đăng ký tài khoản đối tác (xem đầy đủ sau khi được duyệt).
 * Đối tác đã duyệt: thẻ hiện thẳng SĐT; nút này chỉ hiện khi hồ sơ không có SĐT → liên hệ qua DienVienVN.
 */
function ContactButton({ code, href, compact = false }: { code: string; href?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const cls = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1d1d1f] font-semibold hover:bg-[#1d1d1f] hover:text-white print:hidden ${
    compact ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-[14px]'
  }`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Mail className="h-3.5 w-3.5" /> Liên hệ
      </Link>
    );
  }
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className={cls} aria-expanded={open}>
        <Mail className="h-3.5 w-3.5" /> Liên hệ
      </button>
      {open && (
        <span role="status" className="absolute bottom-full left-0 z-10 mb-2 w-[240px] rounded-[12px] bg-[#1d1d1f] p-3 text-[13px] leading-[1.4] text-white shadow-lg">
          Hồ sơ chưa có số điện thoại. Gửi mã hồ sơ <span className="font-semibold">{code}</span> cho đội ngũ DienVienVN để được kết nối với diễn viên.
        </span>
      )}
    </span>
  );
}

/** Mô tả vai dưới tên vai: tối đa 3 dòng + "Xem thêm"; bản in hiện đầy đủ. */
function RoleDescription({ text }: { text: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <div className="-mt-1 mb-5 max-w-[70ch]">
      <p ref={ref} className={`whitespace-pre-line text-[15px] leading-[1.5] text-[var(--dv-text-secondary)] ${open ? '' : 'line-clamp-3 print:line-clamp-none'}`}>
        {text}
      </p>
      {(long || open) && (
        <button type="button" onClick={() => setOpen(o => !o)} className="mt-1 text-[14px] font-medium text-[var(--dv-text)] underline underline-offset-2 print:hidden">
          {open ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
