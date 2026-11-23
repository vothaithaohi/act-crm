'use client';

import { useState } from 'react';
import { ChevronDown, Video } from 'lucide-react';
import type { SelftapeItem, SelftapeRequest } from '@/lib/projects/types';
import type { SelfTape } from '@/lib/dienvienvn/selftapes';
import { AcademyMarkdown } from './academy-markdown';
import { useTx } from './i18n';

// Yêu cầu self-tape theo vai: xem mô tả chuẩn (chữ, ảnh, link) và nộp mỗi yêu cầu 1 link.

function Brief({ text, defaultOpen = false }: { text: string; defaultOpen?: boolean }) {
  const tx = useTx();
  const [open, setOpen] = useState(defaultOpen);
  if (!text.trim()) return null;
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--dv-text)] hover:underline">
        {tx(open ? 'Ẩn yêu cầu' : 'Xem yêu cầu chi tiết')}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-[12px] bg-[var(--dv-bg-alt)] p-4 [&_p]:!mt-3 [&_p]:!text-[15px] [&_li]:!text-[15px] [&_h2]:!mt-4 [&_h2]:!text-[19px] [&_h3]:!mt-4 [&_h3]:!text-[17px]">
          <AcademyMarkdown content={text} />
        </div>
      )}
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
            <Brief text={q.brief} />
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
          <Brief text={q.brief} />
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
