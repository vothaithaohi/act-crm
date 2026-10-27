'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Check, ChevronRight, Eye, EyeOff, KeyRound, Loader2, LogOut, Pencil, UserRound } from 'lucide-react';
import { actorClient, actorFetch, signOutActor, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { PublicProject, isDeadlinePassed, projectSlug, projectTypeLabel } from '@/lib/projects/types';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { useDvvnHref } from './base-path';
import { Field, TextInput } from './form-fields';
import { formatVnDate } from './projects-section';
import { GlobalNav } from './site-chrome';

const MIN_PASSWORD = 8;

/** Chỉ cho chuyển hướng nội bộ (tránh open redirect). */
function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function Shell({ children, narrow = true }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <>
      <GlobalNav />
      <main className="min-h-[calc(100vh-44px)] bg-[var(--dv-bg-alt)] px-4 py-10 md:py-16">
        <div className={`mx-auto ${narrow ? 'max-w-[460px]' : 'max-w-[980px]'}`}>{children}</div>
      </main>
    </>
  );
}

function Notice({ tone = 'error', children }: { tone?: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-[12px] p-3.5 text-[14px] leading-[1.43] ${
        tone === 'error' ? 'bg-[#fff0f0] text-[#b00020]' : 'bg-[var(--dv-bg-alt)] text-[var(--dv-text)]'
      }`}
    >
      {tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
    </div>
  );
}

function Unavailable() {
  return (
    <Shell>
      <div className="dv-card p-8 text-center">
        <h1 className="dv-display text-[28px] font-semibold">Chưa mở tài khoản.</h1>
        <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
          Hệ thống tài khoản diễn viên chưa được kết nối. Vui lòng quay lại sau.
        </p>
      </div>
    </Shell>
  );
}

/* ---------------- Màn hình yêu cầu đăng nhập ---------------- */
export function LoginGate({ title, description, next, partner = false }: { title: string; description: string; next: string; partner?: boolean }) {
  const href = useDvvnHref();
  return (
    <Shell>
      <div className="dv-card px-6 py-10 text-center sm:px-10">
        <KeyRound className="mx-auto h-10 w-10 text-[var(--dv-text)]" strokeWidth={1.4} />
        <h1 className="dv-display mt-5 text-[28px] font-semibold leading-[1.14]">{title}</h1>
        <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">{description}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href={href(`/dang-nhap?next=${encodeURIComponent(next)}`)} className="dv-btn dv-btn-primary w-full">
            Đăng nhập
          </Link>
          {!partner && (
            <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-secondary w-full">
              Chưa có hồ sơ? Nộp hồ sơ diễn viên
            </Link>
          )}
        </div>
        {partner && (
          <p className="mt-6 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
            Tài khoản đối tác do DienVienVN cấp cho đạo diễn, nhà sản xuất và đối tác casting. Liên hệ đội ngũ DienVienVN để được cấp tài khoản.
          </p>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- Gửi lại email kích hoạt / quên mật khẩu ---------------- */
function ResendForm({ initialEmail = '', onBack }: { initialEmail?: string; onBack?: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Vui lòng nhập email hợp lệ.');
    setSending(true);
    try {
      const res = await fetch('/api/dienvienvn/account-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Không gửi được email. Vui lòng thử lại.');
      else setSent(true);
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-5">
        <Notice tone="info">
          Nếu <span className="font-semibold">{email.trim()}</span> đã có hồ sơ trên DienVienVN, bạn sẽ nhận được email trong vài phút. Hãy
          kiểm tra cả mục Spam / Quảng cáo.
        </Notice>
        {onBack && (
          <button type="button" onClick={onBack} className="dv-btn dv-btn-secondary w-full">
            Quay lại đăng nhập
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-5" noValidate>
      <p className="text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
        Nhập email bạn đã dùng khi nộp hồ sơ. Chúng tôi sẽ gửi link để kích hoạt tài khoản hoặc đặt lại mật khẩu.
      </p>
      <Field label="Email" required htmlFor="resend-email">
        <TextInput id="resend-email" type="email" inputMode="email" autoComplete="email" placeholder="ban@email.com" value={email} onChange={e => setEmail(e.target.value)} invalid={!!error} />
      </Field>
      {error && <Notice>{error}</Notice>}
      <button type="submit" disabled={sending} className="dv-btn dv-btn-primary w-full">
        {sending && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
        {sending ? 'Đang gửi…' : 'Gửi email'}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} className="dv-btn dv-btn-ghost w-full">
          Quay lại đăng nhập
        </button>
      )}
    </form>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} invalid={invalid} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ---------------- Đăng nhập ---------------- */
export function ActorLogin() {
  const href = useDvvnHref();
  const router = useRouter();
  const params = useSearchParams();
  const session = useActorSession();
  const next = safeNext(params.get('next'), href('/tai-khoan'));
  const forPartner = next.startsWith(href('/doi-tac'));
  const [mode, setMode] = useState<'login' | 'resend'>(params.get('quen-mat-khau') ? 'resend' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.status === 'signed-in') router.replace(next);
  }, [session.status, next, router]);

  if (session.status === 'unavailable') return <Unavailable />;
  if (session.status !== 'signed-out') return <Shell><Spinner /></Shell>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Vui lòng nhập email và mật khẩu.');
    setBusy(true);
    const { error: err } = await actorClient()!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (err) {
      setError(
        /confirm/i.test(err.message)
          ? 'Tài khoản chưa được kích hoạt. Hãy mở email xác nhận, hoặc bấm “Quên mật khẩu / chưa nhận được email” bên dưới.'
          : 'Email hoặc mật khẩu không đúng.'
      );
    }
  };

  return (
    <Shell>
      <div className="dv-card px-6 py-9 sm:px-10">
        <h1 className="dv-display text-[28px] font-semibold leading-[1.14]">{mode === 'login' ? (forPartner ? 'Đăng nhập đối tác.' : 'Đăng nhập.') : 'Nhận lại email.'}</h1>
        {mode === 'login' ? (
          <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
            <Field label="Email" htmlFor="login-email">
              <TextInput id="login-email" type="email" inputMode="email" autoComplete="email" placeholder="ban@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label="Mật khẩu" htmlFor="login-password">
              <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} />
            </Field>
            {error && <Notice>{error}</Notice>}
            <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full">
              {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
            <button type="button" onClick={() => setMode('resend')} className="block w-full text-center text-[14px] text-[var(--dv-text-secondary)] underline underline-offset-2 hover:text-[var(--dv-text)]">
              Quên mật khẩu / chưa nhận được email kích hoạt?
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <ResendForm initialEmail={email} onBack={() => setMode('login')} />
          </div>
        )}
      </div>
      {forPartner ? (
        <p className="mt-6 text-center text-[14px] text-[var(--dv-text-secondary)]">Tài khoản đối tác do DienVienVN cấp.</p>
      ) : (
        <p className="mt-6 text-center text-[14px] text-[var(--dv-text-secondary)]">
          Chưa có hồ sơ?{' '}
          <Link href={href('/nop-ho-so')} className="font-semibold text-[var(--dv-text)] underline underline-offset-2">
            Nộp hồ sơ diễn viên
          </Link>
        </p>
      )}
    </Shell>
  );
}

/* ---------------- Xác nhận email & tạo mật khẩu ---------------- */
type LinkType = 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email';

export function SetPassword() {
  const href = useDvvnHref();
  const router = useRouter();
  const [phase, setPhase] = useState<'verifying' | 'form' | 'invalid' | 'done'>('verifying');
  const [kind, setKind] = useState<'invite' | 'recovery' | 'change'>('invite');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  // Mã xác minh trong link email: chỉ dùng khi người dùng bấm lưu mật khẩu, không dùng lúc mở trang,
  // để trình quét link của Gmail/Outlook (tự mở link trước) không làm link hết hiệu lực.
  const pending = useRef<{ tokenHash: string; type: LinkType } | null>(null);

  useEffect(() => {
    const c = actorClient();
    if (!c) {
      setPhase('invalid');
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const clearUrl = () => window.history.replaceState(null, '', window.location.pathname);
    const type = (query.get('type') || hash.get('type') || '') as LinkType;
    setKind(type === 'recovery' ? 'recovery' : 'invite');

    (async () => {
      // 1) Mẫu email dùng token_hash (khuyến nghị)
      const tokenHash = query.get('token_hash');
      if (tokenHash) {
        pending.current = { tokenHash, type: type || 'invite' };
        clearUrl();
        return setPhase('form');
      }
      // 2) Mẫu email mặc định của Supabase: token trả về trong #hash
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');
      if (access && refresh) {
        const { error: err } = await c.auth.setSession({ access_token: access, refresh_token: refresh });
        clearUrl();
        return setPhase(err ? 'invalid' : 'form');
      }
      if (hash.get('error') || hash.get('error_code') || query.get('error')) {
        setReason(hash.get('error_code') || hash.get('error') || query.get('error') || '');
        clearUrl();
        return setPhase('invalid');
      }
      // 3) Đang đăng nhập sẵn → đổi mật khẩu
      const { data } = await c.auth.getSession();
      if (data.session) {
        setKind('change');
        return setPhase('form');
      }
      setPhase('invalid');
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) return setError(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.`);
    if (password !== confirm) return setError('Hai mật khẩu chưa khớp nhau.');
    setBusy(true);
    const c = actorClient()!;
    if (pending.current) {
      const { tokenHash, type } = pending.current;
      const { error: verifyErr } = await c.auth.verifyOtp({ token_hash: tokenHash, type: type as 'invite' });
      if (verifyErr) {
        setBusy(false);
        setReason(verifyErr.message);
        return setPhase('invalid');
      }
      pending.current = null;
    }
    const { error: err } = await c.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(/different|same/i.test(err.message) ? 'Mật khẩu mới phải khác mật khẩu cũ.' : 'Không lưu được mật khẩu. Link có thể đã hết hạn — vui lòng yêu cầu email mới.');
      return;
    }
    setPhase('done');
    window.setTimeout(() => router.replace(href('/tai-khoan')), 1200);
  };

  const title = kind === 'recovery' ? 'Đặt lại mật khẩu.' : kind === 'change' ? 'Đổi mật khẩu.' : 'Xác nhận tài khoản.';

  return (
    <Shell>
      <div className="dv-card px-6 py-9 sm:px-10">
        {phase === 'verifying' && <Spinner />}

        {phase === 'invalid' && (
          <>
            <h1 className="dv-display text-[28px] font-semibold leading-[1.14]">Link đã hết hạn.</h1>
            <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
              Link trong email chỉ dùng được một lần, trong vòng 1 giờ, và chỉ <strong>email mới nhất</strong> còn hiệu lực. Nhập email để nhận link mới, rồi mở link trong email mới nhất.
            </p>
            {reason && <p className="mt-2 text-[12px] text-[var(--dv-text-tertiary)]">Mã lỗi: {reason}</p>}
            <div className="mt-6">
              <ResendForm />
            </div>
          </>
        )}

        {phase === 'form' && (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <h1 className="dv-display text-[28px] font-semibold leading-[1.14]">{title}</h1>
              <p className="mt-2 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
                {kind === 'invite'
                  ? 'Email của bạn đã được xác nhận. Tạo mật khẩu để đăng nhập, chỉnh sửa hồ sơ và ứng tuyển các dự án đang casting.'
                  : `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.`}
              </p>
            </div>
            <Field label="Mật khẩu mới" required htmlFor="new-password" hint={`Ít nhất ${MIN_PASSWORD} ký tự.`}>
              <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={setPassword} invalid={!!error && password.length < MIN_PASSWORD} />
            </Field>
            <Field label="Nhập lại mật khẩu" required htmlFor="confirm-password">
              <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={setConfirm} invalid={!!error && password !== confirm} />
            </Field>
            {error && <Notice>{error}</Notice>}
            <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full">
              {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
              {busy ? 'Đang lưu…' : kind === 'invite' ? 'Tạo mật khẩu' : 'Lưu mật khẩu'}
            </button>
          </form>
        )}

        {phase === 'done' && (
          <div className="py-6 text-center">
            <Check className="mx-auto h-10 w-10" strokeWidth={2.5} />
            <p className="dv-display mt-4 text-[24px] font-semibold" role="status">
              Đã lưu mật khẩu.
            </p>
            <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Đang chuyển tới tài khoản của bạn…</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- Tài khoản của tôi ---------------- */
interface AccountData {
  profile: {
    id: string;
    full_name: string;
    email: string;
    headshot_url: string | null;
    review_status: 'pending' | 'approved' | 'rejected';
    username: string | null;
    public_profile: boolean;
  };
  applications: { id: string; project_id: string; project_name: string; role_name: string; created_at?: string }[];
}

const REVIEW_LABEL: Record<AccountData['profile']['review_status'], string> = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Chưa được duyệt'
};

export function ActorAccount() {
  const href = useDvvnHref();
  const router = useRouter();
  const params = useSearchParams();
  const session = useActorSession();
  const [data, setData] = useState<AccountData | null>(null);
  const [problem, setProblem] = useState('');
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const saved = params.get('da-luu') === '1';

  useEffect(() => {
    if (session.status === 'signed-out') router.replace(href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan'))}`));
    if (session.status !== 'signed-in') return;
    let cancelled = false;
    (async () => {
      const res = await actorFetch('/api/dienvienvn/me');
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.status === 401) {
        await signOutActor();
        return;
      }
      if (!res.ok) return setProblem(body.error || 'Không tải được hồ sơ.');
      if (body.partner) return router.replace(href('/doi-tac'));
      setData(body);
      fetchPublicProjects()
        .then(list => !cancelled && setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
        .catch(() => !cancelled && setProjects([]));
    })().catch(() => !cancelled && setProblem('Mất kết nối mạng. Vui lòng tải lại trang.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  if (session.status === 'unavailable') return <Unavailable />;

  const logout = async () => {
    await signOutActor();
    router.replace(href('/'));
  };

  if (problem) {
    return (
      <Shell>
        <div className="dv-card p-8 text-center">
          <p className="text-[15px] leading-[1.47]">{problem}</p>
          <button type="button" onClick={logout} className="dv-btn dv-btn-secondary mt-6">
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      </Shell>
    );
  }
  if (!data) return <Shell><Spinner /></Shell>;

  const { profile, applications } = data;
  const code = `DV-${profile.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  const appliedProjects = new Set(applications.map(a => a.project_id));

  return (
    <Shell narrow={false}>
      <h1 className="dv-display text-[32px] font-semibold leading-[1.125] md:text-[40px]">Xin chào, {profile.full_name.split(' ').slice(-1)[0]}.</h1>
      {saved && (
        <div className="mt-5 md:max-w-[560px]">
          <Notice tone="info">Đã lưu thay đổi hồ sơ của bạn.</Notice>
        </div>
      )}

      <section className="dv-card mt-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="h-[88px] w-[68px] shrink-0 overflow-hidden rounded-[12px] bg-[#e8e8ed]">
            {profile.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.headshot_url} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#aeaeb2]">
                <UserRound className="h-8 w-8" strokeWidth={1.4} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[19px] font-semibold leading-[1.21]">{profile.full_name}</p>
            <p className="mt-0.5 truncate text-[14px] text-[var(--dv-text-secondary)]">{profile.email}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-full bg-[var(--dv-bg-alt)] px-2.5 py-1 font-semibold tracking-[0.04em]">{code}</span>
              <span className={`rounded-full px-2.5 py-1 ${profile.review_status === 'approved' ? 'bg-[#1d1d1f] text-white' : 'bg-[var(--dv-bg-alt)] text-[var(--dv-text-secondary)]'}`}>
                {REVIEW_LABEL[profile.review_status]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Link href={href('/tai-khoan/ho-so')} className="dv-btn dv-btn-primary">
            <Pencil className="h-4 w-4" /> Chỉnh sửa hồ sơ
          </Link>
          <div className="flex gap-2">
            <Link href={href('/tao-mat-khau')} className="dv-btn dv-btn-secondary flex-1">
              Đổi mật khẩu
            </Link>
            <button type="button" onClick={logout} className="dv-btn dv-btn-secondary flex-1">
              Đăng xuất
            </button>
          </div>
        </div>
      </section>

      <PublicProfileCard
        username={profile.username}
        isPublic={profile.public_profile}
        approved={profile.review_status === 'approved'}
        onSaved={username => setData(d => (d ? { ...d, profile: { ...d.profile, username } } : d))}
      />

      <h2 className="dv-display mt-12 text-[24px] font-semibold md:text-[28px]">Dự án đang casting</h2>
      {projects === null ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <p className="mt-3 text-[15px] text-[var(--dv-text-secondary)]">Hiện chưa có dự án nào mở. Chúng tôi sẽ email cho bạn khi có vai phù hợp.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {projects.map(p => (
            <Link key={p.id} href={href(`/du-an/${projectSlug(p.display_name, p.code) || p.id}`)} className="group flex flex-col rounded-[18px] bg-white p-6 transition-colors hover:bg-[#fafafa]">
              <span className="flex items-center justify-between gap-3 text-[14px] font-semibold text-[var(--dv-text-secondary)]">
                {projectTypeLabel(p.project_type)}
                {appliedProjects.has(p.id) && <span className="rounded-full bg-[var(--dv-bg-alt)] px-2.5 py-0.5 text-[12px] text-[var(--dv-text)]">Đã ứng tuyển</span>}
              </span>
              <span className="dv-display mt-1 text-[22px] font-semibold leading-[1.18]">{p.display_name}</span>
              <span className="mt-2 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
                {[p.location ? provinceLabel(p.location) : null, p.shooting_time, `${p.roles.length} vai đang tuyển`, p.deadline ? `Hạn nộp ${formatVnDate(p.deadline)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className="dv-link mt-5 text-[15px]">
                Xem vai &amp; ứng tuyển <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="dv-display mt-12 text-[24px] font-semibold md:text-[28px]">Vai đã ứng tuyển</h2>
      {applications.length === 0 ? (
        <p className="mt-3 text-[15px] text-[var(--dv-text-secondary)]">Bạn chưa ứng tuyển vai nào.</p>
      ) : (
        <ul className="dv-card mt-5 divide-y divide-[#f0f0f2]">
          {applications.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{a.project_name}</p>
                <p className="truncate text-[14px] text-[var(--dv-text-secondary)]">Vai {a.role_name}</p>
              </div>
              <span className="shrink-0 text-[13px] text-[var(--dv-text-secondary)]">{a.created_at ? formatVnDate(a.created_at) : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

/* ---------------- Trang hồ sơ công khai (username) ---------------- */
function PublicProfileCard({
  username,
  isPublic,
  approved,
  onSaved
}: {
  username: string | null;
  isPublic: boolean;
  approved: boolean;
  onSaved: (username: string) => void;
}) {
  const href = useDvvnHref();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!username) return null;

  const live = isPublic && approved;
  const save = async () => {
    setError('');
    const next = value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(next)) {
      return setError('3–40 ký tự: chữ thường không dấu, số, "-" hoặc "_", bắt đầu bằng chữ hoặc số.');
    }
    setBusy(true);
    const res = await actorFetch('/api/dienvienvn/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: next })
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) return setError(body.error || 'Không lưu được username. Vui lòng thử lại.');
    onSaved(body.username);
    setEditing(false);
  };

  return (
    <section className="dv-card mt-4 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Trang hồ sơ công khai</p>
          {editing ? (
            <div className="mt-2 flex items-center gap-1 text-[15px]">
              <span className="shrink-0 text-[var(--dv-text-secondary)]">dienvienvn.com/</span>
              <TextInput value={value} onChange={e => setValue(e.target.value.toLowerCase())} aria-label="Username" className="h-10 max-w-[260px]" />
            </div>
          ) : (
            <p className="mt-1 truncate text-[15px] text-[var(--dv-text-secondary)]">
              dienvienvn.com/<span className="font-semibold text-[var(--dv-text)]">{username}</span>
            </p>
          )}
          <p className="mt-1.5 text-[13px] leading-[1.4] text-[var(--dv-text-tertiary)]">
            {live
              ? 'Đang hiển thị công khai: ảnh, nghệ danh, kỹ năng, kinh nghiệm, đào tạo.'
              : !isPublic
                ? 'Đang ẩn. Bật “Hiển thị hồ sơ công khai” trong Chỉnh sửa hồ sơ để mọi người xem được.'
                : 'Sẽ hiển thị sau khi hồ sơ được đội ngũ DienVienVN duyệt.'}
          </p>
          {error && <p className="dv-field-error">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {editing ? (
            <>
              <button type="button" onClick={save} disabled={busy} className="dv-btn dv-btn-primary">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
              </button>
              <button type="button" onClick={() => { setEditing(false); setValue(username); setError(''); }} className="dv-btn dv-btn-secondary">
                Huỷ
              </button>
            </>
          ) : (
            <>
              {live && (
                <Link href={href(`/${username}`)} className="dv-btn dv-btn-secondary">
                  Xem trang
                </Link>
              )}
              <button type="button" onClick={() => setEditing(true)} className="dv-btn dv-btn-secondary">
                Đổi username
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
