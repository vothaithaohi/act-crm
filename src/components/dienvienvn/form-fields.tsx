'use client';


import { useTx } from './i18n';
import { useId, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export function Field({
  label,
  required,
  hint,
  error,
  children,
  htmlFor,
  className = ''
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  const tx = useTx();
  return (
    <div className={className}>
      <label className="dv-field-label" htmlFor={htmlFor}>
        {tx(label)}
        {required && <span className="ml-0.5 text-[var(--dv-red)]">*</span>}
      </label>
      {tx(children)}
      {error ? (
        <p className="dv-field-error" role="alert">
          {tx(error)}
        </p>
      ) : hint ? (
        <p className="dv-field-hint">{tx(hint)}</p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function TextInput({ invalid, className = '', ...props }: InputProps) {
  return <input {...props} aria-invalid={invalid || undefined} className={`dv-input ${invalid ? 'dv-invalid' : ''} ${className}`} />;
}

export function SelectInput({
  invalid,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  const tx = useTx();
  return (
    <select {...props} aria-invalid={invalid || undefined} className={`dv-input ${invalid ? 'dv-invalid' : ''} ${className}`}>
      {tx(children)}
    </select>
  );
}

export function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  const tx = useTx();
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h3 className="text-[19px] font-semibold leading-[1.21] tracking-[0.012em]">{tx(title)}</h3>
        {desc && <p className="mt-1 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">{tx(desc)}</p>}
      </div>
      {tx(action)}
    </div>
  );
}

/** Nhóm nút chọn nhiều (chip), lưu dạng mảng chuỗi. */
export function ChipGroup({
  options,
  value,
  onChange,
  exclusive,
  label
}: {
  options: { id: string; label: string }[] | string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Lựa chọn loại trừ các lựa chọn khác (VD: "Không có hình xăm"). */
  exclusive?: string;
  label: string;
}) {
  const tx = useTx();
  const items = (options as (string | { id: string; label: string })[]).map(o =>
    typeof o === 'string' ? { id: o, label: o } : o
  );
  const toggle = (id: string) => {
    const active = value.includes(id);
    if (active) return onChange(value.filter(v => v !== id));
    if (exclusive && id === exclusive) return onChange([id]);
    return onChange([...value.filter(v => v !== exclusive), id]);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tx(label)}>
      {items.map(item => (
        <button key={item.id} type="button" className="dv-chip" aria-pressed={value.includes(item.id)} onClick={() => toggle(item.id)}>
          {value.includes(item.id) && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          {tx(item.label)}
        </button>
      ))}
    </div>
  );
}

export function CheckOption({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  const tx = useTx();
  return (
    <button type="button" role="checkbox" aria-checked={checked} className="dv-option" onClick={onChange}>
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
          checked ? 'border-[var(--dv-accent)] bg-[var(--dv-accent)] text-white' : 'border-[#c7c7cc] bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className={checked ? 'text-[var(--dv-text)]' : 'text-[var(--dv-text)]'}>{tx(children)}</span>
    </button>
  );
}

/** Thu nhỏ ảnh trên trình duyệt trước khi tải lên (cạnh dài tối đa 1600px, JPEG) để tải nhanh trên 4G. */
async function resizeImage(file: File, maxEdge = 1600, quality = 0.86): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = objectUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('encode');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type UploadTry = { ok: true; url: string } | { ok: false; message: string; retry: boolean; status: number; body: string };

function uploadOnce(blob: Blob, kind: string, onProgress: (pct: number) => void): Promise<UploadTry> {
  return new Promise(resolve => {
    const form = new FormData();
    form.append('file', new File([blob], `${kind}.jpg`, { type: 'image/jpeg' }));
    form.append('kind', kind);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/dienvienvn/upload');
    xhr.timeout = 90_000;
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { url?: string; error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* máy chủ trả trang lỗi (hết thời gian, file quá lớn…) */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) return resolve({ ok: true, url: data.url });
      const message =
        data?.error ||
        (xhr.status === 413 ? 'Ảnh quá lớn. Hãy thử ảnh khác hoặc chụp lại.' : `Không tải được ảnh lên (mã ${xhr.status || 0}). Vui lòng thử lại.`);
      // Lỗi tạm thời phía máy chủ → thử lại
      resolve({ ok: false, message, retry: xhr.status >= 500 || xhr.status === 0 || xhr.status === 429 || !data, status: xhr.status, body: xhr.responseText.slice(0, 300) });
    };
    xhr.onerror = () => resolve({ ok: false, message: 'Mất kết nối mạng. Vui lòng thử lại.', retry: true, status: 0, body: '' });
    xhr.ontimeout = () => resolve({ ok: false, message: 'Mạng chậm, chưa tải được ảnh. Vui lòng thử lại.', retry: true, status: 0, body: 'timeout' });
    xhr.send(form);
  });
}

/** Tải ảnh lên, tự thử lại tối đa 3 lần khi lỗi tạm thời; lỗi cuối cùng được ghi về log máy chủ để tìm nguyên nhân. */
async function uploadWithProgress(blob: Blob, kind: string, onProgress: (pct: number) => void): Promise<string> {
  let last: UploadTry | null = null;
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise(r => setTimeout(r, 1200 * i));
    last = await uploadOnce(blob, kind, onProgress);
    if (last.ok) return last.url;
    if (!last.retry) break;
  }
  const fail = last as Exclude<UploadTry, { ok: true }>;
  try {
    const body = JSON.stringify({ message: `Upload ảnh lỗi: ${fail.status} ${fail.message}`, stack: `size=${blob.size} kind=${kind} body=${fail.body}`, url: window.location.href });
    navigator.sendBeacon?.('/api/dienvienvn/client-error', new Blob([body], { type: 'application/json' }));
  } catch {
    /* bỏ qua */
  }
  throw new Error(fail.message);
}

/** Thu nhỏ + tải 1 ảnh lên kho ảnh công khai, trả link ảnh (dùng cho ảnh tham khảo của vai). */
export async function uploadPublicImage(file: File, kind: 'role' | 'academy', onProgress: (pct: number) => void = () => undefined): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new Error('Vui lòng chọn file ảnh.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 25MB).');
  let blob: Blob;
  try {
    blob = await resizeImage(file);
  } catch {
    throw new Error('Không đọc được ảnh này. Hãy thử ảnh JPG hoặc PNG khác.');
  }
  return uploadWithProgress(blob, kind, onProgress);
}

export function PhotoUpload({
  kind,
  label,
  hint,
  required,
  value,
  onChange,
  error
}: {
  kind: 'headshot' | 'fullbody' | 'compcard' | 'gallery';
  label: string;
  hint: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const tx = useTx();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setUploadError('Vui lòng chọn file ảnh.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Ảnh quá lớn (tối đa 25MB).');
      return;
    }
    setUploadError('');
    setBusy(true);
    setProgress(0);
    try {
      let blob: Blob;
      try {
        blob = await resizeImage(file);
      } catch {
        throw new Error('Không đọc được ảnh này. Hãy thử ảnh JPG hoặc PNG khác.');
      }
      const url = await uploadWithProgress(blob, kind, setProgress);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Không tải được ảnh lên.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shownError = uploadError || error;

  return (
    <div>
      <label className="dv-field-label" htmlFor={inputId}>
        {tx(label)}
        {required && <span className="ml-0.5 text-[var(--dv-red)]">*</span>}
      </label>
      <div
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-[16px] border transition-colors ${
          shownError ? 'border-[var(--dv-red)] bg-[#fff8f8]' : value ? 'border-transparent bg-[#f5f5f7]' : 'border-dashed border-[#c7c7cc] bg-[#fbfbfd] hover:border-[#86868b]'
        }`}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          if (!busy) handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={tx(label)} className="h-full w-full object-cover object-top" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
          >
            <ImagePlus className="h-8 w-8 text-[var(--dv-accent)]" strokeWidth={1.4} />
            <span className="text-[15px] font-medium text-[var(--dv-accent)]">{tx("Chọn ảnh")}</span>
            <span className="text-[12px] leading-[1.33] text-[var(--dv-text-secondary)]">{tx(hint)}</span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-accent)]" />
            <span className="text-[13px] text-[var(--dv-text-secondary)]">{tx("Đang tải lên…")} {tx(progress)}%</span>
            <div className="h-1 w-2/3 overflow-hidden rounded-full bg-[#e8e8ed]">
              <div className="h-full bg-[var(--dv-accent)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {value && !busy && (
        <div className="mt-2 flex items-center gap-4 text-[14px]">
          <button type="button" className="dv-link" onClick={() => inputRef.current?.click()}>
            <RefreshCw className="h-3.5 w-3.5" /> {tx("Đổi ảnh")}
          </button>
          <button type="button" className="inline-flex items-center gap-1 text-[var(--dv-text-secondary)] hover:text-[var(--dv-red)]" onClick={() => onChange('')}>
            <Trash2 className="h-3.5 w-3.5" /> {tx("Xoá")}
          </button>
        </div>
      )}
      {shownError && (
        <p className="dv-field-error" role="alert">
          {tx(shownError)}
        </p>
      )}
    </div>
  );
}
