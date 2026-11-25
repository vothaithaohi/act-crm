'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileText, Maximize2, X } from 'lucide-react';
import type { Components } from 'react-markdown';
import { useTx } from './i18n';

// Xem file ngay trên trang (popup toàn màn hình): Google Drive / Docs / Sheets / Slides, PDF, YouTube, ảnh.
// Không chuyển trang sang Drive; vẫn có nút "Mở tab mới" khi cần.

export type Viewable = { kind: 'frame' | 'image' | 'pages'; src: string; title: string; href: string; pages?: string[]; download?: string };

/** Link tải về (Supabase Storage: ?download= buộc trình duyệt tải file thay vì mở). */
export const downloadHref = (url: string, name: string) =>
  /supabase\.co\/storage\//.test(url) ? `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}` : url;

/** Tài liệu PDF trong mô tả: link có title "pdf-pages:ảnh1|ảnh2…" (ảnh từng trang, tạo sẵn khi Admin tải PDF). */
export function parsePdfLink(href: string | undefined, title: string | undefined | null): { url: string; pages: string[] } | null {
  if (!href) return null;
  if (title && title.startsWith('pdf-pages:')) return { url: href, pages: title.slice(10).split('|').filter(Boolean) };
  return null;
}

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
        {file.download ? (
          <a href={downloadHref(file.download, file.title)} download={file.title} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#1d1d1f] hover:bg-white/90">
            <Download className="h-4 w-4" /> {tx('Tải PDF')}
          </a>
        ) : (
          <a href={file.href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] hover:bg-white/25">
            <ExternalLink className="h-4 w-4" /> {tx('Mở tab mới')}
          </a>
        )}
        <button type="button" onClick={onClose} aria-label={tx('Đóng')} className="shrink-0 rounded-full bg-white/15 p-2 hover:bg-white/25">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2 sm:px-6 sm:pb-6" onClick={e => e.stopPropagation()}>
        {file.kind === 'pages' ? (
          <div className="mx-auto h-full max-w-[900px] space-y-4 overflow-y-auto pb-6" onClick={onClose}>
            {(file.pages || []).map((u, i) => (
              <figure key={u} className="relative" onClick={e => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`${file.title} – trang ${i + 1}`} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" className="min-h-[240px] w-full rounded-[6px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]" />
                <figcaption className="mt-1.5 text-center text-[12px] text-white/60">
                  {i + 1} / {(file.pages || []).length}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : file.kind === 'image' ? (
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

/**
 * Khung tài liệu PDF trong mô tả: tên file, số trang, các trang xem ngay (cuộn), nút Toàn màn hình và Tải PDF.
 * Toàn bộ là thẻ inline (span) để nằm hợp lệ trong đoạn văn Markdown.
 */
export function PdfDocBlock({ name, url, pages, onOpen }: { name: string; url: string; pages: string[]; onOpen: (v: Viewable) => void }) {
  const tx = useTx();
  const fileName = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
  const open = () => onOpen({ kind: 'pages', src: url, href: url, title: fileName, pages, download: url });
  return (
    <span className="not-prose my-4 block overflow-hidden rounded-[16px] border border-[#e5e5ea] bg-[#f5f5f7]">
      <span className="flex items-center gap-3 border-b border-[#e5e5ea] bg-white px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#fdecea] text-[#d93025]">
          <FileText className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-[#1d1d1f]">{fileName}</span>
          <span className="block text-[12px] text-[#86868b]">{tx(`PDF · ${pages.length} trang`)}</span>
        </span>
        <button type="button" onClick={open} title={tx('Xem toàn màn hình')} aria-label={tx('Xem toàn màn hình')} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] hover:bg-[#f0f0f2] sm:inline-flex">
          <Maximize2 className="h-4 w-4" />
        </button>
        <a href={downloadHref(url, fileName)} download={fileName} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 text-[13px] font-semibold !text-white !no-underline hover:bg-black">
          <Download className="h-4 w-4" /> {tx('Tải PDF')}
        </a>
      </span>
      <span className="block max-h-[420px] space-y-3 overflow-y-auto p-3 sm:p-4">
        {pages.map((u, i) => (
          <button key={u} type="button" onClick={open} className="block w-full cursor-zoom-in" aria-label={tx(`Xem trang ${i + 1}`)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`${fileName} – trang ${i + 1}`} loading={i < 1 ? 'eager' : 'lazy'} decoding="async" className="!m-0 block min-h-[200px] w-full rounded-[6px] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)]" />
          </button>
        ))}
      </span>
      <button type="button" onClick={open} className="block w-full border-t border-[#e5e5ea] bg-white py-2.5 text-center text-[13px] font-semibold text-[#1d1d1f] hover:bg-[#fafafa] sm:hidden">
        {tx('Xem toàn màn hình')}
      </button>
    </span>
  );
}

/** Link / ảnh trong nội dung Markdown mở bằng popup (dùng với AcademyMarkdown overrides). */
/** Link tải về của file Google Drive (để diễn viên tải kịch bản về in). */
function driveDownload(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname.replace(/^www\./, '') !== 'drive.google.com') return null;
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || u.searchParams.get('id');
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : null;
  } catch {
    return null;
  }
}

/** Nội dung file nhúng thẳng trong trang (Drive, Docs, PDF, YouTube): xem ngay, có Toàn màn hình / Tải về. */
function InlineEmbed({ v, onOpen }: { v: Viewable; onOpen: (v: Viewable) => void }) {
  const tx = useTx();
  const video = /youtube\.com\/embed\//.test(v.src);
  const dl = driveDownload(v.href);
  return (
    <span className="not-prose my-4 block overflow-hidden rounded-[16px] border border-[#e5e5ea] bg-[#f5f5f7]">
      <span className="flex items-center gap-3 border-b border-[#e5e5ea] bg-white px-4 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#eef3fd] text-[#0b57d0]">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#1d1d1f]">{v.title}</span>
        <button type="button" onClick={() => onOpen(v)} title={tx('Xem toàn màn hình')} aria-label={tx('Xem toàn màn hình')} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] hover:bg-[#f0f0f2]">
          <Maximize2 className="h-4 w-4" />
        </button>
        {dl ? (
          <a href={dl} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3.5 text-[13px] font-semibold !text-white !no-underline hover:bg-black">
            <Download className="h-4 w-4" /> {tx('Tải về')}
          </a>
        ) : (
          <a href={v.href} target="_blank" rel="noopener noreferrer" title={tx('Mở tab mới')} aria-label={tx('Mở tab mới')} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] hover:bg-[#f0f0f2]">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </span>
      <iframe
        src={v.src}
        title={v.title}
        loading="lazy"
        allow="autoplay; fullscreen"
        allowFullScreen
        className={`block w-full bg-white ${video ? 'aspect-video' : 'h-[60vh] min-h-[360px]'}`}
      />
    </span>
  );
}

/** inline: link xem được (Drive, Docs, PDF, YouTube) hiện thẳng nội dung thay vì chữ phải bấm thêm. */
export function usePopupMarkdown({ inline = false }: { inline?: boolean } = {}): { overrides: Partial<Components>; viewer: React.ReactNode; open: (v: Viewable) => void } {
  const [file, setFile] = useState<Viewable | null>(null);
  const overrides: Partial<Components> = {
    a: ({ href, children, title }) => {
      const label = typeof children === 'string' ? children : Array.isArray(children) ? children.filter(c => typeof c === 'string').join('') : '';
      const pdf = parsePdfLink(href, title);
      if (pdf) return <PdfDocBlock name={label || 'Tài liệu'} url={pdf.url} pages={pdf.pages} onOpen={setFile} />;
      const v = href ? toViewable(href, label) : null;
      if (v && inline && v.kind === 'frame') return <InlineEmbed v={v} onOpen={setFile} />;
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
  return { overrides, viewer: file ? <FileViewer file={file} onClose={() => setFile(null)} /> : null, open: setFile };
}
