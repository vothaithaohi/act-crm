'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Video, X } from 'lucide-react';
import type { SelftapeItem, SelftapeRequest } from '@/lib/projects/types';
import type { SelfTape } from '@/lib/dienvienvn/selftapes';
import { AcademyMarkdown } from './academy-markdown';
import { usePopupMarkdown } from './file-viewer';
import { useTx } from './i18n';

// Yêu cầu self-tape theo vai: xem mô tả chuẩn (chữ, ảnh, link) và nộp mỗi yêu cầu 1 link.

/** "Xem yêu cầu chi tiết": mở popup giữa màn hình (điện thoại: toàn màn hình) với mô tả đầy đủ. */
function Brief({ q }: { q: SelftapeRequest }) {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  // Link kịch bản (Drive, Docs, PDF), video YouTube, ảnh trong mô tả: mở popup xem file, không chuyển trang
  const { overrides, viewer } = usePopupMarkdown();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[data-file-viewer]') && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!q.brief.trim()) return null;
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--dv-text)] hover:underline">
        {tx('Xem yêu cầu chi tiết')}
        <ChevronRight className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={() => setOpen(false)}>
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
                <button type="button" onClick={() => setOpen(false)} aria-label={tx('Đóng')} className="-mr-1 shrink-0 rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 sm:px-7 [&_p]:!text-[16px] [&_li]:!text-[16px]">
                <AcademyMarkdown content={q.brief} overrides={overrides} />
              </div>
            </div>
          </div>,
          document.body
        )}
      {viewer}
    </div>
  );
}

/** Danh sách yêu cầu self-tape trên thẻ vai (chỉ xem). */
export function SelftapeRequestsInfo({ requests }: { requests: SelftapeRequest[] }) {
  const tx = useTx();
  if (!requests.length) return null;
  return (
    <div className="mt-4 rounded-[14px] border border-[#e8e8ed] p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <Video className="h-4 w-4" /> {tx(`Yêu cầu self-tape (${requests.length})`)}
      </p>
      <ol className="mt-2 space-y-3">
        {requests.map((q, i) => (
          <li key={q.id} className="text-[15px]">
            <p>
              <span className="font-semibold">
                {i + 1}. {q.title}
              </span>{' '}
              <span className="text-[13px] text-[var(--dv-text-secondary)]">· {tx(q.required ? 'Bắt buộc' : 'Không bắt buộc')}</span>
            </p>
            <Brief q={q} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Ô nộp self-tape cho từng yêu cầu (dán link hoặc chọn từ kho self-tape của diễn viên). */
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
  return (
    <div className="space-y-3">
      {requests.map((q, i) => (
        <div key={q.id} className="rounded-[14px] border border-[#e8e8ed] bg-white p-4">
          <p className="text-[15px] font-semibold">
            {i + 1}. {q.title}
            {q.required ? <span className="text-[#b00020]"> *</span> : <span className="text-[13px] font-normal text-[var(--dv-text-secondary)]"> · {tx('Không bắt buộc')}</span>}
          </p>
          <Brief q={q} />
          <input
            id={`${idPrefix}-${q.id}`}
            type="url"
            inputMode="url"
            value={urlOf(q.id)}
            onChange={e => setUrl(q.id, e.target.value)}
            placeholder={tx('Dán link YouTube / Google Drive…')}
            aria-label={tx(`Link self-tape: ${q.title}`)}
            className="dv-input mt-3"
          />
          {library.length > 0 && (
            <select
              value=""
              onChange={e => e.target.value && setUrl(q.id, e.target.value)}
              aria-label={tx('Chọn từ kho self-tape')}
              className="mt-2 w-full rounded-[10px] border border-[#d2d2d7] bg-white px-3 py-2 text-[14px] text-[var(--dv-text-secondary)]"
            >
              <option value="">{tx('Hoặc chọn từ kho self-tape của bạn…')}</option>
              {library.map((t, k) => (
                <option key={t.url} value={t.url}>
                  {t.title || `Self-tape ${k + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
