'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Send, Video, X } from 'lucide-react';
import {
  ProjectRole,
  PublicProject,
  isAcceptingApplications,
  projectPathName,
  projectTypeLabel,
  roleSummary
} from '@/lib/projects/types';
import { applyToRole, fetchPublicProject } from '@/lib/projects/public-client';
import { actorFetch, useActorSession } from '@/lib/dienvienvn/actor-auth';
import type { SelfTape } from '@/lib/dienvienvn/selftapes';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { useDvvnHref } from './base-path';
import { Field, TextInput } from './form-fields';
import { formatVnDate } from './projects-section';
import { GlobalNav, SiteFooter } from './site-chrome';

export function ProjectDetail({ projectId }: { projectId: string }) {
  const href = useDvvnHref();
  const [project, setProject] = useState<PublicProject | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [applyRole, setApplyRole] = useState<ProjectRole | null>(null);
  const session = useActorSession();

  // Trang dự án công khai: ai cũng xem được; ứng tuyển cần đăng nhập hoặc nộp hồ sơ mới
  useEffect(() => {
    fetchPublicProject(projectId)
      .then(p => {
        setProject(p);
        // Link cũ (tên thật trước khi bật "Ẩn tên", hoặc tên cũ): đổi địa chỉ sang đường dẫn hiện tại, không lộ tên thật
        const canonical = p ? projectPathName(p.display_name, p.code) || p.id : '';
        if (canonical && decodeURIComponent(projectId).toLowerCase() !== canonical) {
          window.history.replaceState(window.history.state, '', href(`/du-an/${canonical}`) + window.location.search + window.location.hash);
        }
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Không tải được dự án.');
        setProject(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (project === undefined) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[60vh] items-center justify-center bg-[var(--dv-bg-alt)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
        </main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
          <h1 className="dv-display dv-headline">Không tìm thấy dự án.</h1>
          <p className="dv-subhead mt-3 text-[var(--dv-text-secondary)]">{error || 'Dự án có thể đã kết thúc hoặc đường dẫn chưa đúng.'}</p>
          <Link href={href('/')} className="dv-btn dv-btn-primary mt-8">
            Về trang chủ
          </Link>
        </main>
      </>
    );
  }

  const open = isAcceptingApplications(project);
  const facts = [
    { label: 'Địa điểm quay', value: project.location ? provinceLabel(project.location) : null },
    { label: 'Thời gian quay', value: project.shooting_time },
    { label: 'Thù lao', value: project.compensation },
    { label: 'Hạn nộp hồ sơ', value: project.deadline ? formatVnDate(project.deadline) : null }
  ].filter(f => f.value);

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20">
        <div className="mx-auto max-w-[980px] px-4 pt-6 md:px-6 lg:pt-10">
          <Link href={href(session.status === 'signed-in' ? '/tai-khoan' : '/')} className="dv-link text-[14px]">
            <ChevronLeft className="h-4 w-4" /> {session.status === 'signed-in' ? 'Tài khoản của tôi' : 'Trang chủ DienVienVN'}
          </Link>

          <header className="mt-4">
            <p className="text-[17px] font-semibold text-[var(--dv-text-secondary)]">{projectTypeLabel(project.project_type)}</p>
            <h1 className="dv-display dv-hero-headline mt-1">{project.display_name}</h1>
            {project.production_company && (
              <p className="mt-2 text-[17px] text-[var(--dv-text-secondary)]">{project.production_company}</p>
            )}
          </header>

          {/* Hết hạn / đã đóng: không để người xem kẹt lại, dẫn tới dự án khác và đăng nhập / nộp hồ sơ */}
          {!open && (
            <section className="mt-6 rounded-[18px] bg-[#1d1d1f] p-6 text-white md:p-8">
              <p className="dv-display text-[24px] font-semibold leading-[1.17] md:text-[28px]">Dự án đã hết hạn casting.</p>
              <p className="mt-2 text-[15px] leading-[1.47] text-white/70">
                Dự án này không còn nhận hồ sơ. Xem các dự án đang casting khác và ứng tuyển vai phù hợp với bạn.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={href('/du-an')} className="dv-btn dv-btn-light">
                  Xem các dự án casting khác
                </Link>
                {session.status === 'signed-in' ? (
                  <Link href={href('/tai-khoan')} className="dv-btn border border-white/40 text-white hover:bg-white/10">
                    Tài khoản của tôi
                  </Link>
                ) : (
                  <>
                    <Link href={href('/nop-ho-so')} className="dv-btn border border-white/40 text-white hover:bg-white/10">
                      Nộp hồ sơ diễn viên
                    </Link>
                    <Link
                      href={href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan'))}`)}
                      className="inline-flex h-11 items-center justify-center px-3 text-[17px] font-medium text-white underline-offset-4 hover:underline"
                    >
                      Đăng nhập
                    </Link>
                  </>
                )}
              </div>
            </section>
          )}

          {(facts.length > 0 || project.description) && (
            <section className="dv-card mt-8 p-6 md:p-8">
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                  {facts.map(f => (
                    <div key={f.label}>
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{f.label}</dt>
                      <dd className="mt-1 text-[17px] leading-[1.3]">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {project.description && (
                <p className={`whitespace-pre-line text-[17px] leading-[1.47] text-[var(--dv-text)] ${facts.length ? 'mt-6 border-t border-[#f0f0f2] pt-6' : ''}`}>
                  {project.description}
                </p>
              )}
            </section>
          )}

          <section className="mt-6 flex items-start gap-3 rounded-[18px] bg-white p-5 md:p-6">
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dv-accent)]" />
            <div className="text-[15px] leading-[1.47]">
              <p className="font-semibold">{project.selftape_required ? 'Bắt buộc gửi self-tape' : 'Self-tape không bắt buộc'}</p>
              <p className="mt-0.5 whitespace-pre-line text-[var(--dv-text-secondary)]">
                {project.selftape_brief ||
                  (project.selftape_required
                    ? 'Quay một đoạn video thử vai, tải lên YouTube (chế độ không công khai) hoặc Google Drive rồi dán link khi ứng tuyển.'
                    : 'Bạn có thể gửi kèm link video thử vai để tăng cơ hội được chọn.')}
              </p>
            </div>
          </section>

          <h2 className="dv-display mt-12 text-[28px] font-semibold leading-[1.14] tracking-[0.007em] md:text-[32px]">Vai đang tuyển</h2>
          {project.roles.length === 0 ? (
            <p className="mt-4 text-[17px] text-[var(--dv-text-secondary)]">Dự án chưa công bố vai cụ thể.</p>
          ) : (
            <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {project.roles.map(r => (
                <li key={r.id} className="flex flex-col rounded-[18px] bg-white p-6">
                  <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.011em]">{r.name}</p>
                  <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">
                    {[roleSummary(r), r.quantity ? `Cần ${r.quantity} người` : null].filter(Boolean).join(' · ')}
                  </p>
                  {r.description && <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.47]">{r.description}</p>}
                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      disabled={!open}
                      onClick={() => setApplyRole(r)}
                      className={`dv-btn w-full sm:w-auto ${open ? 'dv-btn-primary' : 'dv-btn-muted'}`}
                    >
                      Ứng tuyển vai này
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />

      {applyRole && (
        <ApplySheet
          project={project}
          role={applyRole}
          signedIn={session.status === 'signed-in'}
          canLogin={session.status === 'signed-out'}
          onClose={() => setApplyRole(null)}
        />
      )}
    </>
  );
}

/** Bảng ứng tuyển: bottom sheet trên điện thoại, hộp thoại giữa màn hình trên máy tính. */
function ApplySheet({
  project,
  role,
  signedIn,
  canLogin,
  onClose
}: {
  project: PublicProject;
  role: ProjectRole;
  signedIn: boolean;
  canLogin: boolean;
  onClose: () => void;
}) {
  const href = useDvvnHref();
  const [selftape, setSelftape] = useState('');
  // Self-tape có sẵn trong hồ sơ: diễn viên tick các video phù hợp với dự án
  const [library, setLibrary] = useState<SelfTape[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    actorFetch('/api/dienvienvn/me')
      .then(r => r.json())
      .then(b => !cancelled && Array.isArray(b?.profile?.selftapes) && setLibrary(b.profile.selftapes))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  const togglePick = (url: string) => setPicked(p => (p.includes(url) ? p.filter(x => x !== url) : [...p, url]));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);

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

  const formHref = href(`/nop-ho-so?du-an=${project.id}&vai=${encodeURIComponent(role.id)}`);

  const submit = async () => {
    setError('');
    setAuthRequired(false);
    if (project.selftape_required && !selftape.trim() && picked.length === 0) return setError('Dự án này bắt buộc gửi self-tape: tick self-tape có sẵn hoặc dán link mới.');
    setSubmitting(true);
    try {
      const r = await applyToRole({ project_id: project.id, role_id: role.id, selftape_url: selftape.trim(), selftape_urls: picked, note: note.trim() });
      if (r.ok) setDoneName(r.full_name);
      else {
        setError(r.error);
        setAuthRequired(!!r.authRequired);
      }
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ứng tuyển vai ${role.name}`}
        onClick={e => e.stopPropagation()}
        className="dv-pop max-h-[92vh] w-full overflow-y-auto rounded-t-[22px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 sm:max-w-[520px] sm:rounded-[22px] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">{project.display_name}</p>
            <h2 className="dv-display mt-0.5 text-[24px] font-semibold leading-[1.17]">Ứng tuyển · {role.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-1 rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {doneName !== null ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-[72px] w-[72px]" viewBox="0 0 56 56" aria-hidden="true">
              <circle className="dv-check-circle" cx="28" cy="28" r="26" fill="none" stroke="#1d1d1f" strokeWidth="2.5" />
              <path className="dv-check-mark" d="M17 29.5l7 7 15-16" fill="none" stroke="#1d1d1f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="dv-display mt-5 text-[24px] font-semibold" role="status">
              Đã ứng tuyển thành công.
            </p>
            <p className="mt-2 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
              Cảm ơn {doneName || 'bạn'}. Đội ngũ casting sẽ liên hệ nếu hồ sơ phù hợp với vai {role.name}.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={onClose} className="dv-btn dv-btn-primary">
                Xong
              </button>
              <Link href={href('/tai-khoan')} className="dv-btn dv-btn-secondary">
                Vai đã ứng tuyển
              </Link>
            </div>
          </div>
        ) : !signedIn ? (
          // Chưa đăng nhập: nộp hồ sơ mới kèm vai này, hoặc đăng nhập để ứng tuyển bằng hồ sơ có sẵn
          <div className="mt-6">
            <p className="text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
              Điền hồ sơ diễn viên 7 bước. Vai <span className="font-semibold text-[var(--dv-text)]">{role.name}</span> sẽ được chọn sẵn
              {project.selftape_required ? ', và bạn sẽ dán link self-tape ở bước Hình ảnh.' : '.'}
            </p>
            <Link href={formHref} className="dv-btn dv-btn-primary mt-6 w-full">
              Điền hồ sơ &amp; ứng tuyển <ChevronRight className="h-4 w-4" />
            </Link>
            {canLogin && (
              <p className="mt-4 text-center text-[14px] text-[var(--dv-text-secondary)]">
                Đã có hồ sơ trên DienVienVN?{' '}
                <Link
                  href={href(`/dang-nhap?next=${encodeURIComponent(href(`/du-an/${projectPathName(project.display_name, project.code) || project.id}`))}`)}
                  className="font-semibold text-[var(--dv-text)] underline underline-offset-2"
                >
                  Đăng nhập để ứng tuyển
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
              Hồ sơ diễn viên trong tài khoản của bạn sẽ được gửi tới đội ngũ casting của dự án.{' '}
              <Link href={href('/tai-khoan/ho-so')} className="font-semibold text-[var(--dv-text)] underline underline-offset-2">
                Cập nhật hồ sơ
              </Link>{' '}
              trước khi ứng tuyển nếu cần.
            </p>
            {library.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-[14px] font-semibold">
                  Chọn self-tape phù hợp với dự án{project.selftape_required && <span className="text-[#b00020]"> *</span>}
                </legend>
                <ul className="divide-y divide-[#f0f0f2] rounded-[14px] border border-[#e8e8ed]">
                  {library.map((t, k) => (
                    <li key={t.url}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                        <input type="checkbox" checked={picked.includes(t.url)} onChange={() => togglePick(t.url)} className="h-[18px] w-[18px] shrink-0 accent-[#1d1d1f]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{t.title || `Self-tape ${k + 1}`}</span>
                          <span className="block truncate text-[12px] text-[var(--dv-text-tertiary)]">{t.url}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            <Field
              label={library.length > 0 ? 'Hoặc dán link self-tape mới' : 'Link self-tape'}
              required={project.selftape_required && library.length === 0}
              htmlFor="qa-tape"
              hint="YouTube (không công khai), Google Drive… Nhớ bật quyền xem cho người có link; không để SĐT, email trong tên video."
            >
              <TextInput id="qa-tape" type="url" inputMode="url" placeholder="https://" value={selftape} onChange={e => setSelftape(e.target.value)} />
            </Field>
            <Field label="Lời nhắn cho đội casting" htmlFor="qa-note">
              <TextInput id="qa-note" placeholder="Không bắt buộc" value={note} onChange={e => setNote(e.target.value)} />
            </Field>
            {error && (
              <p role="alert" className="rounded-[12px] bg-[#fff0f0] p-3 text-[14px] leading-[1.43] text-[#b00020]">
                {error}{' '}
                {authRequired && (
                  <Link href={href(`/dang-nhap?next=${encodeURIComponent(href(`/du-an/${project.id}`))}`)} className="font-semibold underline">
                    Đăng nhập lại
                  </Link>
                )}
              </p>
            )}
            <button type="button" onClick={submit} disabled={submitting} className="dv-btn dv-btn-primary w-full">
              {submitting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Đang gửi…' : 'Gửi ứng tuyển'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
