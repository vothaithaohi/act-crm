'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import type { Components } from 'react-markdown';
import { useTx } from './i18n';

// Xem file ngay trên trang (popup toàn màn hình): Google Drive / Docs / Sheets / Slides, PDF, YouTube, ảnh.
// Không chuyển trang sang Drive; vẫn có nút "Mở tab mới" khi cần.

export type Viewable = { kind: 'frame' | 'image'; src: string; title: string; href: string };

/** Link xem được trong popup → địa chỉ nhúng; link thường → null (mở tab mới như bình thường). */
export function toViewable(href: string, title = ''): Viewable | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  const name = title || 'Tài liệu';
  if (/\.(png|jpe?g|webp|gif|avif)$/i.test(u.pathname)) return { kind: 'image', src: href, title: name, href };
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || u.searchParams.get('id');
    const folder = u.pathname.match(/\/folders\/([^/?]+)/)?.[1];
    if (id) return { kind: 'frame', src: `https://drive.google.com/file/d/${id}/preview`, title: name, href };
    if (folder) return { kind: 'frame', src: `https://drive.google.com/embeddedfolderview?id=${folder}#grid`, title: name, href };
  }
  if (host === 'docs.google.com') {
    const m = u.pathname.match(/^\/(document|spreadsheets|presentation|forms)\/d\/([^/]+)/);
    if (m) {
      const tail = m[1] === 'forms' ? 'viewform?embedded=true' : m[1] === 'presentation' ? 'embed' : 'preview';
      return { kind: 'frame', src: `https://docs.google.com/${m[1]}/d/${m[2]}/${tail}`, title: name, href };
    }
  }
  const yt = host === 'youtu.be' ? u.pathname.slice(1) : /youtube\.com$/.test(host) ? u.searchParams.get('v') || u.pathname.match(/\/(shorts|embed)\/([^/]+)/)?.[2] : null;
  if (yt) return { kind: 'frame', src: `https://www.youtube.com/embed/${yt}`, title: name, href };
  // PDF đặt ở nơi khác: dùng trình xem của Google để điện thoại cũng xem được
  if (/\.pdf$/i.test(u.pathname)) return { kind: 'frame', src: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(href)}`, title: name, href };
  return null;
}

/** Popup toàn màn hình. */
export function FileViewer({ file, onClose }: { file: Viewable; onClose: () => void }) {
  const tx = useTx();
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
  return createPortal(
    <div data-file-viewer className="fixed inset-0 z-[90] flex flex-col bg-black/85 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={file.title}>
      <div className="flex items-center gap-3 px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{file.title}</p>
        <a href={file.href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] hover:bg-white/25">
          <ExternalLink className="h-4 w-4" /> {tx('Mở tab mới')}
        </a>
        <button type="button" onClick={onClose} aria-label={tx('Đóng')} className="shrink-0 rounded-full bg-white/15 p-2 hover:bg-white/25">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2 sm:px-6 sm:pb-6" onClick={e => e.stopPropagation()}>
        {file.kind === 'image' ? (
          <div className="flex h-full items-center justify-center overflow-auto" onClick={onClose}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.src} alt={file.title} className="max-h-full max-w-full rounded-[10px] object-contain" onClick={e => e.stopPropagation()} />
          </div>
        ) : (
          <iframe src={file.src} title={file.title} className="h-full w-full rounded-[12px] bg-white" allow="autoplay; fullscreen" allowFullScreen />
        )}
      </div>
    </div>,
    document.body
  );
}

/** Link / ảnh trong nội dung Markdown mở bằng popup (dùng với AcademyMarkdown overrides). */
export function usePopupMarkdown(): { overrides: Partial<Components>; viewer: React.ReactNode } {
  const [file, setFile] = useState<Viewable | null>(null);
  const overrides: Partial<Components> = {
    a: ({ href, children }) => {
      const label = typeof children === 'string' ? children : Array.isArray(children) ? children.filter(c => typeof c === 'string').join('') : '';
      const v = href ? toViewable(href, label) : null;
      if (!v) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
            {children}
          </a>
        );
      }
      return (
        <button type="button" onClick={() => setFile(v)} className="font-medium text-left underline underline-offset-2">
          {children}
        </button>
      );
    },
    img: ({ src, alt }) =>
      typeof src === 'string' && src ? (
        <button type="button" onClick={() => setFile({ kind: 'image', src, title: alt || 'Ảnh', href: src })} className="mt-4 block w-full cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || ''} loading="lazy" className="w-full rounded-[12px] bg-[#f5f5f7] object-cover" />
        </button>
      ) : null
  };
  return { overrides, viewer: file ? <FileViewer file={file} onClose={() => setFile(null)} /> : null };
}
