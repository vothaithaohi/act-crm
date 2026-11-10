'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronDown, Coins, MapPin } from 'lucide-react';
import {
  COMPANY_TYPES,
  CREW_PROJECT_TYPES,
  EMPLOYMENT_TYPES,
  PROJECT_PHASES,
  SALARY_TYPES,
  SENIORITY_LEVELS,
  WORK_CITIES,
  WORK_MODES,
  OTHER_ID,
  departmentOf,
  labelOf,
  roleLabel
} from '@/lib/dienvienvn/crew-taxonomy';
import { PublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { useDvvnHref } from './base-path';
import { formatVnDate } from './projects-section';
import { GlobalNav, SiteFooter } from './site-chrome';

/** Trang công khai: tin tuyển ekip đang mở. Người xem liên hệ trực tiếp với bên đăng tin. */
export function CrewJobBoard({ jobs }: { jobs: PublicCrewJob[] }) {
  const href = useDvvnHref();
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-10 md:pt-16">
        <div className="mx-auto max-w-[980px]">
          <h1 className="dv-display dv-headline">Tuyển dụng ekip.</h1>
          <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">
            Ekip audition, trường quay và hậu kỳ cho các dự án trên DienVienVN. Tạo hồ sơ ekip một lần, ứng tuyển các tin phù hợp.
          </p>

          <section className="mt-8 flex flex-col gap-4 rounded-[18px] bg-[#1d1d1f] p-6 text-white sm:flex-row sm:items-center sm:justify-between md:p-7">
            <div>
              <p className="text-[19px] font-semibold">Bạn cần tuyển ekip?</p>
              <p className="mt-1 text-[14px] leading-[1.45] text-white/70">
                Đối tác DienVienVN đăng tin miễn phí, tin hiện sau khi được duyệt. Chưa có tài khoản? Đăng ký đối tác hoặc liên hệ DienVienVN để
                được hỗ trợ.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={href('/doi-tac/tuyen-dung/moi')} className="dv-btn dv-btn-light !h-10 !py-0 text-[14px]">
                Đăng tin tuyển ekip
              </Link>
              <Link
                href={href(`/doi-tac/dang-ky?next=${encodeURIComponent(href('/doi-tac/tuyen-dung/moi'))}`)}
                className="dv-btn !h-10 border border-white/40 !py-0 text-[14px] text-white hover:bg-white/10"
              >
                Đăng ký đối tác
              </Link>
            </div>
          </section>

          {jobs.length === 0 ? (
            <div className="dv-card mt-6 p-10 text-center">
              <BriefcaseBusiness className="mx-auto h-9 w-9 text-[var(--dv-text-tertiary)]" strokeWidth={1.4} />
              <p className="mt-4 text-[19px] font-semibold">Chưa có tin tuyển dụng nào.</p>
              <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Các tin mới sẽ xuất hiện tại đây khi được DienVienVN duyệt.</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {jobs.map(j => (
                <CrewJobCard key={j.id} job={j} />
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

const fmtMoney = (n?: number | null) => (n ? n.toLocaleString('vi-VN') : '');

/** Thù lao theo Form A: "1.500.000 – 2.500.000 VND/ngày" hoặc "Thỏa thuận". */
function salaryText(job: PublicCrewJob): string {
  if (!job.salary_type) return job.compensation || '';
  if (job.salary_type === 'negotiable') return 'Thỏa thuận theo năng lực';
  const unit = { per_day: 'VND/ngày', per_project: 'VND/dự án', per_month: 'VND/tháng' }[job.salary_type] || 'VND';
  const [lo, hi] = [fmtMoney(job.salary_min), fmtMoney(job.salary_max)];
  const range = lo && hi ? `${lo} – ${hi}` : lo ? `Từ ${lo}` : hi ? `Đến ${hi}` : '';
  return range ? `${range} ${unit}` : labelOf(SALARY_TYPES, job.salary_type);
}

function CrewJobCard({ job }: { job: PublicCrewJob }) {
  const href = useDvvnHref();
  const [open, setOpen] = useState(false);
  const formA = !!job.role_title;
  const role = roleLabel(job.department, job.role_title, job.role_other);
  const dates = [job.start_date ? formatVnDate(job.start_date) : '', job.end_date ? formatVnDate(job.end_date) : ''].filter(Boolean).join(' → ');
  const place = [labelOf(WORK_CITIES, job.city), job.location_detail].filter(Boolean).join(' · ');
  const facts = (
    formA
      ? [
          place ? { icon: MapPin, text: place } : null,
          dates || job.shooting_days ? { icon: CalendarDays, text: [dates, job.shooting_days ? `${job.shooting_days} ngày quay` : ''].filter(Boolean).join(' · ') } : null,
          salaryText(job) ? { icon: Coins, text: salaryText(job) } : null
        ]
      : [
          job.location ? { icon: MapPin, text: job.location } : null,
          job.work_time ? { icon: CalendarDays, text: job.work_time } : null,
          job.compensation ? { icon: Coins, text: job.compensation } : null
        ]
  ).filter(Boolean) as { icon: typeof MapPin; text: string }[];
  const tags = formA
    ? [
        job.department === OTHER_ID ? '' : departmentOf(job.department)?.label,
        labelOf(SENIORITY_LEVELS, job.seniority_level).split(' (')[0],
        labelOf(EMPLOYMENT_TYPES, job.employment_type).split(' (')[0],
        labelOf(WORK_MODES, job.work_mode)
      ].filter(Boolean)
    : job.positions;
  const project = formA
    ? [job.project_name || (job.project_type ? 'Dự án bảo mật' : ''), labelOf(CREW_PROJECT_TYPES, job.project_type).split(' (')[0], labelOf(PROJECT_PHASES, job.project_phase).split(' (')[0]]
        .filter(Boolean)
        .join(' · ')
    : '';
  return (
    <li className="dv-card p-6 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {job.company && (
            <p className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">
              {job.company}
              {job.company_type ? <span className="font-normal"> · {labelOf(COMPANY_TYPES, job.company_type).split(' (')[0]}</span> : null}
            </p>
          )}
          <h2 className="dv-display mt-0.5 text-[22px] font-semibold leading-[1.2] md:text-[24px]">{formA && role ? role.vi : job.title}</h2>
          {formA && role?.en && <p className="mt-0.5 text-[14px] text-[var(--dv-text-secondary)]">{role.en}</p>}
          {project && <p className="mt-2 text-[14px]">{project}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map(p => (
              <span key={p} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[13px] font-medium">
                {p}
              </span>
            ))}
          </div>
          {facts.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[var(--dv-text-secondary)]">
              {facts.map(f => (
                <span key={f.text} className="inline-flex items-center gap-1.5">
                  <f.icon className="h-4 w-4 shrink-0" /> {f.text}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          {job.deadline && <p className="text-[13px] text-[var(--dv-text-secondary)]">Hạn {formatVnDate(job.deadline)}</p>}
          <Link href={href(`/tuyen-dung/ung-tuyen/${job.id}`)} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
            Ứng tuyển
          </Link>
          {job.requires_cv && <p className="text-[13px] font-medium text-[var(--dv-text-secondary)]">Yêu cầu gửi kèm portfolio/CV</p>}
        </div>
      </div>

      {!formA && job.description && (
        <div className="mt-4 border-t border-[#f0f0f2] pt-4">
          {job.description && (
            <>
              <p className={`whitespace-pre-line text-[15px] leading-[1.5] ${open ? '' : 'line-clamp-3'}`}>{job.description}</p>
              {job.description.length > 180 && (
                <button type="button" onClick={() => setOpen(v => !v)} className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold" aria-expanded={open}>
                  {open ? 'Thu gọn' : 'Xem thêm'} <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
