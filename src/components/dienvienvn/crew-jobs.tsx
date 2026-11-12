'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ChevronDown, Coins, MapPin, UsersRound } from 'lucide-react';
import { OTHER_ID, departmentOf, jobOptionText, roleLabel } from '@/lib/dienvienvn/crew-taxonomy';
import { PublicCrewJob, crewJobPath } from '@/lib/dienvienvn/crew-jobs';
import { useActorSession } from '@/lib/dienvienvn/actor-auth';
import { useDvvnHref } from './base-path';
import { formatVnDate } from './projects-section';
import { GlobalNav, SiteFooter } from './site-chrome';

/**
 * Trang công khai: tin tuyển ekip đang mở.
 * partner (/tuyen-dung): khung đăng tin cho đối tác. crew (/ekip): khung đăng ký / hồ sơ cho ứng viên ekip.
 */
export function CrewJobBoard({ jobs, variant = 'partner' }: { jobs: PublicCrewJob[]; variant?: 'partner' | 'crew' }) {
  const href = useDvvnHref();
  const crew = variant === 'crew';
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-10 md:pt-16">
        <div className="mx-auto max-w-[980px]">
          <h1 className="dv-display dv-headline">{crew ? 'Việc làm ekip.' : 'Tuyển dụng ekip.'}</h1>

          {crew ? (
            <CrewSignupBox />
          ) : (
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
          )}

          {jobs.length === 0 ? (
            <div className="dv-card mt-6 p-10 text-center">
              <BriefcaseBusiness className="mx-auto h-9 w-9 text-[var(--dv-text-tertiary)]" strokeWidth={1.4} />
              <p className="mt-4 text-[19px] font-semibold">Chưa có tin tuyển dụng nào.</p>
              <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Các tin mới sẽ xuất hiện tại đây khi được DienVienVN duyệt.</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {jobs.map(j => (
                <CrewJobCard key={j.id} job={j} crew={crew} />
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
  const other = job.salary_type === OTHER_ID ? jobOptionText('salary_type', OTHER_ID, job.other_values) : '';
  const unit = { per_day: 'VND/ngày', per_project: 'VND/dự án', per_month: 'VND/tháng' }[job.salary_type] || 'VND';
  const [lo, hi] = [fmtMoney(job.salary_min), fmtMoney(job.salary_max)];
  const range = lo && hi ? `${lo} – ${hi}` : lo ? `Từ ${lo}` : hi ? `Đến ${hi}` : '';
  if (other) return range ? `${range} VND · ${other}` : other;
  return range ? `${range} ${unit}` : jobOptionText('salary_type', job.salary_type, job.other_values);
}

/** Khung cho ứng viên ekip: chưa đăng nhập → đăng ký / đăng nhập; đã đăng nhập → hồ sơ ekip. */
function CrewSignupBox() {
  const href = useDvvnHref();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  return (
    <section className="mt-8 flex flex-col gap-4 rounded-[18px] bg-[#1d1d1f] p-6 text-white sm:flex-row sm:items-center sm:justify-between md:p-7">
      <div>
        <p className="text-[19px] font-semibold">{signedIn ? 'Hồ sơ ekip của bạn' : 'Bạn đang tìm việc ekip?'}</p>
        <p className="mt-1 text-[14px] leading-[1.45] text-white/70">
          {signedIn
            ? 'Cập nhật hồ sơ, quản lý CV và xem các tin đã ứng tuyển.'
            : 'Tạo tài khoản ekip một lần, lưu CV và ứng tuyển nhiều vị trí.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {signedIn ? (
          <Link href={href('/tai-khoan/ekip')} className="dv-btn dv-btn-light !h-10 !py-0 text-[14px]">
            Hồ sơ ekip của tôi
          </Link>
        ) : (
          <>
            <Link href={href('/ekip/dang-ky')} className="dv-btn dv-btn-light !h-10 !py-0 text-[14px]">
              Đăng ký tài khoản ekip
            </Link>
            <Link
              href={href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ekip'))}`)}
              className="dv-btn !h-10 border border-white/40 !py-0 text-[14px] text-white hover:bg-white/10"
            >
              Đăng nhập
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function CrewJobCard({ job, crew = false }: { job: PublicCrewJob; crew?: boolean }) {
  const href = useDvvnHref();
  const [open, setOpen] = useState(false);
  const formA = !!job.role_title;
  const role = roleLabel(job.department, job.role_title, job.role_other);
  const dates = [job.start_date ? formatVnDate(job.start_date) : '', job.end_date ? formatVnDate(job.end_date) : ''].filter(Boolean).join(' → ');
  const t = (f: Parameters<typeof jobOptionText>[0], id?: string | null) => jobOptionText(f, id, job.other_values).split(' (')[0];
  const place = [t('city', job.city), job.location_detail].filter(Boolean).join(' · ');
  const facts = (
    formA
      ? [
          place ? { icon: MapPin, text: place } : null,
          dates || job.shooting_days ? { icon: CalendarDays, text: [dates, job.shooting_days ? `${job.shooting_days} ngày quay` : ''].filter(Boolean).join(' · ') } : null,
          salaryText(job) ? { icon: Coins, text: salaryText(job) } : null,
          job.quantity ? { icon: UsersRound, text: `Cần ${job.quantity} người` } : null
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
        t('seniority_level', job.seniority_level),
        t('employment_type', job.employment_type),
        t('work_mode', job.work_mode)
      ].filter(Boolean)
    : job.positions;
  const project = formA
    ? [job.project_name || (job.project_type ? 'Dự án bảo mật' : ''), t('project_type', job.project_type), t('project_phase', job.project_phase)]
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
              {job.company_type ? <span className="font-normal"> · {t('company_type', job.company_type)}</span> : null}
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
          <Link href={href(crewJobPath(job))} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
            {crew ? 'Ứng tuyển vị trí này' : 'Ứng tuyển'}
          </Link>
          {job.requires_cv && <p className="text-[13px] font-medium text-[var(--dv-text-secondary)]">Yêu cầu gửi kèm CV</p>}
        </div>
      </div>

      {job.description && (
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
