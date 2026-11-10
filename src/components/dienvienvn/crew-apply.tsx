'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Loader2, LogOut } from 'lucide-react';
import { actorFetch, signOutActor, useActorSession } from '@/lib/dienvienvn/actor-auth';
import type { PublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { CREW_REVIEW_STATUS, CrewProfile } from '@/lib/dienvienvn/crew-profiles';
import { CREW_PROJECT_TYPES, labelOf, roleLabel } from '@/lib/dienvienvn/crew-taxonomy';
import { useDvvnHref } from './base-path';
import { CrewFormB, CrewProfileFields, crewFormBFrom } from './crew-profile-fields';
import { CrewProfileDetails } from './crew-profile-view';
import { GlobalNav, SiteFooter } from './site-chrome';

type MeApp = { id: string; job_id: string; created_at: string; title: string; company: string; open: boolean };
type Me = { crew: CrewProfile | null; applications?: MeApp[]; email?: string; mode?: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-10 md:pt-16">
        <div className="mx-auto max-w-[780px]">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-[12px] bg-[#fff0f0] p-3 text-[14px] text-[#b00020]">
      {children}
    </p>
  );
}

/** Trạng thái hồ sơ ekip, nói rõ NSX thấy hồ sơ khi nào. */
function ReviewNote({ status }: { status: CrewProfile['review_status'] }) {
  if (status === 'approved') return null;
  return (
    <p className="rounded-[12px] bg-[#fff6e0] p-3 text-[14px] text-[#8c5f2a]">
      {status === 'pending'
        ? 'Hồ sơ ekip đang chờ DienVienVN duyệt. Nhà tuyển dụng sẽ thấy hồ sơ và nhận email báo ngay sau khi hồ sơ được duyệt.'
        : 'Hồ sơ ekip chưa được duyệt. Vui lòng cập nhật hồ sơ để DienVienVN duyệt lại, hoặc liên hệ DienVienVN.'}
    </p>
  );
}

function JobSummary({ job }: { job: PublicCrewJob }) {
  const role = roleLabel(job.department, job.role_title, job.role_other);
  const project = [job.project_name || (job.project_type ? 'Dự án bảo mật' : ''), labelOf(CREW_PROJECT_TYPES, job.project_type).split(' (')[0]].filter(Boolean).join(' · ');
  return (
    <div className="dv-card p-6">
      {job.company && <p className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">{job.company}</p>}
      <p className="dv-display mt-0.5 text-[22px] font-semibold leading-[1.2]">{role?.vi || job.title}</p>
      {project && <p className="mt-1 text-[14px]">{project}</p>}
      {job.requires_cv && <p className="mt-2 text-[13px] font-medium text-[var(--dv-text-secondary)]">Yêu cầu gửi kèm portfolio/CV</p>}
    </div>
  );
}

function useCrewMe(enabled: boolean) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const res = await actorFetch('/api/dienvienvn/crew/me');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error || 'Không tải được hồ sơ.');
      setMe(body as Me);
    } catch {
      setError('Mất kết nối mạng. Vui lòng tải lại trang.');
    }
  }, []);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  return { me, error, reload: load };
}

/** Trang ứng tuyển một tin tuyển ekip: chưa có hồ sơ → Form B; đã có → xác nhận ứng tuyển. */
export function CrewApply({ job }: { job: PublicCrewJob | null }) {
  const href = useDvvnHref();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, error: meError } = useCrewMe(signedIn);
  const [form, setForm] = useState<CrewFormB | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);
  const [done, setDone] = useState<null | { kind: 'created' | 'applied' | 'already'; signedIn: boolean; review?: CrewProfile['review_status'] }>(null);
  const here = job ? href(`/tuyen-dung/ung-tuyen/${job.id}`) : href('/tuyen-dung');
  const loginHref = href(`/dang-nhap?next=${encodeURIComponent(here)}`);

  useEffect(() => {
    if (form) return;
    if (session.status === 'signed-out' || session.status === 'unavailable') setForm(crewFormBFrom(null));
    if (signedIn && me && !me.crew) setForm(crewFormBFrom(null, me.email || session.session.user.email || ''));
  }, [session, signedIn, me, form]);

  if (!job) {
    return (
      <Shell>
        <div className="dv-card p-10 text-center">
          <p className="text-[19px] font-semibold">Tin tuyển dụng đã đóng.</p>
          <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Tin không còn nhận hồ sơ hoặc không tồn tại.</p>
          <Link href={href('/tuyen-dung')} className="dv-btn dv-btn-secondary mt-6">
            Xem tin tuyển dụng khác
          </Link>
        </div>
      </Shell>
    );
  }

  const back = (
    <Link href={href('/tuyen-dung')} className="dv-link text-[14px]">
      <ChevronLeft className="h-4 w-4" /> Tuyển dụng ekip
    </Link>
  );

  if (done) {
    return (
      <Shell>
        {back}
        <div className="dv-card mt-6 p-8 text-center md:p-10">
          <Check className="mx-auto h-10 w-10" strokeWidth={2.5} />
          <h1 className="dv-display mt-4 text-[26px] font-semibold">{done.kind === 'already' ? 'Bạn đã ứng tuyển tin này.' : 'Đã ứng tuyển.'}</h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">
            {done.kind === 'created' && !done.signedIn
              ? 'Hồ sơ ekip đã được gửi. Mở email DienVienVN vừa gửi để xác thực tài khoản và tạo mật khẩu. Hồ sơ sẽ được DienVienVN duyệt trước khi gửi tới nhà tuyển dụng.'
              : done.review === 'approved'
              ? 'Nhà tuyển dụng đã nhận được hồ sơ của bạn và sẽ liên hệ trực tiếp nếu phù hợp.'
              : 'Hồ sơ ekip đang chờ DienVienVN duyệt. Nhà tuyển dụng sẽ thấy hồ sơ ngay sau khi được duyệt.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={href('/tuyen-dung')} className="dv-btn dv-btn-secondary">
              Xem tin khác
            </Link>
            {(done.signedIn || done.kind !== 'created') && (
              <Link href={href('/tai-khoan/ekip')} className="dv-btn dv-btn-primary">
                Tài khoản ekip
              </Link>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  if (session.status === 'loading' || (signedIn && !me && !meError)) return <Shell><Spinner /></Shell>;

  // Đã có hồ sơ: xác nhận ứng tuyển
  if (signedIn && me?.crew) {
    const crew = me.crew;
    const applied = (me.applications || []).some(a => a.job_id === job.id);
    const apply = async () => {
      setError('');
      setBusy(true);
      try {
        const res = await actorFetch('/api/dienvienvn/crew/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: job.id }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setError(body.error || 'Không gửi được ứng tuyển. Vui lòng thử lại.');
        setDone({ kind: body.applied === 'already' ? 'already' : 'applied', signedIn: true, review: body.review_status || crew.review_status });
      } catch {
        setError('Mất kết nối mạng. Vui lòng thử lại.');
      } finally {
        setBusy(false);
      }
    };
    return (
      <Shell>
        {back}
        <h1 className="dv-display dv-headline mt-4">Ứng tuyển.</h1>
        <div className="mt-6 space-y-4">
          <JobSummary job={job} />
          <ReviewNote status={crew.review_status} />
          <div className="dv-card p-6">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--dv-text-secondary)]">Hồ sơ ekip của bạn</p>
            <CrewProfileDetails p={crew} compact />
            <Link href={href('/tai-khoan/ekip')} className="dv-link mt-4 text-[14px]">
              Sửa hồ sơ
            </Link>
          </div>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="mt-6 flex justify-end">
          {applied ? (
            <p className="rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold">Bạn đã ứng tuyển tin này</p>
          ) : (
            <button type="button" onClick={apply} disabled={busy || crew.review_status === 'rejected'} className="dv-btn dv-btn-primary">
              {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Xác nhận ứng tuyển
            </button>
          )}
        </div>
      </Shell>
    );
  }

  if (meError && signedIn) {
    return (
      <Shell>
        {back}
        <ErrorBox>{meError}</ErrorBox>
      </Shell>
    );
  }
  if (!form) return <Shell><Spinner /></Shell>;

  // Chưa có hồ sơ: điền Form B rồi ứng tuyển luôn
  const submit = async () => {
    setError('');
    setExists(false);
    setBusy(true);
    try {
      const res = await actorFetch('/api/dienvienvn/crew/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: form, job_id: job.id })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExists(!!body.exists);
        return setError(body.error || 'Không gửi được hồ sơ. Vui lòng thử lại.');
      }
      setDone({ kind: 'created', signedIn, review: 'pending' });
      window.scrollTo({ top: 0 });
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      {back}
      <h1 className="dv-display dv-headline mt-4">Ứng tuyển.</h1>
      <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">Tạo hồ sơ ekip một lần, dùng để ứng tuyển các tin tiếp theo.</p>
      {!signedIn && (
        <p className="mt-3 text-[15px]">
          Đã có hồ sơ ekip?{' '}
          <Link href={loginHref} className="font-semibold underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      )}
      <div className="mt-6 space-y-4">
        <JobSummary job={job} />
        <CrewProfileFields value={form} onChange={setForm} emailLocked={false} />
      </div>
      {error && (
        <ErrorBox>
          {error}
          {exists && !signedIn && (
            <>
              {' '}
              <Link href={loginHref} className="font-semibold underline">
                Đăng nhập
              </Link>
            </>
          )}
        </ErrorBox>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={href('/tuyen-dung')} className="dv-btn dv-btn-secondary">
          Huỷ
        </Link>
        <button type="button" onClick={submit} disabled={busy} className="dv-btn dv-btn-primary">
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Gửi hồ sơ &amp; ứng tuyển
        </button>
      </div>
    </Shell>
  );
}

/** Tài khoản ekip: trạng thái duyệt, xem / sửa hồ sơ Form B, các tin đã ứng tuyển. */
export function CrewAccount() {
  const href = useDvvnHref();
  const router = useRouter();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, error: meError, reload } = useCrewMe(signedIn);
  const [form, setForm] = useState<CrewFormB | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session.status === 'signed-out') router.replace(href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ekip'))}`));
  }, [session.status, router, href]);

  if (session.status === 'unavailable') {
    return (
      <Shell>
        <div className="dv-card p-10 text-center text-[15px]">Tài khoản chưa sẵn sàng ở chế độ xem thử.</div>
      </Shell>
    );
  }
  if (!signedIn || (!me && !meError)) return <Shell><Spinner /></Shell>;
  if (meError) return <Shell><ErrorBox>{meError}</ErrorBox></Shell>;
  const crew = me?.crew;

  const logout = (
    <button
      type="button"
      onClick={async () => {
        await signOutActor();
        router.replace(href('/'));
      }}
      className="dv-link text-[14px]"
    >
      <LogOut className="h-4 w-4" /> Đăng xuất
    </button>
  );

  if (!crew) {
    return (
      <Shell>
        <div className="dv-card p-10 text-center">
          <p className="text-[19px] font-semibold">Tài khoản chưa có hồ sơ ekip.</p>
          <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Chọn một tin tuyển dụng và bấm &ldquo;Ứng tuyển&rdquo; để tạo hồ sơ ekip.</p>
          <Link href={href('/tuyen-dung')} className="dv-btn dv-btn-primary mt-6">
            Xem tin tuyển dụng
          </Link>
          <div className="mt-6 flex justify-center">{logout}</div>
        </div>
      </Shell>
    );
  }

  const save = async () => {
    if (!form) return;
    setError('');
    setBusy(true);
    try {
      const res = await actorFetch('/api/dienvienvn/crew/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: form }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error || 'Không lưu được hồ sơ.');
      setForm(null);
      setSaved(true);
      await reload();
      window.scrollTo({ top: 0 });
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const status = CREW_REVIEW_STATUS[crew.review_status];
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <Link href={href('/tuyen-dung')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Tuyển dụng ekip
        </Link>
        {logout}
      </div>
      <h1 className="dv-display dv-headline mt-4">Tài khoản ekip.</h1>
      <p className="mt-3">
        <span className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${status.badge}`}>Hồ sơ: {status.label}</span>
      </p>
      {saved && !form && <p className="mt-4 rounded-[12px] bg-[#e8f5ec] p-3 text-[14px] text-[#1e6b3a]">Đã lưu hồ sơ.</p>}
      <div className="mt-6 space-y-4">
        <ReviewNote status={crew.review_status} />
        {form ? (
          <>
            <CrewProfileFields value={form} onChange={setForm} emailLocked />
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setForm(null)} className="dv-btn dv-btn-secondary">
                Huỷ
              </button>
              <button type="button" onClick={save} disabled={busy} className="dv-btn dv-btn-primary">
                {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Lưu hồ sơ
              </button>
            </div>
          </>
        ) : (
          <div className="dv-card p-6">
            <CrewProfileDetails p={crew} />
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setForm(crewFormBFrom(crew));
              }}
              className="dv-btn dv-btn-secondary mt-5 !h-10 !py-0 text-[14px]"
            >
              Sửa hồ sơ
            </button>
          </div>
        )}

        <div className="dv-card p-6">
          <p className="text-[19px] font-semibold">Tin đã ứng tuyển</p>
          {(me?.applications || []).length === 0 ? (
            <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Chưa ứng tuyển tin nào.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#f0f0f2]">
              {(me?.applications || []).map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{a.title}</p>
                    <p className="text-[13px] text-[var(--dv-text-secondary)]">
                      {[a.company, `Ứng tuyển ${new Date(a.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`, a.open ? '' : 'Tin đã đóng'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
