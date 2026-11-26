'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronRight, Library, Plus, Video, X } from 'lucide-react';
import { SelftapeItem, SelftapeRequest, hasBrief } from '@/lib/projects/types';
import type { SelfTape } from '@/lib/dienvienvn/selftapes';
import { AcademyMarkdown } from './academy-markdown';
import { PdfDocBlock, usePopupMarkdown } from './file-viewer';
import { useTx } from './i18n';
import { normalizeLink } from '@/lib/dienvienvn/social-link';

// Yêu cầu self-tape theo vai: xem mô tả chuẩn (chữ, ảnh, link, PDF) trong popup và nộp mỗi yêu cầu 1 link.

// Đã có link dùng được (tự thêm https:// nếu thiếu)
const isUrl = (u: string) => !!normalizeLink(u);

/** Popup "Xem yêu cầu": tên, Bắt buộc / Không bắt buộc, mô tả và file PDF đính kèm. */
function BriefDialog({ q, onClose }: { q: SelftapeRequest; onClose: () => void }) {
  const tx = useTx();
  // Link kịch bản (Drive, Docs, PDF), video YouTube, ảnh trong mô tả: mở popup xem file, không chuyển trang
  const { overrides, viewer, open } = usePopupMarkdown({ inline: true });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[data-file-viewer]') && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={q.title}
        onClick={e => e.stopPropagation()}
        className="dv-pop flex h-[100dvh] w-full flex-col bg-white sm:h-auto sm:max-h-[88vh] sm:max-w-[720px] sm:rounded-[22px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#f0f0f2] px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--dv-text-secondary)]">
              {tx('Yêu cầu self-tape')} · {tx(q.required ? 'Bắt buộc' : 'Không bắt buộc')}
            </p>
            <h2 className="dv-display mt-0.5 text-[22px] font-semibold leading-[1.2]">{q.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={tx('Đóng')} className="-mr-1 shrink-0 rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 sm:px-7 [&_p]:!text-[16px] [&_li]:!text-[16px]">
          {q.brief.trim() && <AcademyMarkdown content={q.brief} overrides={overrides} />}
          {(q.files || []).map(f => (
            <PdfDocBlock key={f.url} name={f.name} url={f.url} pages={f.pages} onOpen={open} />
          ))}
        </div>
      </div>
      {viewer}
    </div>,
    document.body
  );
}

/** Nút mở popup yêu cầu: "link" = chữ "Xem yêu cầu chi tiết ›", "pill" = nút nhỏ "Xem". */
function BriefButton({ q, variant = 'pill' }: { q: SelftapeRequest; variant?: 'link' | 'pill' }) {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  if (!hasBrief(q)) return null;
  return (
    <>
      {variant === 'link' ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-0.5 text-[14px] font-semibold text-[var(--dv-text)] hover:underline">
          {tx('Xem yêu cầu chi tiết')} <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-[#d2d2d7] bg-white pl-3 pr-2 text-[13px] font-semibold text-[var(--dv-text)] transition-colors hover:border-[#86868b]"
        >
          {tx('Xem')} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
      {open && <BriefDialog q={q} onClose={() => setOpen(false)} />}
    </>
  );
}

function RequiredTag({ required }: { required: boolean }) {
  const tx = useTx();
  return required ? (
    <span className="shrink-0 rounded-full bg-[#fff1f0] px-2 py-0.5 text-[11px] font-semibold text-[#b00020]">{tx('Bắt buộc')}</span>
  ) : (
    <span className="shrink-0 rounded-full bg-[var(--dv-bg-alt)] px-2 py-0.5 text-[11px] font-semibold text-[var(--dv-text-secondary)]">{tx('Tuỳ chọn')}</span>
  );
}

/** Danh sách yêu cầu self-tape trên thẻ vai: mỗi yêu cầu 1 dòng (số, tên, nhãn, nút Xem). */
export function SelftapeRequestsInfo({ requests }: { requests: SelftapeRequest[] }) {
  const tx = useTx();
  if (!requests.length) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-[#e8e8ed]">
      <p className="flex items-center gap-2 bg-[var(--dv-bg-alt)] px-4 py-2.5 text-[13px] font-semibold text-[var(--dv-text-secondary)]">
        <Video className="h-4 w-4" /> {tx(`Self-tape cần gửi (${requests.length})`)}
      </p>
      <ol className="divide-y divide-[#f0f0f2]">
        {requests.map((q, i) => (
          <li key={q.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[12px] font-semibold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{q.title}</span>
            </span>
            <RequiredTag required={q.required} />
            <BriefButton q={q} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Ô link + nút "Kho" (chọn nhanh từ kho self-tape của diễn viên). */
function TapeField({
  id,
  label,
  value,
  onChange,
  library
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  library: SelfTape[];
}) {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const bad = !!value.trim() && normalizeLink(value) === null;
  return (
    <div ref={box} className="relative mt-3">
      <div className={`flex items-center rounded-[12px] border bg-white transition-colors focus-within:border-[#1d1d1f] ${bad ? 'border-[#b00020]' : 'border-[#d2d2d7]'}`}>
        <input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => {
            const n = normalizeLink(value);
            if (n !== null && n !== value) onChange(n);
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={tx('Dán link YouTube / Google Drive…')}
          aria-label={label}
          className="h-11 min-w-0 flex-1 rounded-[12px] bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[var(--dv-text-tertiary)]"
        />
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label={tx('Xoá link')} className="mr-1 rounded-full p-1.5 text-[var(--dv-text-tertiary)] hover:bg-[var(--dv-bg-alt)]">
            <X className="h-4 w-4" />
          </button>
        )}
        {library.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className="mr-1.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[var(--dv-bg-alt)] px-3 text-[13px] font-semibold text-[var(--dv-text)] hover:bg-[#e8e8ed]"
          >
            <Library className="h-3.5 w-3.5" /> {tx('Kho')}
          </button>
        )}
      </div>
      {bad && <p className="mt-1 text-[12px] text-[#b00020]">{tx('Chưa nhận ra link này. Hãy dán link YouTube / Google Drive.')}</p>}
      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-[240px] overflow-y-auto rounded-[14px] border border-[#e8e8ed] bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
          <li className="px-3.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--dv-text-tertiary)]">{tx('Kho self-tape của bạn')}</li>
          {library.map((t, k) => (
            <li key={t.url}>
              <button
                type="button"
                onClick={() => {
                  onChange(t.url);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--dv-bg-alt)]"
              >
                <Video className="h-4 w-4 shrink-0 text-[var(--dv-text-secondary)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{t.title || `Self-tape ${k + 1}`}</span>
                  <span className="block truncate text-[12px] text-[var(--dv-text-tertiary)]">{t.url}</span>
                </span>
                {value === t.url && <Check className="h-4 w-4 shrink-0 text-[#1d7a3a]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Ô nộp self-tape cho từng yêu cầu: 1 ô link (+ chọn từ kho), dấu ✓ xanh khi đã có link. */
export function SelftapeRequestsInput({
  requests,
  library,
  value,
  onChange,
  idPrefix
}: {
  requests: SelftapeRequest[];
  library: SelfTape[];
  value: SelftapeItem[];
  onChange: (v: SelftapeItem[]) => void;
  idPrefix: string;
}) {
  const tx = useTx();
  const urlOf = (id: string) => value.find(v => v.request_id === id)?.url || '';
  const setUrl = (id: string, url: string) => onChange([...value.filter(v => v.request_id !== id), { request_id: id, url }]);
  const done = requests.filter(q => isUrl(urlOf(q.id))).length;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--dv-text-secondary)]">{tx(`Đã có ${done}/${requests.length} self-tape`)}</p>
      {requests.map((q, i) => {
        const ok = isUrl(urlOf(q.id));
        return (
          <div key={q.id} className={`rounded-[16px] border bg-white p-4 transition-colors ${ok ? 'border-[#bfe5c9]' : 'border-[#e8e8ed]'}`}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${ok ? 'bg-[#1d7a3a] text-white' : 'bg-[var(--dv-bg-alt)] text-[var(--dv-text)]'}`}
                aria-label={ok ? tx('Đã có link') : undefined}
              >
                {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{q.title}</span>
              <RequiredTag required={q.required} />
              <BriefButton q={q} />
            </div>
            <TapeField id={`${idPrefix}-${q.id}`} label={tx(`Link self-tape: ${q.title}`)} value={urlOf(q.id)} onChange={v => setUrl(q.id, v)} library={library} />
          </div>
        );
      })}
    </div>
  );
}

/** Phần "Gửi thêm self-tape khác" thu gọn (bấm mới mở). */
export function ExtraSelftapes({ defaultOpen = false, children }: { defaultOpen?: boolean; children: React.ReactNode }) {
  const tx = useTx();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[16px] border border-dashed border-[#d2d2d7]">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-semibold text-[var(--dv-text)]">
        <Plus className={`h-4 w-4 transition-transform ${open ? 'rotate-45' : ''}`} />
        <span className="flex-1">{tx('Gửi thêm self-tape khác')}</span>
        <span className="text-[12px] font-normal text-[var(--dv-text-tertiary)]">{tx('Không bắt buộc')}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--dv-text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-4 border-t border-dashed border-[#d2d2d7] px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

/** Dùng ở form nộp hồ sơ mới: chỉ có nút xem chi tiết dạng chữ. */
export { BriefButton };
