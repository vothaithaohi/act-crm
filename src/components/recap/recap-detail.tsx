'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Download, Loader2, Pencil, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { Meeting, Segment, STATUS_LABEL, clock, fileSafe, speakerName, transcriptText } from '@/lib/recap/types';
import { useRecapBase } from './recap-shell';
import { StatusPill } from './recap-list';
import { RecapMarkdown } from './recap-markdown';

const STEPS = ['uploading', 'transcribing', 'summarizing', 'completed'] as const;
const btn = 'inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Đã sao chép');
  } catch {
    toast.error('Trình duyệt chặn sao chép.');
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecapDetail({ id }: { id: string }) {
  const base = useRecapBase();
  const [m, setM] = useState<Meeting | null>(null);
  const [problem, setProblem] = useState('');
  // Bản đang sửa (chưa lưu)
  const [title, setTitle] = useState('');
  const [recap, setRecap] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [speakers, setSpeakers] = useState<Record<string, string>>({});
  const [editRecap, setEditRecap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/recap/meetings/${id}`).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok || !d?.meeting) {
      setProblem(d?.error || 'Không tải được cuộc họp.');
      return;
    }
    const mm = d.meeting as Meeting;
    setM(mm);
    setProblem('');
    // Đang sửa dở thì không ghi đè
    if (!dirtyRef.current) {
      setTitle(mm.title);
      setRecap(mm.recap_markdown || '');
      setSegments(mm.segments || []);
      setSpeakers(mm.speakers || {});
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  const processing = m?.status === 'transcribing' || m?.status === 'summarizing';
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [processing, load]);

  const speakerIds = useMemo(() => Array.from(new Set(segments.map(s => s.speaker))).sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))), [segments]);
  const touch = () => setDirty(true);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(`/api/recap/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || m?.title, recap_markdown: recap, segments, speakers })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Không lưu được.');
      setDirty(false);
      dirtyRef.current = false;
      setEditRecap(false);
      toast.success('Đã lưu');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (action: 'start' | 'resummarize') => {
    if (action === 'resummarize') {
      if (dirty) {
        toast.error('Bấm Lưu thay đổi trước khi tạo lại tóm tắt.');
        return;
      }
      if (!window.confirm('Tạo lại tóm tắt từ transcript hiện tại (kèm tên người nói đã đổi)? Biên bản đang có sẽ được thay thế.')) return;
    }
    const res = await authedFetch(`/api/recap/meetings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(d.error || 'Không thực hiện được.');
    load();
  };

  if (problem && !m) return <p className="mt-16 text-center text-muted-foreground">{problem}</p>;
  if (!m) return <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-muted-foreground" />;

  const txt = transcriptText(segments, speakers);
  const name = fileSafe(title || m.title);
  const stepIdx = m.status === 'failed' ? -1 : STEPS.indexOf(m.status as (typeof STEPS)[number]);
  const p = m.progress || {};

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-start gap-3">
        <Link href={base || '/'} className="mt-1 rounded-lg p-1.5 hover:bg-white" title="Danh sách">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              touch();
            }}
            className="w-full bg-transparent text-2xl font-bold outline-none focus:rounded-lg focus:bg-white focus:px-2"
          />
          <div className="mt-1 text-sm text-muted-foreground">
            {[new Date(m.created_at).toLocaleString('vi-VN'), m.duration_seconds ? clock(m.duration_seconds) : '', m.user_email].filter(Boolean).join(' · ')}
          </div>
        </div>
        <StatusPill r={m} />
      </div>

      {m.status !== 'completed' && (
        <div className="rounded-2xl border bg-white p-5">
          {m.status === 'failed' ? (
            <div className="space-y-3">
              <p className="font-semibold text-red-700">Xử lý chưa thành công.</p>
              {m.error && <p className="text-sm text-muted-foreground break-words">{m.error}</p>}
              <button onClick={() => act('start')} className={btn}>
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          ) : (
            <>
              <ol className="grid gap-3 sm:grid-cols-4">
                {STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${i === stepIdx ? 'border-black font-semibold' : i < stepIdx ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    {i < stepIdx ? <Check className="h-4 w-4" /> : i === stepIdx && s !== 'completed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4" />}
                    {STATUS_LABEL[s]}
                    {s === 'transcribing' && i === stepIdx && p.total && p.total > 1 ? ` (đoạn ${Math.min((p.done || 0) + 1, p.total)}/${p.total})` : ''}
                  </li>
                ))}
              </ol>
              {m.status === 'uploading' && <p className="mt-3 text-sm text-muted-foreground">File chưa tải lên xong. Hãy xoá cuộc họp này và tải lại.</p>}
              {processing && <p className="mt-3 text-sm text-muted-foreground">Có thể đóng trang, máy chủ vẫn xử lý tiếp. Họp 1 tiếng mất khoảng 5–10 phút.</p>}
            </>
          )}
        </div>
      )}

      {(m.status === 'completed' || segments.length > 0 || recap) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Cột trái: Meeting Recap */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <h2 className="mr-auto font-semibold">Meeting Recap</h2>
              <button className={btn} onClick={() => setEditRecap(v => !v)} disabled={!recap && !editRecap}>
                <Pencil className="h-4 w-4" /> {editRecap ? 'Xem' : 'Sửa'}
              </button>
              <button className={btn} onClick={() => copyText(recap)} disabled={!recap}>
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button className={btn} onClick={() => download(`${name}-recap.md`, `# ${title}\n\n${recap}\n`, 'text/markdown')} disabled={!recap}>
                <Download className="h-4 w-4" /> .md
              </button>
              <button className={btn} onClick={() => act('resummarize')} disabled={m.status !== 'completed'} title="Tạo lại tóm tắt từ transcript (sau khi sửa / đổi tên người nói)">
                <RefreshCw className="h-4 w-4" /> Tạo lại
              </button>
            </div>
            <div className="p-5">
              {editRecap ? (
                <textarea
                  value={recap}
                  onChange={e => {
                    setRecap(e.target.value);
                    touch();
                  }}
                  className="min-h-[60vh] w-full rounded-lg border p-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-black/10"
                />
              ) : recap ? (
                <RecapMarkdown content={recap} />
              ) : (
                <p className="text-sm text-muted-foreground">{m.status === 'summarizing' ? 'Đang tạo tóm tắt…' : 'Chưa có tóm tắt.'}</p>
              )}
            </div>
          </section>

          {/* Cột phải: Transcript */}
          <section className="rounded-2xl border bg-white lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden lg:flex lg:flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <h2 className="mr-auto font-semibold">Transcript</h2>
              <button className={btn} onClick={() => copyText(txt)} disabled={!segments.length}>
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button className={btn} onClick={() => download(`${name}-transcript.txt`, `${title}\n\n${txt}\n`, 'text/plain')} disabled={!segments.length}>
                <Download className="h-4 w-4" /> .txt
              </button>
            </div>
            {speakerIds.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b px-4 py-3">
                <span className="self-center text-xs font-semibold text-muted-foreground">Đổi tên người nói:</span>
                {speakerIds.map(sid => (
                  <input
                    key={sid}
                    value={speakers[sid] ?? ''}
                    placeholder={speakerName(sid, {})}
                    onChange={e => {
                      setSpeakers(prev => ({ ...prev, [sid]: e.target.value }));
                      touch();
                    }}
                    className="h-8 w-36 rounded-lg border px-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                ))}
              </div>
            )}
            <div className="space-y-3 p-4 lg:flex-1 lg:overflow-y-auto">
              {segments.length === 0 && <p className="text-sm text-muted-foreground">{processing ? 'Đang bóc băng…' : 'Chưa có transcript.'}</p>}
              {segments.map((s, i) => (
                <div key={i} className="grid grid-cols-[64px_1fr] gap-2">
                  <span className="pt-1 font-mono text-xs text-muted-foreground">{clock(s.t)}</span>
                  <div>
                    <div className="text-xs font-semibold">{speakerName(s.speaker, speakers)}</div>
                    <AutoText
                      value={s.text}
                      onChange={v => {
                        setSegments(prev => prev.map((x, j) => (j === i ? { ...x, text: v } : x)));
                        touch();
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3 px-4 py-3">
            <span className="text-sm text-muted-foreground">Có thay đổi chưa lưu</span>
            <button
              onClick={() => {
                setDirty(false);
                dirtyRef.current = false;
                setEditRecap(false);
                setTitle(m.title);
                setRecap(m.recap_markdown || '');
                setSegments(m.segments || []);
                setSpeakers(m.speakers || {});
              }}
              className={btn}
            >
              Huỷ
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ô chữ tự giãn theo nội dung (sửa trực tiếp transcript). */
function AutoText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[15px] leading-relaxed outline-none hover:border-[#e5e5ea] focus:border-[#d2d2d7] focus:bg-[#fafafa]"
    />
  );
}
