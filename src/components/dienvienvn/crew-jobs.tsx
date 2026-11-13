'use client';

import Link from 'next/link';
import { BriefcaseBusiness } from 'lucide-react';
import { companyLine, jdSummary, jobFacts, jobTags, jobTitle } from './crew-job-view';
import { PublicCrewJob, crewJobPath } from '@/lib/dienvienvn/crew-jobs';
import { ATTACH_REQUIREMENTS, attachRequirementOf } from '@/lib/dienvienvn/crew-profiles';
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

/** Thẻ tin: bấm cả thẻ để mở trang chi tiết. Tiêu đề + dòng phụ, 3 thông tin chính, tóm tắt 1 câu, số lượng & hạn nộp bên phải. */
function CrewJobCard({ job, crew = false }: { job: PublicCrewJob; crew?: boolean }) {
  const href = useDvvnHref();
  const path = href(crewJobPath(job));
  const title = jobTitle(job);
  const facts = jobFacts(job).filter(f => ['salary', 'time', 'place'].includes(f.key));
  const tags = jobTags(job);
  const summary = jdSummary(job.description);
  return (
    <li className="dv-card group relative p-6 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--dv-text-tertiary)]">{companyLine(job)}</p>
          <h2 className="dv-display mt-1.5 text-[22px] font-semibold leading-[1.2] md:text-[24px]">
            {/* Cả thẻ bấm được: link phủ toàn thẻ */}
            <Link href={path} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none group-hover:underline group-hover:underline-offset-4">
              {title.main}
            </Link>
          </h2>
          {title.sub && <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">{title.sub}</p>}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[13px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
          {facts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
              {facts.map(f => (
                <span key={f.key} className="inline-flex items-center gap-1.5">
                  <f.icon className="h-4 w-4 shrink-0 text-[var(--dv-text-tertiary)]" /> {f.value}
                </span>
              ))}
            </div>
          )}
          {summary && <p className="mt-4 line-clamp-2 max-w-[70ch] text-[14.5px] leading-[1.55] text-[var(--dv-text-secondary)]">{summary}</p>}
        </div>
        <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 md:w-[190px] md:flex-col md:items-end">
          {job.quantity ? <span className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[13px] font-semibold text-white">Cần {job.quantity} người</span> : null}
          {job.deadline && <span className="text-[13px] text-[var(--dv-text-secondary)]">Hạn {formatVnDate(job.deadline)}</span>}
          {attachRequirementOf(job) !== 'none' && (
            <span className="text-[13px] text-[var(--dv-text-secondary)]">{ATTACH_REQUIREMENTS.find(r => r.id === attachRequirementOf(job))?.short}</span>
          )}
          <span className="dv-btn dv-btn-primary pointer-events-none mt-1 !h-10 !py-0 text-[14px] md:mt-3">{crew ? 'Xem & ứng tuyển' : 'Xem tin'}</span>
        </div>
      </div>
    </li>
  );
}
