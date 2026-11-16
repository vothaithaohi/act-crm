'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Bản nháp tin tuyển ekip: tự lưu 5 giây sau lần sửa cuối + nút "Lưu nháp". Dùng chung cho CRM và cổng đối tác.

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export type DraftSaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; at?: string; error?: string };

const AUTOSAVE_MS = 5000;

export function useCrewJobDraft<T>({
  endpoint,
  fetcher,
  form,
  enabled,
  initialId
}: {
  endpoint: string;
  fetcher: Fetcher;
  form: T | null;
  /** false: không lưu nháp (VD đang sửa tin đã đăng) */
  enabled: boolean;
  initialId?: string | null;
}) {
  const [id, setId] = useState<string | null>(initialId || null);
  const [state, setState] = useState<DraftSaveState>({ status: initialId ? 'saved' : 'idle' });
  const idRef = useRef<string | null>(initialId || null);
  // Nội dung lúc mở form và lần lưu gần nhất: chưa sửa gì thì không tạo bản nháp
  const baseline = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const latest = useRef(form);
  latest.current = form;

  const save = useCallback(async (): Promise<boolean> => {
    // Chờ lần lưu đang chạy (tránh tạo 2 bản nháp)
    if (running.current) await running.current.catch(() => undefined);
    const current = latest.current;
    if (!current) return false;
    const json = JSON.stringify(current);
    if (json === lastSaved.current && idRef.current) return true;
    const task = (async () => {
      setState(s => ({ ...s, status: 'saving' }));
      try {
        const res = await fetcher(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: idRef.current, form: current })
        });
        const b = await res.json().catch(() => ({}));
        if (b.mode === 'demo') {
          setState({ status: 'error', error: 'Chế độ demo không lưu nháp.' });
          return false;
        }
        if (!res.ok || !b.draft?.id) {
          setState({ status: 'error', error: b.error || 'Chưa lưu được nháp.' });
          return false;
        }
        idRef.current = b.draft.id;
        setId(b.draft.id);
        lastSaved.current = json;
        setState({ status: 'saved', at: b.draft.updated_at });
        return true;
      } catch {
        setState({ status: 'error', error: 'Mất kết nối, chưa lưu được nháp.' });
        return false;
      }
    })();
    running.current = task;
    const ok = await task;
    running.current = null;
    return ok;
  }, [endpoint, fetcher]);

  // Tự lưu khi đã sửa so với lúc mở
  useEffect(() => {
    if (!enabled || !form) return;
    const json = JSON.stringify(form);
    if (baseline.current === null) {
      baseline.current = json;
      lastSaved.current = idRef.current ? json : null;
      return;
    }
    if (json === lastSaved.current || (!idRef.current && json === baseline.current)) return;
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [form, enabled, save]);

  /** Có thay đổi chưa lưu nháp. */
  const dirty = () => {
    if (!enabled || !latest.current || baseline.current === null) return false;
    const json = JSON.stringify(latest.current);
    return json !== lastSaved.current && (!!idRef.current || json !== baseline.current);
  };

  /** Đóng form: lưu ngay phần chưa lưu. */
  const flush = useCallback(async () => {
    if (dirty()) await save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, enabled]);

  /** Đã đăng tin: xoá bản nháp. */
  const discard = useCallback(async () => {
    if (running.current) await running.current.catch(() => undefined);
    const current = idRef.current;
    if (!current) return;
    idRef.current = null;
    setId(null);
    await fetcher(`${endpoint}?id=${encodeURIComponent(current)}`, { method: 'DELETE' }).catch(() => undefined);
  }, [endpoint, fetcher]);

  return { id, state, save, flush, discard };
}

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');

/** Dòng trạng thái nhỏ cạnh nút: "Đã lưu nháp lúc 10:42". */
export function DraftStatus({ state, className = '' }: { state: DraftSaveState; className?: string }) {
  if (state.status === 'idle') return null;
  const text =
    state.status === 'saving' ? 'Đang lưu nháp…' : state.status === 'saved' ? `Đã lưu nháp lúc ${time(state.at)}` : state.error || 'Chưa lưu được nháp.';
  return (
    <span role="status" className={`${state.status === 'error' ? 'text-[#b00020]' : ''} ${className}`}>
      {text}
    </span>
  );
}
