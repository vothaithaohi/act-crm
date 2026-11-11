'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, ExternalLink, FileText, Link2, Loader2, Lock, Star, Trash2, Upload } from 'lucide-react';
import { actorFetch, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { LogoutButton } from './logout-button';
import type { PublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { COVER_LETTER_MAX, CREW_FILE_MAX_BYTES, CREW_MAX_CVS, CrewAttachments, CrewProfile } from '@/lib/dienvienvn/crew-profiles';
import { CREW_PROJECT_TYPES, labelOf, roleLabel } from '@/lib/dienvienvn/crew-taxonomy';
import { useDvvnHref } from './base-path';
import { CrewFormB, CrewProfileFields, crewFormBFrom } from './crew-profile-fields';
import { CrewAttachmentsBlock, CrewProfileDetails } from './crew-profile-view';
import { GlobalNav, SiteFooter } from './site-chrome';

type MeApp = { id: string; job_id: string; created_at: string; title: string; company: string; open: boolean } & Partial<CrewAttachments>;
export type CrewCvItem = {
  id: string;
  title: string;
  kind: 'file' | 'link';
  url: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  is_default: boolean;
  created_at: string;
};
type Me = { crew: CrewProfile | null; cvs?: CrewCvItem[]; applications?: MeApp[]; email?: string; mode?: string };

/** Trang ứng tuyển đang dở (đăng ký / tạo hồ sơ xong thì quay lại tin này). */
const NEXT_KEY = 'dvvn-crew-next';
const readNext = (href: (p: string) => string) => {
  try {
    const v = window.localStorage.getItem(NEXT_KEY) || '';
    return v.startsWith(href('/tuyen-dung/ung-tuyen/')) ? v : '';
  } catch {
    return '';
  }
};
const writeNext = (v: string) => {
  try {
    if (v) window.localStorage.setItem(NEXT_KEY, v);
    else window.localStorage.removeItem(NEXT_KEY);
  } catch {
    /* trình duyệt chặn lưu */
  }
};

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

function LockedNote() {
  return (
    <p className="flex items-start gap-2 rounded-[12px] bg-[#fff6e0] p-3 text-[14px] text-[#8c5f2a]">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.
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
      {job.description && <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.55] text-[var(--dv-text-secondary)]">{job.description}</p>}
      {job.requires_cv && <p className="mt-2 text-[13px] font-medium text-[var(--dv-text-secondary)]">Yêu cầu gửi kèm CV</p>}
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
      setError('');
      setMe(body as Me);
    } catch {
      setError('Mất kết nối mạng. Vui lòng tải lại trang.');
    }
  }, []);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  return { me, setMe, error, reload: load };
}

const sizeText = (n?: number | null) => (n ? (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`) : '');
const vnDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await actorFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/* ---------------- Đăng ký tài khoản ekip ---------------- */

/** /ekip/dang-ky: họ tên + email → email xác nhận & tạo mật khẩu. */
export function CrewSignup() {
  const href = useDvvnHref();
  const router = useRouter();
  const params = useSearchParams();
  const session = useActorSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);
  const [sent, setSent] = useState('');
  const next = params.get('next') || '';

  useEffect(() => {
    if (next.startsWith(href('/tuyen-dung/ung-tuyen/'))) writeNext(next);
  }, [next, href]);
  useEffect(() => {
    if (session.status === 'signed-in') router.replace(href('/tai-khoan/ekip'));
  }, [session.status, router, href]);

  const loginHref = href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ekip'))}`);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExists(false);
    if (name.trim().length < 2) return setError('Vui lòng nhập họ tên.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Email chưa đúng định dạng.');
    setBusy(true);
    try {
      const { ok, data } = await sendJson('/api/dienvienvn/crew/signup', 'POST', { full_name: name.trim(), email: email.trim().toLowerCase(), website });
      if (!ok) {
        setExists(!!data.exists);
        return setError(data.error || 'Không gửi được. Vui lòng thử lại.');
      }
      setSent(email.trim().toLowerCase());
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <div className="dv-card mx-auto max-w-[520px] p-8 text-center md:p-10">
          <Check className="mx-auto h-10 w-10" strokeWidth={2.5} />
          <h1 className="dv-display mt-4 text-[26px] font-semibold">Kiểm tra email của bạn.</h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">
            DienVienVN vừa gửi email tới <span className="font-semibold text-[var(--dv-text)]">{sent}</span>. Bấm link trong email để xác nhận và tạo mật khẩu, sau đó
            hoàn thiện hồ sơ ekip và ứng tuyển.
          </p>
          <p className="mt-3 text-[13px] text-[var(--dv-text-tertiary)]">Không thấy email? Xem thêm trong thư mục Spam / Quảng cáo.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[520px]">
        <Link href={href('/ekip')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Việc làm ekip
        </Link>
        <h1 className="dv-display dv-headline mt-4">Đăng ký tài khoản ekip.</h1>
        <form onSubmit={submit} className="dv-card mt-6 space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="cs-name" className="dv-field-label">
              Họ và tên
            </label>
            <input id="cs-name" className="dv-input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="cs-email" className="dv-field-label">
              Email
            </label>
            <input id="cs-email" type="email" inputMode="email" className="dv-input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {/* Bẫy spam: người dùng thật không thấy ô này */}
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />
          {error && (
            <ErrorBox>
              {error}
              {exists && (
                <>
                  {' '}
                  <Link href={loginHref} className="font-semibold underline">
                    Đăng nhập
                  </Link>
                </>
              )}
            </ErrorBox>
          )}
          <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full">
            {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Gửi email xác nhận
          </button>
          <p className="text-center text-[14px]">
            Đã có tài khoản?{' '}
            <Link href={loginHref} className="font-semibold underline underline-offset-4">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}

/* ---------------- Kho CV ---------------- */

/**
 * Kho CV: thêm file PDF / link, đặt mặc định, xoá.
 * select: dùng khi ứng tuyển — chọn 1 CV gửi kèm (CV mới tải lên tự được chọn).
 */
function CvLibrary({
  cvs,
  onChange,
  select
}: {
  cvs: CrewCvItem[];
  onChange: (cvs: CrewCvItem[]) => void;
  select?: { value: string | null; onSelect: (id: string | null) => void; required: boolean };
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const full = cvs.length >= CREW_MAX_CVS;

  const done = (data: { cvs?: CrewCvItem[]; id?: string; error?: string }, ok: boolean) => {
    if (!ok) return setError(data.error || 'Không lưu được. Vui lòng thử lại.');
    setError('');
    if (data.cvs) onChange(data.cvs);
    if (data.id && select) select.onSelect(data.id);
  };
  const upload = async (file: File) => {
    setError('');
    if (file.type && file.type !== 'application/pdf') return setError('Chỉ nhận file PDF.');
    if (file.size > CREW_FILE_MAX_BYTES) return setError('File vượt quá 4MB.');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name.replace(/\.pdf$/i, '').slice(0, 80));
    setBusy('upload');
    try {
      const res = await actorFetch('/api/dienvienvn/crew/cvs', { method: 'POST', body: fd });
      done(await res.json().catch(() => ({})), res.ok);
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const addLink = async () => {
    setBusy('link');
    try {
      const { ok, data } = await sendJson('/api/dienvienvn/crew/cvs', 'POST', { title: linkTitle.trim() || 'CV', link_url: linkUrl.trim() });
      done(data, ok);
      if (ok) {
        setLinkOpen(false);
        setLinkTitle('');
        setLinkUrl('');
      }
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  };
  const makeDefault = async (id: string) => {
    setBusy(id);
    try {
      const { ok, data } = await sendJson('/api/dienvienvn/crew/cvs', 'PATCH', { id });
      done(data, ok);
    } finally {
      setBusy(null);
    }
  };
  const remove = async (cv: CrewCvItem) => {
    if (!window.confirm(`Xoá CV "${cv.title}" khỏi kho? CV đã gửi cho nhà tuyển dụng vẫn được giữ.`)) return;
    setBusy(cv.id);
    try {
      const { ok, data } = await sendJson(`/api/dienvienvn/crew/cvs?id=${encodeURIComponent(cv.id)}`, 'DELETE');
      done(data, ok);
      if (ok && select?.value === cv.id) select.onSelect(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {cvs.length === 0 ? (
        <p className="rounded-[12px] bg-[var(--dv-bg-alt)] p-4 text-[14px] text-[var(--dv-text-secondary)]">Chưa có CV nào. Tải CV (PDF) hoặc thêm link CV.</p>
      ) : (
        <ul className="space-y-2">
          {select && !select.required && (
            <li>
              <label className={`flex cursor-pointer items-center gap-3 rounded-[14px] border p-3.5 ${select.value === null ? 'border-[#1d1d1f]' : 'border-[#e5e5ea]'}`}>
                <input type="radio" name="crew-cv" checked={select.value === null} onChange={() => select.onSelect(null)} className="h-4 w-4 accent-[#1d1d1f]" />
                <span className="text-[15px]">Không gửi kèm CV</span>
              </label>
            </li>
          )}
          {cvs.map(cv => {
            const picked = select?.value === cv.id;
            const meta = [cv.kind === 'file' ? 'PDF' : 'Link', sizeText(cv.file_size), `Thêm ${vnDate(cv.created_at)}`].filter(Boolean).join(' · ');
            return (
              <li key={cv.id} className={`flex flex-wrap items-center gap-3 rounded-[14px] border p-3.5 ${picked ? 'border-[#1d1d1f]' : 'border-[#e5e5ea]'} bg-white`}>
                <label className={`flex min-w-0 flex-1 items-center gap-3 ${select ? 'cursor-pointer' : ''}`}>
                  {select && <input type="radio" name="crew-cv" checked={picked} onChange={() => select.onSelect(cv.id)} className="h-4 w-4 shrink-0 accent-[#1d1d1f]" />}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--dv-bg-alt)]">
                    {cv.kind === 'file' ? <FileText className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{cv.title}</span>
                      {cv.is_default && <span className="shrink-0 rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[11px] font-semibold text-white">Mặc định</span>}
                    </span>
                    <span className="block truncate text-[13px] text-[var(--dv-text-secondary)]">{meta}</span>
                  </span>
                </label>
                <div className="flex shrink-0 items-center gap-1">
                  {busy === cv.id && <Loader2 className="h-4 w-4 animate-spin text-[var(--dv-text-secondary)]" />}
                  {cv.url && (
                    <a href={cv.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium hover:bg-[var(--dv-bg-alt)]">
                      Xem <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {!select && !cv.is_default && (
                    <button type="button" onClick={() => makeDefault(cv.id)} disabled={!!busy} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium hover:bg-[var(--dv-bg-alt)]">
                      <Star className="h-3.5 w-3.5" /> Đặt mặc định
                    </button>
                  )}
                  {!select && (
                    <button type="button" onClick={() => remove(cv)} disabled={!!busy} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#b00020] hover:bg-[#fff0f0]" aria-label={`Xoá CV ${cv.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      {full ? (
        <p className="mt-3 text-[13px] text-[var(--dv-text-secondary)]">Kho CV đã đủ {CREW_MAX_CVS} CV. Xoá bớt CV cũ trong Tài khoản ekip để thêm CV mới.</p>
      ) : linkOpen ? (
        <div className="mt-3 space-y-2 rounded-[14px] border border-[#e5e5ea] bg-white p-3.5">
          <input className="dv-input" placeholder="Tên CV (VD: CV Trợ lý casting)" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} maxLength={80} aria-label="Tên CV" />
          <input className="dv-input" type="url" inputMode="url" placeholder="https://drive.google.com/…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} aria-label="Link CV" />
          <p className="text-[13px] text-[var(--dv-text-secondary)]">Để chế độ chia sẻ &ldquo;Bất kỳ ai có đường liên kết&rdquo; để nhà tuyển dụng mở được.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLinkOpen(false)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
              Huỷ
            </button>
            <button type="button" onClick={addLink} disabled={!!busy || !linkUrl.trim()} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
              {busy === 'link' && <Loader2 className="h-4 w-4 animate-spin" />} Lưu link
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
            {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Tải CV (PDF, tối đa 4MB)
          </button>
          <button type="button" onClick={() => setLinkOpen(true)} disabled={!!busy} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
            <Link2 className="h-4 w-4" /> Thêm link CV
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Ứng tuyển ---------------- */

/** Chọn CV + cover letter (viết / PDF, không bắt buộc) rồi gửi. */
function ApplyPanel({ job, me, setMe, onDone }: { job: PublicCrewJob; me: Me; setMe: (m: Me) => void; onDone: (kind: 'applied' | 'already') => void }) {
  const cvs = me.cvs || [];
  const [cvId, setCvId] = useState<string | null>(() => cvs.find(c => c.is_default)?.id || cvs[0]?.id || null);
  const [letter, setLetter] = useState('');
  const [letterFile, setLetterFile] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadLetter = async (file: File) => {
    setError('');
    if (file.type && file.type !== 'application/pdf') return setError('Cover letter chỉ nhận file PDF.');
    if (file.size > CREW_FILE_MAX_BYTES) return setError('File vượt quá 4MB.');
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await actorFetch('/api/dienvienvn/crew/cover', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || 'Không tải được file lên.');
      setLetterFile(data.path ? { path: data.path, name: data.name || file.name } : null);
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    setError('');
    if (job.requires_cv && !cvId) return setError('Tin này yêu cầu gửi kèm CV. Vui lòng chọn hoặc tải lên 1 CV.');
    setBusy(true);
    try {
      const { ok, data } = await sendJson('/api/dienvienvn/crew/apply', 'POST', {
        job_id: job.id,
        cv_id: cvId,
        cover_letter: letter.trim(),
        cover_letter_path: letterFile?.path || null
      });
      if (!ok) return setError(data.error || 'Không gửi được ứng tuyển. Vui lòng thử lại.');
      onDone(data.applied === 'already' ? 'already' : 'applied');
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          CV gửi kèm{job.requires_cv ? <span className="text-[#b00020]"> *</span> : <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]"> (không bắt buộc)</span>}
        </p>
        <div className="mt-3">
          <CvLibrary cvs={cvs} onChange={next => setMe({ ...me, cvs: next })} select={{ value: cvId, onSelect: setCvId, required: !!job.requires_cv }} />
        </div>
      </div>

      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          Cover letter <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">(không bắt buộc)</span>
        </p>
        <textarea
          rows={6}
          maxLength={COVER_LETTER_MAX}
          className="dv-input mt-3 min-h-[150px] py-3"
          placeholder="Giới thiệu ngắn vì sao bạn phù hợp với vị trí này…"
          value={letter}
          onChange={e => setLetter(e.target.value)}
          aria-label="Cover letter"
        />
        <p className="mt-1 text-right text-[12px] text-[var(--dv-text-tertiary)]">
          {letter.length}/{COVER_LETTER_MAX}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) uploadLetter(f);
          }}
        />
        {letterFile ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-[12px] bg-[var(--dv-bg-alt)] px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[14px]">
              <FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{letterFile.name}</span>
            </span>
            <button type="button" onClick={() => setLetterFile(null)} className="shrink-0 text-[13px] font-semibold underline">
              Bỏ file
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="dv-btn dv-btn-secondary mt-2 !h-10 !py-0 text-[14px]">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Đính kèm cover letter (PDF)
          </button>
        )}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} disabled={busy || uploading} className="dv-btn dv-btn-primary">
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Gửi ứng tuyển
        </button>
      </div>
    </>
  );
}

/** Trang ứng tuyển một tin: chưa đăng nhập → đăng ký / đăng nhập; chưa có hồ sơ → tạo hồ sơ; có hồ sơ → chọn CV, cover letter, gửi. */
export function CrewApply({ job }: { job: PublicCrewJob | null }) {
  const href = useDvvnHref();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, setMe, error: meError } = useCrewMe(signedIn);
  const [done, setDone] = useState<null | 'applied' | 'already'>(null);
  const here = job ? href(`/tuyen-dung/ung-tuyen/${job.id}`) : href('/ekip');

  if (!job) {
    return (
      <Shell>
        <div className="dv-card p-10 text-center">
          <p className="text-[19px] font-semibold">Tin tuyển dụng đã đóng.</p>
          <p className="mt-1 text-[15px] text-[var(--dv-text-secondary)]">Tin không còn nhận hồ sơ hoặc không tồn tại.</p>
          <Link href={href('/ekip')} className="dv-btn dv-btn-secondary mt-6">
            Xem việc làm khác
          </Link>
        </div>
      </Shell>
    );
  }

  const back = (
    <Link href={href('/ekip')} className="dv-link text-[14px]">
      <ChevronLeft className="h-4 w-4" /> Việc làm ekip
    </Link>
  );

  if (done) {
    return (
      <Shell>
        {back}
        <div className="dv-card mt-6 p-8 text-center md:p-10">
          <Check className="mx-auto h-10 w-10" strokeWidth={2.5} />
          <h1 className="dv-display mt-4 text-[26px] font-semibold">{done === 'already' ? 'Bạn đã ứng tuyển tin này.' : 'Đã ứng tuyển.'}</h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">
            Nhà tuyển dụng đã nhận được hồ sơ của bạn và sẽ liên hệ trực tiếp nếu phù hợp.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={href('/ekip')} className="dv-btn dv-btn-secondary">
              Xem việc làm khác
            </Link>
            <Link href={href('/tai-khoan/ekip')} className="dv-btn dv-btn-primary">
              Tài khoản ekip
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (session.status === 'loading' || (signedIn && !me && !meError)) return <Shell><Spinner /></Shell>;

  const gate = (title: string, actions: React.ReactNode) => (
    <Shell>
      {back}
      <h1 className="dv-display dv-headline mt-4">Ứng tuyển.</h1>
      <div className="mt-6 space-y-4">
        <JobSummary job={job} />
        <div className="dv-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[17px] font-semibold">{title}</p>
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        </div>
      </div>
    </Shell>
  );

  if (!signedIn) {
    return gate(
      'Đăng ký tài khoản ekip để ứng tuyển.',
      <>
        <Link href={href(`/ekip/dang-ky?next=${encodeURIComponent(here)}`)} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
          Đăng ký tài khoản ekip
        </Link>
        <Link href={href(`/dang-nhap?next=${encodeURIComponent(here)}`)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
          Đăng nhập
        </Link>
      </>
    );
  }
  if (meError || !me) return <Shell>{back}<ErrorBox>{meError}</ErrorBox></Shell>;
  if (!me.crew) {
    return gate(
      'Hoàn thiện hồ sơ ekip để ứng tuyển.',
      <Link href={href(`/tai-khoan/ekip?next=${encodeURIComponent(here)}`)} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
        Tạo hồ sơ ekip
      </Link>
    );
  }

  const crew = me.crew;
  const applied = (me.applications || []).some(a => a.job_id === job.id);
  return (
    <Shell>
      {back}
      <h1 className="dv-display dv-headline mt-4">Ứng tuyển.</h1>
      <div className="mt-6 space-y-4">
        <JobSummary job={job} />
        {crew.review_status === 'rejected' ? (
          <LockedNote />
        ) : applied ? (
          <div className="dv-card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[17px] font-semibold">Bạn đã ứng tuyển tin này.</p>
            <Link href={href('/tai-khoan/ekip')} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
              Xem trong Tài khoản ekip
            </Link>
          </div>
        ) : (
          <>
            <div className="dv-card p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[19px] font-semibold">Hồ sơ ekip</p>
                <Link href={href(`/tai-khoan/ekip?next=${encodeURIComponent(here)}`)} className="dv-link text-[14px]">
                  Sửa hồ sơ
                </Link>
              </div>
              <div className="mt-3">
                <CrewProfileDetails p={crew} compact />
              </div>
            </div>
            <ApplyPanel job={job} me={me} setMe={setMe} onDone={k => { setDone(k); window.scrollTo({ top: 0 }); }} />
          </>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- Tài khoản ekip ---------------- */

/** Tài khoản ekip: tạo / sửa hồ sơ, kho CV, các tin đã ứng tuyển (kèm CV / cover letter đã gửi). */
export function CrewAccount() {
  const href = useDvvnHref();
  const router = useRouter();
  const params = useSearchParams();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, setMe, error: meError, reload } = useCrewMe(signedIn);
  const [form, setForm] = useState<CrewFormB | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [next, setNext] = useState('');

  useEffect(() => {
    if (session.status === 'signed-out') router.replace(href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ekip'))}`));
  }, [session.status, router, href]);
  useEffect(() => {
    const p = params.get('next') || '';
    if (p.startsWith(href('/tuyen-dung/ung-tuyen/'))) writeNext(p);
    setNext(readNext(href));
  }, [params, href]);
  // Chưa có hồ sơ: mở Form B ngay, email = email đăng nhập
  useEffect(() => {
    if (me && !me.crew && !form) setForm(crewFormBFrom(null, me.email || (signedIn ? session.session.user.email || '' : '')));
  }, [me, form, signedIn, session]);

  if (session.status === 'unavailable') {
    return (
      <Shell>
        <div className="dv-card p-10 text-center text-[15px]">Tài khoản chưa sẵn sàng ở chế độ xem thử.</div>
      </Shell>
    );
  }
  if (!signedIn || (!me && !meError)) return <Shell><Spinner /></Shell>;
  if (meError || !me) return <Shell><ErrorBox>{meError}</ErrorBox></Shell>;
  const crew = me.crew;
  const logout = <LogoutButton to={href('/')} className="dv-link text-[14px]" />;

  const save = async () => {
    if (!form) return;
    setError('');
    setBusy(true);
    try {
      const { ok, data } = crew
        ? await sendJson('/api/dienvienvn/crew/me', 'PATCH', { profile: form })
        : await sendJson('/api/dienvienvn/crew/profile', 'POST', { profile: form });
      if (!ok) return setError(data.error || 'Không lưu được hồ sơ.');
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

  const header = (
    <div className="flex items-center justify-between">
      <Link href={href('/ekip')} className="dv-link text-[14px]">
        <ChevronLeft className="h-4 w-4" /> Việc làm ekip
      </Link>
      {logout}
    </div>
  );

  // Chưa có hồ sơ: Form B
  if (!crew) {
    return (
      <Shell>
        {header}
        <h1 className="dv-display dv-headline mt-4">Hồ sơ ekip.</h1>
        <div className="mt-6 space-y-4">
          {form ? <CrewProfileFields value={form} onChange={setForm} emailLocked /> : <Spinner />}
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={save} disabled={busy || !form} className="dv-btn dv-btn-primary">
            {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Lưu hồ sơ
          </button>
        </div>
      </Shell>
    );
  }

  const locked = crew.review_status === 'rejected';
  return (
    <Shell>
      {header}
      <h1 className="dv-display dv-headline mt-4">Tài khoản ekip.</h1>
      {saved && !form && <p className="mt-4 rounded-[12px] bg-[#e8f5ec] p-3 text-[14px] text-[#1e6b3a]">Đã lưu hồ sơ.</p>}
      {next && !locked && (
        <div className="dv-card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] font-semibold">Bạn đang ứng tuyển dở một tin.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { writeNext(''); setNext(''); }} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
              Bỏ qua
            </button>
            <Link href={next} onClick={() => writeNext('')} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
              Tiếp tục ứng tuyển
            </Link>
          </div>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {locked && <LockedNote />}
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
            {!locked && (
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
            )}
          </div>
        )}

        <div className="dv-card p-6">
          <p className="text-[19px] font-semibold">
            Kho CV <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">· {(me.cvs || []).length}/{CREW_MAX_CVS}</span>
          </p>
          <div className="mt-3">{locked ? <p className="text-[14px] text-[var(--dv-text-secondary)]">Tài khoản đang bị khoá.</p> : <CvLibrary cvs={me.cvs || []} onChange={cvs => setMe({ ...me, cvs })} />}</div>
        </div>

        <div className="dv-card p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[19px] font-semibold">Tin đã ứng tuyển</p>
            <Link href={href('/ekip')} className="dv-link text-[14px]">
              Xem việc làm
            </Link>
          </div>
          {(me.applications || []).length === 0 ? (
            <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Chưa ứng tuyển tin nào.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#f0f0f2]">
              {(me.applications || []).map(a => (
                <li key={a.id} className="space-y-2 py-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{a.title}</p>
                    <p className="text-[13px] text-[var(--dv-text-secondary)]">
                      {[a.company, `Ứng tuyển ${vnDate(a.created_at)}`, a.open ? '' : 'Tin đã đóng'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <CrewAttachmentsBlock a={{ cv: a.cv || null, cover_letter: a.cover_letter || null, cover_letter_url: a.cover_letter_url || null }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
