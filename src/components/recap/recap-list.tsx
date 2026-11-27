'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleAlert, FileAudio, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { AUDIO_EXTS, MAX_AUDIO_BYTES, Meeting, STATUS_LABEL, clock, fileExt } from '@/lib/recap/types';
import { useRecapBase } from './recap-shell';

type Row = Pick<Meeting, 'id' | 'user_email' | 'title' | 'audio_name' | 'audio_size' | 'duration_seconds' | 'status' | 'progress' | 'error' | 'created_at'>;

const fmtDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const mb = (n?: number | null) => (n ? `${(n / 1024 / 1024).toFixed(n > 100 * 1024 * 1024 ? 0 : 1)} MB` : '');

/** Thời lượng file (đọc ngay trên trình duyệt). Không đọc được thì trả null. */
function readDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(/^video\//.test(file.type) || /\.(mp4|webm)$/i.test(file.name) ? 'video' : 'audio');
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 20000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    };
    el.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    el.src = url;
  });
}

/** Tải thẳng lên kho Supabase qua link ký sẵn, có % tiến độ. */
function putFile(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'true');
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) xhr.setRequestHeader('apikey', anon);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Tải lên lỗi (${xhr.status}). ${xhr.responseText.slice(0, 120)}`)));
    xhr.onerror = () => reject(new Error('Mất kết nối mạng khi tải lên.'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}

export function RecapList() {
  const base = useRecapBase();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [admin, setAdmin] = useState(false);
  const [me, setMe] = useState('');
  const [problem, setProblem] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [drag, setDrag] = useState(false);
  const [upload, setUpload] = useState<{ pct: number; label: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/recap/meetings').catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res || !res.ok) {
      setProblem(d?.error || 'Không tải được danh sách.');
      setRows([]);
      return;
    }
    setProblem(d.error || '');
    setRows(d.meetings || []);
    setAdmin(!!d.admin);
    setMe(d.email || '');
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Còn cuộc họp đang xử lý → cập nhật trạng thái mỗi 5 giây
  const busy = rows?.some(r => r.status === 'transcribing' || r.status === 'summarizing');
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [busy, load]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!AUDIO_EXTS.includes(fileExt(f.name))) {
      toast.error(`Chỉ nhận file ${AUDIO_EXTS.map(e => '.' + e).join(', ')}.`);
      return;
    }
    if (f.size > MAX_AUDIO_BYTES) {
      toast.error('File vượt quá 500MB.');
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const start = async () => {
    if (!file || !title.trim()) return;
    setUpload({ pct: 0, label: 'Đang đọc file…' });
    let id = '';
    try {
      const duration = await readDuration(file);
      const res = await authedFetch('/api/recap/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), name: file.name, size: file.size, duration })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Không tạo được cuộc họp.');
      id = d.id;
      setUpload({ pct: 0, label: 'Đang tải lên' });
      await putFile(d.uploadUrl, file, pct => setUpload({ pct, label: 'Đang tải lên' }));
      const s = await authedFetch(`/api/recap/meetings/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      if (!s.ok) throw new Error((await s.json().catch(() => ({}))).error || 'Không bắt đầu xử lý được.');
      router.push(`${base}/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
      if (id) await authedFetch(`/api/recap/meetings/${id}`, { method: 'DELETE' }).catch(() => null);
      setUpload(null);
    }
  };

  const remove = async (r: Row) => {
    if (!window.confirm(`Xoá cuộc họp “${r.title}”? Không khôi phục được.`)) return;
    const res = await authedFetch(`/api/recap/meetings/${r.id}`, { method: 'DELETE' });
    if (!res.ok) toast.error('Không xoá được.');
    load();
  };

  return (
    <div className="space-y-6">
      {problem && <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{problem}</div>}

      <div
        onDragOver={e => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed bg-white p-6 transition-colors ${drag ? 'border-black bg-muted/40' : 'border-[#d2d2d7]'}`}
      >
        <input ref={inputRef} type="file" accept={AUDIO_EXTS.map(e => '.' + e).join(',')} className="hidden" onChange={e => pick(e.target.files?.[0])} />
        {!file ? (
          <button onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-2 py-6 text-center">
            <UploadCloud className="h-9 w-9 text-muted-foreground" />
            <span className="text-base font-semibold">Kéo thả file ghi âm vào đây hoặc bấm để chọn</span>
            <span className="text-sm text-muted-foreground">.mp3 .m4a .wav .mp4 .webm, tối đa 500MB</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileAudio className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{file.name}</div>
                <div className="text-sm text-muted-foreground">{mb(file.size)}</div>
              </div>
              {!upload && (
                <button onClick={() => setFile(null)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
                  Đổi file
                </button>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Tên cuộc họp</label>
              <input value={title} disabled={!!upload} onChange={e => setTitle(e.target.value)} className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10" />
            </div>
            {upload ? (
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{upload.label}</span>
                  <span>{upload.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-black transition-[width]" style={{ width: `${upload.pct}%` }} />
                </div>
              </div>
            ) : (
              <button onClick={start} disabled={!title.trim()} className="h-11 rounded-lg bg-black px-5 text-sm font-semibold text-white disabled:opacity-50">
                Tải lên và xử lý
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">{admin ? 'Tất cả cuộc họp' : 'Cuộc họp của bạn'}</div>
        {rows === null ? (
          <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chưa có cuộc họp nào.</p>
        ) : (
          <ul>
            {rows.map(r => (
              <li key={r.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/30">
                <Link href={`${base}/${r.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {[fmtDate(r.created_at), r.duration_seconds ? clock(r.duration_seconds) : '', admin && r.user_email.toLowerCase() !== me.toLowerCase() ? r.user_email : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </Link>
                <StatusPill r={r} />
                <button title="Xoá" onClick={() => remove(r)} className="rounded-md p-1.5 text-red-600 hover:bg-muted">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ r }: { r: Pick<Row, 'status' | 'progress'> }) {
  const p = r.progress || {};
  const label = STATUS_LABEL[r.status] + (r.status === 'transcribing' && p.total && p.total > 1 ? ` ${Math.min((p.done || 0) + 1, p.total)}/${p.total}` : '');
  if (r.status === 'completed')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> {label}
      </span>
    );
  if (r.status === 'failed')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <CircleAlert className="h-3.5 w-3.5" /> {label}
      </span>
    );
  if (r.status === 'uploading') return <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">Chưa tải xong</span>;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-semibold">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {label}
    </span>
  );
}
