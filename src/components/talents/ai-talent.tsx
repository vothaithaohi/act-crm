'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Globe, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { createClient } from '@/lib/supabase/client';
import { useCRM } from '@/lib/store/crm-context';
import { talentPath } from '@/lib/talent-path';
import type { TalentProfile } from '@/lib/types/crm';
import { RESERVED_USERNAMES, USERNAME_PATTERN } from '@/lib/dienvienvn/hosts';

// AI tạo hồ sơ diễn viên từ tên / link (Super Admin, Casting). Hồ sơ vào trạng thái Chờ duyệt, nhãn AI tạo,
// chỉ trong CRM; bật công khai từng hồ sơ khi diễn viên / agency đã đồng ý.

const AI_ROLES = ['super_admin', 'casting'];
type Job = { id: string; input: { name: string; links: string[]; note: string }; status: 'running' | 'done' | 'failed'; talent_id: string | null; error: string | null; created_at: string; created_by: string | null };
type Dup = { id: string; full_name: string; username: string | null; submission_source: string | null; review_status: string | null };

export function AiBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-300 bg-violet-50 text-violet-800 ${className}`}>
      <Sparkles className="w-3 h-3" /> AI tạo
    </span>
  );
}

/** Có quyền dùng AI tạo hồ sơ (theo vai trò đang xem). */
function useCanUseAi() {
  const { realRole, viewAsRole } = useCRM();
  return AI_ROLES.includes((viewAsRole || realRole || '') as string);
}

const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export function AiTalentButton({ onCreated }: { onCreated?: () => void }) {
  const allowed = useCanUseAi();
  const [open, setOpen] = useState(false);
  if (!allowed) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI tạo hồ sơ</span>
      </button>
      {open && <AiTalentDialog onClose={() => setOpen(false)} onCreated={onCreated} />}
    </>
  );
}

function AiTalentDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [name, setName] = useState('');
  const [linksText, setLinksText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dups, setDups] = useState<Dup[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [keyReady, setKeyReady] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState('');
  const notified = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/ai-talent', { cache: 'no-store' });
      const b = await res.json().catch(() => ({}));
      if (b.mode === 'demo') {
        setKeyReady(false);
        setSetupError('Chế độ demo không dùng được AI tạo hồ sơ.');
        return;
      }
      if (!res.ok) return setSetupError(b.error || 'Không tải được.');
      setKeyReady(!!b.keyReady);
      setSetupError(b.error || '');
      const list: Job[] = Array.isArray(b.jobs) ? b.jobs : [];
      setJobs(list);
      // Lượt vừa xong: báo + tải lại danh sách hồ sơ (1 lần mỗi lượt)
      for (const j of list) {
        if (j.status === 'done' && !notified.current.has(j.id) && Date.now() - Date.parse(j.created_at) < 15 * 60 * 1000) {
          if (notified.current.size) toast.success(`AI đã tạo xong hồ sơ ${j.input.name}`);
          onCreated?.();
        }
        if (j.status !== 'running') notified.current.add(j.id);
      }
    } catch {
      /* bỏ qua, lần sau thử lại */
    }
  }, [onCreated]);

  useEffect(() => {
    void load();
  }, [load]);
  // Còn lượt đang chạy: hỏi lại mỗi 4 giây
  const running = jobs.some(j => j.status === 'running');
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [running, load]);

  const links = linksText
    .split(/\s+/)
    .map(l => l.trim())
    .filter(Boolean);

  const submit = async (force = false) => {
    setError('');
    if (name.trim().length < 2) return setError('Nhập tên diễn viên.');
    if (links.length > 5) return setError('Tối đa 5 link.');
    if (links.some(l => !/^https?:\/\/\S+\.\S+/.test(l))) return setError('Link chưa đúng định dạng (cần bắt đầu bằng https://).');
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/ai-talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), links, note: note.trim(), force })
      });
      const b = await res.json().catch(() => ({}));
      if (b.duplicates?.length) return setDups(b.duplicates);
      if (!res.ok || !b.job) return setError(b.error || 'Không bắt đầu được. Vui lòng thử lại.');
      setDups(null);
      setName('');
      setLinksText('');
      setNote('');
      setJobs(list => [b.job, ...list.filter(x => x.id !== b.job.id)]);
      toast.success('AI đang tìm thông tin, thường mất 1–2 phút. Bạn có thể đóng hộp này, hồ sơ vẫn được tạo.');
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-violet-500';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl border shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" /> AI tạo hồ sơ
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              AI tìm thông tin công khai trên web và tạo hồ sơ <b>Chờ duyệt</b>, chỉ trong CRM. Mỗi thông tin kèm nguồn để kiểm tra.
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        {(keyReady === false || setupError) && (
          <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{setupError || 'Chưa cấu hình ANTHROPIC_API_KEY trên Vercel nên chưa dùng được AI tạo hồ sơ.'}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Tên diễn viên *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="VD: Kathy Uyên" maxLength={120} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Link tham khảo (không bắt buộc, tối đa 5, mỗi dòng 1 link)</label>
            <textarea
              className={`${inputCls} resize-y`}
              rows={3}
              value={linksText}
              onChange={e => setLinksText(e.target.value)}
              placeholder={'https://vi.wikipedia.org/wiki/...\nhttps://www.instagram.com/...'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Ghi chú cho AI (không bắt buộc)</label>
            <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: diễn viên phim Chị Mười Ba, sinh năm 1983" maxLength={1000} />
          </div>
        </div>

        {dups && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">Kho đã có hồ sơ trùng tên. Kiểm tra trước khi tạo thêm:</p>
            <ul className="space-y-1">
              {dups.map(d => (
                <li key={d.id}>
                  <Link href={talentPath({ id: d.id, username: d.username })} target="_blank" className="underline">
                    {d.full_name}
                  </Link>
                  {d.submission_source === 'ai' ? ' · AI tạo' : ''}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button onClick={() => submit(true)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-amber-900 text-white font-semibold disabled:opacity-50">
                Vẫn tạo hồ sơ mới
              </button>
              <button onClick={() => setDups(null)} className="px-3 py-1.5 rounded-lg border border-amber-300 font-semibold">
                Huỷ
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {!dups && (
          <div className="flex justify-end">
            <button
              onClick={() => submit(false)}
              disabled={busy || keyReady === false}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Tạo hồ sơ
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-2">Lượt gần đây</p>
            <ul className="divide-y rounded-xl border">
              {jobs.map(j => (
                <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{j.input?.name}</p>
                    <p className="text-muted-foreground">
                      {time(j.created_at)}
                      {j.created_by ? ` · ${j.created_by}` : ''}
                    </p>
                    {j.status === 'failed' && j.error && <p className="text-destructive mt-0.5">{j.error}</p>}
                  </div>
                  {j.status === 'running' ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-violet-700 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tìm…
                    </span>
                  ) : j.status === 'done' && j.talent_id ? (
                    <Link href={talentPath({ id: j.talent_id })} onClick={onClose} className="shrink-0 font-semibold text-violet-700 hover:underline">
                      Mở hồ sơ
                    </Link>
                  ) : (
                    <span className="shrink-0 text-destructive font-semibold">Lỗi</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Đường dẫn công khai từ tên: "Kathy Uyên (Lê ...)" → kathy-uyen; trùng thì thêm số. */
async function freeUsername(db: NonNullable<ReturnType<typeof createClient>>, name: string): Promise<string | null> {
  const base = name
    .split(' (')[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34);
  if (base.length < 3) return null;
  for (let i = 0; i < 20; i++) {
    const u = i ? `${base}-${i + 1}` : base;
    if (!USERNAME_PATTERN.test(u) || RESERVED_USERNAMES.has(u)) continue;
    const { data } = await db.from('talent_profiles').select('id').eq('username', u).limit(1);
    if (!data?.length) return u;
  }
  return null;
}

/** Khung trên trang hồ sơ AI tạo: tiểu sử, thông tin chưa chắc chắn, nguồn; bật / tắt công khai. */
export function AiTalentPanel({ talent }: { talent: TalentProfile }) {
  const { refreshTalents, can } = useCRM();
  const allowed = useCanUseAi() && can('talents:write');
  const [busy, setBusy] = useState(false);
  const info = talent.ai_profile;
  if (talent.submission_source !== 'ai' && !talent.ai_generated) return null;
  const approved = talent.review_status === 'approved';
  const isPublic = !!talent.public_profile && !!talent.username;

  const togglePublic = async () => {
    const db = createClient();
    if (!db) return toast.error('Cần kết nối Supabase.');
    if (!isPublic && !window.confirm(`Bật công khai hồ sơ ${talent.full_name} trên dienvienvn.com? Chỉ bật khi diễn viên hoặc agency đã đồng ý.`)) return;
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { public_profile: !isPublic, updated_at: new Date().toISOString() };
      if (!isPublic && !talent.username) {
        const u = await freeUsername(db, talent.full_name);
        if (!u) return void toast.error('Không tạo được đường dẫn công khai từ tên này. Hãy đặt username trong phần sửa hồ sơ.');
        patch.username = u;
      }
      const { error } = await db.from('talent_profiles').update(patch).eq('id', talent.id);
      if (error) return void toast.error('Không lưu được', { description: error.message });
      toast.success(isPublic ? 'Đã tắt công khai, hồ sơ chỉ còn trong CRM.' : 'Đã bật công khai.');
      await refreshTalents();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-violet-200 p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AiBadge />
          <span className="text-xs text-muted-foreground">
            {info?.created_at ? `Tạo lúc ${time(info.created_at)}` : ''}
            {info?.created_by ? ` · ${info.created_by}` : ''} · Kiểm tra nguồn trước khi duyệt
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 font-semibold ${isPublic ? 'text-emerald-700' : 'text-muted-foreground'}`}>
            <Globe className="w-3.5 h-3.5" /> {isPublic ? `Công khai: dienvienvn.com/${talent.username}` : 'Chỉ trong CRM'}
          </span>
          {allowed && (
            <button
              onClick={togglePublic}
              disabled={busy || (!isPublic && !approved)}
              title={!isPublic && !approved ? 'Duyệt hồ sơ trước khi bật công khai' : undefined}
              className="px-2.5 py-1.5 rounded-lg border font-semibold hover:bg-muted disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPublic ? 'Tắt công khai' : 'Bật công khai'}
            </button>
          )}
        </div>
      </div>

      {info?.bio && <p className="text-sm leading-relaxed">{info.bio}</p>}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        {info?.real_name && (
          <div>
            <dt className="inline text-muted-foreground">Tên thật: </dt>
            <dd className="inline">{info.real_name}</dd>
          </div>
        )}
        {info?.stage_name && (
          <div>
            <dt className="inline text-muted-foreground">Nghệ danh: </dt>
            <dd className="inline">{info.stage_name}</dd>
          </div>
        )}
        {(info?.birth_year || talent.dob) && (
          <div>
            <dt className="inline text-muted-foreground">Năm sinh: </dt>
            <dd className="inline">{info?.birth_date_exact ? talent.dob : `${info?.birth_year ?? talent.dob?.slice(0, 4)} (chỉ biết năm)`}</dd>
          </div>
        )}
        {info?.hometown && (
          <div>
            <dt className="inline text-muted-foreground">Quê quán: </dt>
            <dd className="inline">{info.hometown}</dd>
          </div>
        )}
        {info?.agency && (
          <div className="sm:col-span-2">
            <dt className="inline text-muted-foreground">Agency / quản lý: </dt>
            <dd className="inline">{info.agency}</dd>
          </div>
        )}
        {!!info?.training?.length && (
          <div className="sm:col-span-2">
            <dt className="inline text-muted-foreground">Đào tạo: </dt>
            <dd className="inline">{info.training.join(' · ')}</dd>
          </div>
        )}
        {!!info?.skills?.length && (
          <div className="sm:col-span-2">
            <dt className="inline text-muted-foreground">Kỹ năng: </dt>
            <dd className="inline">{info.skills.join(' · ')}</dd>
          </div>
        )}
      </dl>

      {info?.notes && (
        <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <b>Cần kiểm tra: </b>
            {info.notes}
          </span>
        </div>
      )}

      {!!info?.sources?.length && (
        <div>
          <p className="text-xs font-semibold mb-1">Nguồn AI đã đọc ({info.sources.length})</p>
          <ul className="space-y-1">
            {info.sources.map(s => (
              <li key={s.url} className="text-xs">
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline break-all">
                  {s.label || s.url} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
