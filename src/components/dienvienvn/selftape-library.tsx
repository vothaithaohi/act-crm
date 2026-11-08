'use client';

import { useState } from 'react';
import { Loader2, Plus, Star, Trash2, Video } from 'lucide-react';
import { actorFetch } from '@/lib/dienvienvn/actor-auth';
import { MAX_HIGHLIGHTS, MAX_SELFTAPES, SelfTape } from '@/lib/dienvienvn/selftapes';
import { Field, TextInput } from './form-fields';

/** Thư viện self-tape trong tài khoản diễn viên: thêm tuỳ ý, chọn tối đa 3 video nổi bật hiện trên trang công khai. */
export function SelftapeLibrary({ initial, onChange }: { initial: SelfTape[]; onChange: (list: SelfTape[]) => void }) {
  const [list, setList] = useState<SelfTape[]>(initial);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const highlights = list.filter(x => x.highlight).length;

  const save = async (next: SelfTape[]) => {
    setError('');
    setBusy(true);
    const res = await actorFetch('/api/dienvienvn/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selftapes: next })
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) {
      setError(body.error || 'Không lưu được. Vui lòng thử lại.');
      return false;
    }
    setList(body.selftapes);
    onChange(body.selftapes);
    return true;
  };

  const add = async () => {
    const u = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(u)) return setError('Link self-tape cần bắt đầu bằng https://');
    if (list.some(x => x.url === u)) return setError('Self-tape này đã có trong danh sách.');
    if (await save([...list, { url: u, title: title.trim(), highlight: highlights < MAX_HIGHLIGHTS }])) {
      setUrl('');
      setTitle('');
    }
  };
  const toggleHighlight = (i: number) => {
    const item = list[i];
    if (!item.highlight && highlights >= MAX_HIGHLIGHTS) return setError(`Chỉ chọn tối đa ${MAX_HIGHLIGHTS} self-tape nổi bật. Bỏ chọn một video trước.`);
    save(list.map((x, k) => (k === i ? { ...x, highlight: !x.highlight } : x)));
  };
  const remove = (i: number) => {
    if (!window.confirm('Xoá self-tape này khỏi hồ sơ?')) return;
    save(list.filter((_, k) => k !== i));
  };

  return (
    <section className="dv-card mt-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Self-tape của bạn</p>
          <p className="mt-1 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
            Thêm bao nhiêu self-tape cũng được. Chọn tối đa {MAX_HIGHLIGHTS} video <Star className="inline h-3.5 w-3.5 -translate-y-px fill-current" /> nổi bật để hiện
            trên trang hồ sơ công khai. Khi ứng tuyển, bạn tick các self-tape phù hợp với dự án.
          </p>
        </div>
        {busy && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--dv-text-secondary)]" />}
      </div>

      {list.length > 0 && (
        <ul className="mt-4 divide-y divide-[#f0f0f2] rounded-[14px] border border-[#e8e8ed]">
          {list.map((x, i) => (
            <li key={x.url} className="flex items-center gap-3 px-4 py-3">
              <Video className="h-4 w-4 shrink-0 text-[var(--dv-text-secondary)]" />
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{x.title || `Self-tape ${i + 1}`}</span>
                <span className="block truncate text-[12px] text-[var(--dv-text-tertiary)]">{x.url}</span>
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleHighlight(i)}
                aria-pressed={x.highlight}
                title={x.highlight ? 'Bỏ nổi bật' : 'Chọn nổi bật (hiện trên trang công khai)'}
                className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ${x.highlight ? 'bg-[#1d1d1f] text-white' : 'border border-[#d2d2d7] text-[var(--dv-text-secondary)]'}`}
              >
                <Star className={`h-3.5 w-3.5 ${x.highlight ? 'fill-current' : ''}`} /> Nổi bật
              </button>
              <button type="button" disabled={busy} onClick={() => remove(i)} aria-label="Xoá" className="rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)] hover:text-[#b00020]">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {list.length < MAX_SELFTAPES && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
          <Field label="Tên video" htmlFor="st-title">
            <TextInput id="st-title" placeholder="VD: Monologue – Mắt biếc" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Link self-tape" htmlFor="st-url">
            <TextInput id="st-url" type="url" inputMode="url" placeholder="https://youtu.be/…" value={url} onChange={e => setUrl(e.target.value)} />
          </Field>
          <button type="button" onClick={add} disabled={busy || !url.trim()} className="dv-btn dv-btn-primary !h-[52px]">
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-[12px] bg-[#fff0f0] p-3 text-[14px] text-[#b00020]">
          {error}
        </p>
      )}
    </section>
  );
}
