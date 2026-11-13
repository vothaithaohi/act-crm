'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ExternalLink, FileText, Link2, Loader2, Lock, PenLine, Star, Trash2, Upload, X } from 'lucide-react';
import { actorClient, actorFetch, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { LogoutButton } from './logout-button';
import { crewJobPath, type PublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import {
  COVER_LETTER_MAX,
  CREW_FILE_MAX_BYTES,
  CREW_MAX_COVERS,
  CREW_MAX_CVS,
  CREW_SERVER_UPLOAD_MAX,
  CrewAttachments,
  CrewFileKind,
  CrewProfile
} from '@/lib/dienvienvn/crew-profiles';
import { jobOptionText, roleLabel } from '@/lib/dienvienvn/crew-taxonomy';
import { useDvvnHref } from './base-path';
import { CrewFormB, CrewProfileFields, crewFormBFrom } from './crew-profile-fields';
import { CrewAttachmentsBlock, CrewProfileDetails } from './crew-profile-view';
import { JdText, companyLine, jobFacts, jobTags, jobTitle } from './crew-job-view';
import { formatVnDate } from './projects-section';
import { GlobalNav, SiteFooter } from './site-chrome';

type MeApp = { id: string; job_id: string; created_at: string; title: string; company: string; open: boolean } & Partial<CrewAttachments>;
/** 1 file trong kho: CV (PDF / link cũ) hoặc cover letter (PDF / viết tay). */
export type CrewFileItem = {
  id: string;
  kind: CrewFileKind;
  title: string;
  source: 'file' | 'link' | 'text';
  url: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  body: string | null;
  is_default: boolean;
  created_at: string;
};
type Lib = { cvs: CrewFileItem[]; covers: CrewFileItem[] };
type Me = { crew: CrewProfile | null; applications?: MeApp[]; open_jobs?: PublicCrewJob[]; email?: string; mode?: string } & Partial<Lib>;

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
  return { ok: res.ok, status: res.status, data };
}

/** File có phải PDF không: theo nội dung (%PDF-), không tin đuôi / loại file trình duyệt báo. */
async function isPdf(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    return new TextDecoder('latin1').decode(head).includes('%PDF-');
  } catch {
    return /\.pdf$/i.test(file.name);
  }
}

/**
 * Tải 1 file PDF vào kho: tải thẳng lên kho riêng tư (tới 10MB, không qua Vercel),
 * không được thì tải qua máy chủ (tới 4MB). Trả về danh sách kho mới + id file vừa thêm.
 */
async function uploadPdf(kind: CrewFileKind, file: File): Promise<{ ok: boolean; data: { cvs?: CrewFileItem[]; covers?: CrewFileItem[]; id?: string; error?: string } }> {
  if (file.size === 0) return { ok: false, data: { error: 'File trống.' } };
  if (file.size > CREW_FILE_MAX_BYTES) return { ok: false, data: { error: 'File vượt quá 10MB. Vui lòng nén / xuất lại PDF nhẹ hơn.' } };
  if (!(await isPdf(file))) return { ok: false, data: { error: 'Chỉ nhận file PDF. Vui lòng xuất file sang PDF rồi tải lên.' } };
  const title = file.name.replace(/\.pdf$/i, '').slice(0, 80);
  // Luôn gắn loại "application/pdf" (một số máy báo loại file rỗng / khác → kho từ chối)
  const pdf = new File([file], file.name || `${kind}.pdf`, { type: 'application/pdf' });

  const u = await sendJson('/api/dienvienvn/crew/files/upload-url', 'POST', { kind, size: file.size }).catch(() => null);
  if (u && !u.ok && u.status < 500) return u; // kho đầy, quá dung lượng, chưa đăng nhập…
  const c = actorClient();
  if (u?.ok && c) {
    const { error } = await c.storage.from(u.data.bucket).uploadToSignedUrl(u.data.path, u.data.token, pdf, { contentType: 'application/pdf', upsert: false });
    if (!error) return sendJson('/api/dienvienvn/crew/files', 'POST', { kind, path: u.data.path, name: file.name, title });
    console.warn('[dienvienvn] Tải thẳng lên kho lỗi, thử qua máy chủ:', error.message);
  }
  if (file.size > CREW_SERVER_UPLOAD_MAX) return { ok: false, data: { error: u?.data?.error || 'Không tải được file lên. Vui lòng thử lại sau ít phút.' } };
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('title', title);
  fd.append('file', pdf);
  try {
    const res = await actorFetch('/api/dienvienvn/crew/files', { method: 'POST', body: fd });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Mất kết nối mạng. Vui lòng thử lại.' } };
  }
}

/* ---------------- Đăng ký tài khoản ekip ---------------- */

/** /ekip/dang-ky: họ tên + email → email xác nhận & tạo mật khẩu. */
export function CrewSignup() {
  const href = useDvvnHref();
  const router = useRouter();
  const session = useActorSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);
  const [sent, setSent] = useState('');

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

/* ---------------- Kho CV / cover letter ---------------- */

/**
 * Kho file của 1 loại (CV hoặc cover letter): tải PDF, viết cover letter (chỉ ở trang tài khoản), đặt mặc định, xoá.
 * select: dùng khi ứng tuyển — chọn 1 file gửi kèm (file mới tải lên tự được chọn).
 */
function FileLibrary({
  kind,
  items,
  onLib,
  select,
  hideEmpty = false
}: {
  kind: CrewFileKind;
  items: CrewFileItem[];
  onLib: (lib: Partial<Lib>) => void;
  select?: { value: string | null; onSelect: (id: string | null) => void };
  hideEmpty?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const max = kind === 'cv' ? CREW_MAX_CVS : CREW_MAX_COVERS;
  const full = items.length >= max;
  const label = kind === 'cv' ? 'CV' : 'cover letter';

  const apply = (r: { ok: boolean; data: { cvs?: CrewFileItem[]; covers?: CrewFileItem[]; id?: string; error?: string } }) => {
    if (!r.ok) {
      setError(r.data.error || 'Không lưu được. Vui lòng thử lại.');
      return false;
    }
    setError('');
    onLib({ ...(r.data.cvs ? { cvs: r.data.cvs } : {}), ...(r.data.covers ? { covers: r.data.covers } : {}) });
    if (r.data.id && select) select.onSelect(r.data.id);
    return true;
  };
  const upload = async (file: File) => {
    setBusy('upload');
    try {
      apply(await uploadPdf(kind, file));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const saveText = async () => {
    setBusy('text');
    try {
      const ok = apply(await sendJson('/api/dienvienvn/crew/files', 'POST', { kind: 'cover', title: draftTitle.trim(), body: draftBody.trim() }));
      if (ok) {
        setWriting(false);
        setDraftTitle('');
        setDraftBody('');
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
      apply(await sendJson('/api/dienvienvn/crew/files', 'PATCH', { id }));
    } finally {
      setBusy(null);
    }
  };
  const remove = async (f: CrewFileItem) => {
    if (!window.confirm(`Xoá "${f.title}" khỏi kho? Bản đã gửi cho nhà tuyển dụng vẫn được giữ.`)) return;
    setBusy(f.id);
    try {
      const ok = apply(await sendJson(`/api/dienvienvn/crew/files?id=${encodeURIComponent(f.id)}`, 'DELETE'));
      if (ok && select?.value === f.id) select.onSelect(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        hideEmpty ? null : <p className="rounded-[12px] bg-[var(--dv-bg-alt)] p-4 text-[14px] text-[var(--dv-text-secondary)]">
          {kind === 'cv' ? 'Chưa có CV nào.' : 'Chưa có cover letter nào.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map(f => {
            const picked = select?.value === f.id;
            const meta = [
              f.source === 'file' ? 'PDF' : f.source === 'link' ? 'Link' : 'Viết tay',
              sizeText(f.file_size),
              `Thêm ${vnDate(f.created_at)}`
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={f.id} className={`rounded-[14px] border bg-white p-3.5 ${picked ? 'border-[#1d1d1f]' : 'border-[#e5e5ea]'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`flex min-w-0 flex-1 items-center gap-3 ${select ? 'cursor-pointer' : ''}`}>
                    {select && <input type="radio" name={`crew-${kind}`} checked={picked} onChange={() => select.onSelect(f.id)} className="h-4 w-4 shrink-0 accent-[#1d1d1f]" />}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--dv-bg-alt)]">
                      {f.source === 'link' ? <Link2 className="h-5 w-5" /> : f.source === 'text' ? <PenLine className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold">{f.title}</span>
                        {f.is_default && <span className="shrink-0 rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[11px] font-semibold text-white">Mặc định</span>}
                      </span>
                      <span className="block truncate text-[13px] text-[var(--dv-text-secondary)]">{meta}</span>
                    </span>
                  </label>
                  <div className="flex shrink-0 items-center gap-1">
                    {busy === f.id && <Loader2 className="h-4 w-4 animate-spin text-[var(--dv-text-secondary)]" />}
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium hover:bg-[var(--dv-bg-alt)]">
                        Xem <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!select && !f.is_default && (
                      <button type="button" onClick={() => makeDefault(f.id)} disabled={!!busy} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium hover:bg-[var(--dv-bg-alt)]">
                        <Star className="h-3.5 w-3.5" /> Đặt mặc định
                      </button>
                    )}
                    <button type="button" onClick={() => remove(f)} disabled={!!busy} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#b00020] hover:bg-[#fff0f0]" aria-label={`Xoá ${f.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {f.source === 'text' && f.body && <p className="mt-2 line-clamp-3 whitespace-pre-line pl-[52px] text-[14px] leading-[1.5] text-[var(--dv-text-secondary)]">{f.body}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      {full ? (
        <p className="mt-3 text-[13px] text-[var(--dv-text-secondary)]">
          Kho đã đủ {max} {label}. Xoá bớt {label} cũ để thêm mới.
        </p>
      ) : writing ? (
        <div className="mt-3 space-y-2 rounded-[14px] border border-[#e5e5ea] bg-white p-3.5">
          <input className="dv-input" placeholder="Tên cover letter (VD: Cover letter Trợ lý casting)" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} maxLength={80} aria-label="Tên cover letter" />
          <textarea
            rows={6}
            maxLength={COVER_LETTER_MAX}
            className="dv-input min-h-[150px] py-3"
            placeholder="Giới thiệu ngắn về bạn và kinh nghiệm phù hợp với công việc…"
            value={draftBody}
            onChange={e => setDraftBody(e.target.value)}
            aria-label="Nội dung cover letter"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setWriting(false)} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
              Huỷ
            </button>
            <button type="button" onClick={saveText} disabled={!!busy || draftBody.trim().length < 20} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
              {busy === 'text' && <Loader2 className="h-4 w-4 animate-spin" />} Lưu cover letter
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
            {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy === 'upload' ? 'Đang tải lên…' : kind === 'cv' ? 'Tải CV mới (PDF, tối đa 10MB)' : 'Tải cover letter (PDF)'}
          </button>
          {kind === 'cover' && !select && (
            <button type="button" onClick={() => setWriting(true)} disabled={!!busy} className="dv-btn dv-btn-ghost !h-10 !py-0 text-[14px]">
              <PenLine className="h-4 w-4" /> Viết cover letter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 2 khối quản lý file trên trang tài khoản. */
function FileBlocks({ me, setMe }: { me: Me; setMe: (m: Me) => void }) {
  const onLib = (lib: Partial<Lib>) => setMe({ ...me, ...lib });
  return (
    <>
      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          Cover letter <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">· {(me.covers || []).length}/{CREW_MAX_COVERS}</span>
        </p>
        <div className="mt-3">
          <FileLibrary kind="cover" items={me.covers || []} onLib={onLib} />
        </div>
      </div>
      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          Kho CV <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">· {(me.cvs || []).length}/{CREW_MAX_CVS}</span>
        </p>
        <div className="mt-3">
          <FileLibrary kind="cv" items={me.cvs || []} onLib={onLib} />
        </div>
      </div>
    </>
  );
}

/* ---------------- Ứng tuyển ---------------- */

/** Cover letter (chọn trong kho / viết mới cho tin này / tải PDF, không bắt buộc) rồi CV (chọn trong kho / tải mới), gửi. */
function ApplyPanel({ job, me, setMe, onDone }: { job: PublicCrewJob; me: Me; setMe: (m: Me) => void; onDone: (kind: 'applied' | 'already') => void }) {
  const cvs = me.cvs || [];
  const covers = me.covers || [];
  const [cvId, setCvId] = useState<string | null>(() => cvs.find(c => c.is_default)?.id || cvs[0]?.id || null);
  // null = không gửi; 'write' = viết mới cho tin này; còn lại = id cover letter trong kho
  const [cover, setCover] = useState<string | null>(() => covers.find(c => c.is_default)?.id || null);
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onLib = (lib: Partial<Lib>) => setMe({ ...me, ...lib });

  const submit = async () => {
    setError('');
    if (job.requires_cv && !cvId) return setError('Tin này yêu cầu gửi kèm CV. Vui lòng chọn hoặc tải lên 1 CV.');
    if (cover === 'write' && !letter.trim()) return setError('Vui lòng viết cover letter, hoặc chọn "Không gửi cover letter".');
    setBusy(true);
    try {
      const { ok, data } = await sendJson('/api/dienvienvn/crew/apply', 'POST', {
        job_id: job.id,
        cv_id: cvId,
        cover_id: cover && cover !== 'write' ? cover : null,
        cover_letter: cover === 'write' ? letter.trim() : ''
      });
      if (!ok) return setError(data.error || 'Không gửi được ứng tuyển. Vui lòng thử lại.');
      onDone(data.applied === 'already' ? 'already' : 'applied');
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const option = (checked: boolean, onPick: () => void, text: string) => (
    <label className={`flex cursor-pointer items-center gap-3 rounded-[14px] border bg-white p-3.5 ${checked ? 'border-[#1d1d1f]' : 'border-[#e5e5ea]'}`}>
      <input type="radio" name="crew-cover" checked={checked} onChange={onPick} className="h-4 w-4 accent-[#1d1d1f]" />
      <span className="text-[15px]">{text}</span>
    </label>
  );

  return (
    <>
      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          1. Cover letter <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">(không bắt buộc)</span>
        </p>
        <div className="mt-3 space-y-2">
          {option(cover === null, () => setCover(null), 'Không gửi cover letter')}
          <FileLibrary kind="cover" items={covers} onLib={onLib} select={{ value: cover, onSelect: id => setCover(id) }} hideEmpty />
          {option(cover === 'write', () => setCover('write'), 'Viết cover letter mới cho tin này')}
          {cover === 'write' && (
            <div>
              <textarea
                rows={6}
                maxLength={COVER_LETTER_MAX}
                className="dv-input min-h-[150px] py-3"
                placeholder="Giới thiệu ngắn vì sao bạn phù hợp với vị trí này…"
                value={letter}
                onChange={e => setLetter(e.target.value)}
                aria-label="Cover letter"
                autoFocus
              />
              <p className="mt-1 text-right text-[12px] text-[var(--dv-text-tertiary)]">
                {letter.length}/{COVER_LETTER_MAX}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="dv-card p-6">
        <p className="text-[19px] font-semibold">
          2. CV{job.requires_cv ? <span className="text-[#b00020]"> *</span> : <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]"> (không bắt buộc)</span>}
        </p>
        <div className="mt-3 space-y-2">
          {!job.requires_cv && (
            <label className={`flex cursor-pointer items-center gap-3 rounded-[14px] border bg-white p-3.5 ${cvId === null ? 'border-[#1d1d1f]' : 'border-[#e5e5ea]'}`}>
              <input type="radio" name="crew-cv" checked={cvId === null} onChange={() => setCvId(null)} className="h-4 w-4 accent-[#1d1d1f]" />
              <span className="text-[15px]">Không gửi CV</span>
            </label>
          )}
          <FileLibrary kind="cv" items={cvs} onLib={onLib} select={{ value: cvId, onSelect: setCvId }} />
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} disabled={busy} className="dv-btn dv-btn-primary">
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />} Gửi ứng tuyển
        </button>
      </div>
    </>
  );
}

/** Trang chi tiết tin + ứng tuyển: nội dung tin bên trái, thẻ "Ứng tuyển" dính bên phải (điện thoại: thanh dưới đáy);
 *  bấm "Ứng tuyển ngay" mở cửa sổ trượt từ phải: 1. Cover letter → 2. CV → Gửi. */
export function CrewApply({ job }: { job: PublicCrewJob | null }) {
  const href = useDvvnHref();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, setMe, error: meError } = useCrewMe(signedIn);
  const [done, setDone] = useState<null | 'applied' | 'already'>(null);
  const [drawer, setDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const here = job ? href(crewJobPath(job)) : href('/ekip');

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

  if (done) {
    return (
      <Shell>
        <Link href={href('/ekip')} className="dv-link text-[14px]">
          <ChevronLeft className="h-4 w-4" /> Việc làm ekip
        </Link>
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

  const title = jobTitle(job);
  const facts = jobFacts(job);
  const tags = jobTags(job);
  const crew = me?.crew || null;
  const applied = !!crew && (me?.applications || []).some(a => a.job_id === job.id);
  const loading = session.status === 'loading' || (signedIn && !me && !meError);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* trình duyệt chặn sao chép */
    }
  };

  // Nút chính của thẻ Ứng tuyển, theo trạng thái tài khoản
  const btn = 'dv-btn w-full !h-11 !py-0 text-[15px]';
  const cta = loading ? (
    <div className="flex h-11 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--dv-text-secondary)]" />
    </div>
  ) : !signedIn ? (
    <div className="space-y-2">
      <Link href={href('/ekip/dang-ky')} className={`${btn} dv-btn-primary`}>
        Đăng ký để ứng tuyển
      </Link>
      <Link href={href(`/dang-nhap?next=${encodeURIComponent(here)}`)} className={`${btn} dv-btn-secondary`}>
        Đăng nhập
      </Link>
    </div>
  ) : meError ? (
    <p className="text-[14px] text-[#b00020]">{meError}</p>
  ) : !crew ? (
    <Link href={href('/tai-khoan/ekip')} className={`${btn} dv-btn-primary`}>
      Điền hồ sơ ekip để ứng tuyển
    </Link>
  ) : crew.review_status === 'rejected' ? (
    <LockedNote />
  ) : applied ? (
    <div className="space-y-2">
      <p className="flex items-center justify-center gap-2 rounded-full bg-[#e8f5ec] py-2.5 text-[15px] font-semibold text-[#1e6b3a]">
        <Check className="h-4 w-4" /> Bạn đã ứng tuyển
      </p>
      <Link href={href('/tai-khoan/ekip')} className={`${btn} dv-btn-secondary`}>
        Xem trong Tài khoản ekip
      </Link>
    </div>
  ) : (
    <button type="button" onClick={() => setDrawer(true)} className={`${btn} dv-btn-primary`}>
      Ứng tuyển ngay
    </button>
  );
  // Thanh dưới đáy (điện thoại): chưa đăng nhập chỉ 1 nút, link Đăng nhập nằm trong trang đăng ký
  const mobileCta = !loading && !signedIn ? (
    <Link href={href('/ekip/dang-ky')} className={`${btn} dv-btn-primary`}>
      Đăng ký để ứng tuyển
    </Link>
  ) : (
    cta
  );
  const canOpenDrawer = !loading && signedIn && !!crew && crew.review_status !== 'rejected' && !applied;

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-12 pt-8 md:pt-12 lg:pb-20">
        <div className="mx-auto max-w-[1120px]">
          <Link href={href('/ekip')} className="dv-link text-[14px]">
            <ChevronLeft className="h-4 w-4" /> Việc làm ekip
          </Link>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
            {/* Nội dung tin */}
            <article className="min-w-0 space-y-6">
              <header className="dv-card p-6 md:p-8">
                <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--dv-text-tertiary)]">{companyLine(job)}</p>
                <h1 className="dv-display mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] md:text-[34px]">{title.main}</h1>
                {title.sub && <p className="mt-1.5 text-[17px] text-[var(--dv-text-secondary)]">{title.sub}</p>}
                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span key={t} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[13px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {facts.length > 0 && (
                  <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[#f0f0f2] pt-6 sm:grid-cols-2 xl:grid-cols-3">
                    {facts.map(f => (
                      <div key={f.key} className="flex min-w-0 gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--dv-bg-alt)]">
                          <f.icon className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--dv-text-tertiary)]">{f.label}</dt>
                          <dd className="text-[15px] font-medium leading-[1.4]">{f.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                )}
              </header>

              {job.description && (
                <section className="dv-card p-6 md:p-8">
                  <h2 className="mb-4 text-[19px] font-semibold">Mô tả công việc</h2>
                  <JdText text={job.description} />
                </section>
              )}
            </article>

            {/* Thẻ Ứng tuyển: dính khi cuộn (máy tính) */}
            <aside className="hidden lg:sticky lg:top-[72px] lg:block">
              <div className="dv-card space-y-4 p-6">
                <p className="text-[17px] font-semibold">Ứng tuyển vị trí này</p>
                <ul className="space-y-1.5 text-[14px] text-[var(--dv-text-secondary)]">
                  {job.deadline && (
                    <li>
                      Hạn nộp: <span className="font-semibold text-[var(--dv-text)]">{formatVnDate(job.deadline)}</span>
                    </li>
                  )}
                  {job.quantity ? (
                    <li>
                      Số lượng: <span className="font-semibold text-[var(--dv-text)]">{job.quantity} người</span>
                    </li>
                  ) : null}
                  <li>{job.requires_cv ? 'Yêu cầu gửi kèm CV (PDF)' : 'Gửi kèm CV và cover letter nếu có'}</li>
                </ul>
                {cta}
                <button type="button" onClick={copyLink} className="flex w-full items-center justify-center gap-1.5 text-[14px] font-medium text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]">
                  <Link2 className="h-4 w-4" /> {copied ? 'Đã sao chép link' : 'Sao chép link tin'}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <div className="pb-20 lg:pb-0">
        <SiteFooter />
      </div>

      {/* Điện thoại / máy tính bảng: thanh Ứng tuyển dưới đáy */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{title.main}</p>
            <p className="truncate text-[12.5px] text-[var(--dv-text-secondary)]">
              {[job.quantity ? `Cần ${job.quantity} người` : '', job.deadline ? `Hạn ${formatVnDate(job.deadline)}` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="w-[190px] shrink-0">{mobileCta}</div>
        </div>
      </div>

      {drawer && canOpenDrawer && me && (
        <ApplyDrawer
          title={title}
          onClose={() => setDrawer(false)}
          body={
            <ApplyPanel
              job={job}
              me={me}
              setMe={setMe}
              onDone={k => {
                setDrawer(false);
                setDone(k);
                window.scrollTo({ top: 0 });
              }}
            />
          }
          profile={
            <div className="dv-card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--dv-text-tertiary)]">Hồ sơ gửi kèm</p>
                <p className="truncate text-[15px] font-semibold">{crew?.full_name}</p>
              </div>
              <Link href={href('/tai-khoan/ekip')} className="dv-link shrink-0 text-[14px]">
                Sửa hồ sơ
              </Link>
            </div>
          }
        />
      )}
    </>
  );
}

/** Cửa sổ ứng tuyển trượt từ phải (giống cửa sổ hồ sơ diễn viên). */
function ApplyDrawer({ title, body, profile, onClose }: { title: { main: string; sub: string }; body: React.ReactNode; profile: React.ReactNode; onClose: () => void }) {
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
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Ứng tuyển ${title.main}`} onClick={e => e.stopPropagation()} className="dv-slide-in-right flex h-full w-full max-w-[640px] flex-col bg-[var(--dv-bg-alt)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-white hover:bg-black">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--dv-text-tertiary)]">Ứng tuyển</p>
            <p className="truncate text-[15px] font-semibold">{title.main}</p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
          {profile}
          {body}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tài khoản ekip ---------------- */

/** Tài khoản ekip: hồ sơ chung (Form B), cover letter, kho CV, các tin đã ứng tuyển. */
export function CrewAccount() {
  const href = useDvvnHref();
  const router = useRouter();
  const session = useActorSession();
  const signedIn = session.status === 'signed-in';
  const { me, setMe, error: meError, reload } = useCrewMe(signedIn);
  const [form, setForm] = useState<CrewFormB | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session.status === 'signed-out') router.replace(href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ekip'))}`));
  }, [session.status, router, href]);
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
      // Lần đầu lưu hồ sơ: về trang Việc làm ekip để chọn tin ứng tuyển
      if (!crew) return router.push(href('/ekip'));
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

  // Lần đầu: Form B (hồ sơ chung) + cover letter + kho CV
  if (!crew) {
    return (
      <Shell>
        {header}
        <h1 className="dv-display dv-headline mt-4">Hồ sơ ekip.</h1>
        <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">Điền hồ sơ chung cho các tin tuyển dụng trước khi nộp đơn ứng tuyển (có thể sửa lại sau).</p>
        <div className="mt-6 space-y-4">
          {form ? <CrewProfileFields value={form} onChange={setForm} emailLocked /> : <Spinner />}
          <FileBlocks me={me} setMe={setMe} />
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

        {!locked && <OpenJobs jobs={me.open_jobs || []} />}

        {!locked && <FileBlocks me={me} setMe={setMe} />}

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

/** Việc làm đang tuyển (chưa ứng tuyển) ngay trên trang tài khoản ekip. */
function OpenJobs({ jobs }: { jobs: PublicCrewJob[] }) {
  const href = useDvvnHref();
  const [all, setAll] = useState(false);
  const shown = all ? jobs : jobs.slice(0, 5);
  return (
    <div className="dv-card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[19px] font-semibold">
          Việc làm đang tuyển <span className="text-[15px] font-normal text-[var(--dv-text-secondary)]">· {jobs.length}</span>
        </p>
        <Link href={href('/ekip')} className="dv-link text-[14px]">
          Xem trang việc làm
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className="mt-2 text-[15px] text-[var(--dv-text-secondary)]">Bạn đã ứng tuyển hết các tin đang tuyển. Tin mới sẽ hiện tại đây.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-[#f0f0f2]">
            {shown.map(j => {
              const role = roleLabel(j.department, j.role_title, j.role_other);
              const meta = [
                j.company,
                j.project_name || (j.project_type ? 'Dự án bảo mật' : ''),
                j.quantity ? `Cần ${j.quantity} người` : '',
                j.deadline ? `Hạn ${new Date(`${j.deadline}T00:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={j.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{role?.vi || j.title}</p>
                    <p className="text-[13px] text-[var(--dv-text-secondary)]">{meta}</p>
                  </div>
                  <Link href={href(crewJobPath(j))} className="dv-btn dv-btn-primary !h-9 shrink-0 !px-4 !py-0 text-[14px]">
                    Ứng tuyển
                  </Link>
                </li>
              );
            })}
          </ul>
          {jobs.length > 5 && (
            <button type="button" onClick={() => setAll(v => !v)} className="mt-2 text-[14px] font-semibold underline underline-offset-4">
              {all ? 'Thu gọn' : `Xem thêm ${jobs.length - 5} tin`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
