'use client';

import React, { useState } from 'react';
import { AlertTriangle, FileUp, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImportResult, parseGuestSheet } from '@/lib/guests/import-csv';
import { ImportedGuest } from '@/lib/guests/import-csv';

/** Nhập danh sách khách mời từ file Excel đã lưu dạng "CSV UTF-8". */
export function ImportGuestsModal({
  onClose,
  onImport
}: {
  onClose: () => void;
  onImport: (guests: ImportedGuest[]) => Promise<{ added: number; updated: number; invitations: number } | null>;
}) {
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const read = async (file: File) => {
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setResult({ guests: [], brokenEncoding: false, error: 'Chỉ nhận file .csv. Trong Excel chọn File → Save As → "CSV UTF-8 (Comma delimited)".' });
      return;
    }
    const buf = await file.arrayBuffer();
    setResult(parseGuestSheet(new TextDecoder('utf-8').decode(buf)));
  };

  const invitations = result?.guests.reduce((n, g) => n + g.invitations.length, 0) || 0;
  const canImport = !!result && !result.error && !result.brokenEncoding && result.guests.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nhập khách mời từ Excel</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4 leading-relaxed">
          <li>Mở file &ldquo;MASTER GUEST LIST SHOWCASE&rdquo; trong Excel.</li>
          <li>
            Chọn <b className="text-foreground">File → Save As</b> (hoặc Download a copy), định dạng <b className="text-foreground">CSV UTF-8 (Comma delimited)</b>. Đúng loại
            &ldquo;UTF-8&rdquo; thì mới giữ được dấu tiếng Việt.
          </li>
          <li>Chọn file vừa lưu ở dưới. Khách mời đã có (trùng email, SĐT hoặc họ tên) sẽ không bị tạo trùng.</li>
        </ol>

        <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer hover:bg-muted/40 text-sm">
          <FileUp className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">{fileName || 'Chọn file .csv'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) read(f);
            }}
          />
        </label>

        {result?.error && <p className="text-xs font-medium text-destructive">{result.error}</p>}
        {result?.brokenEncoding && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              File đang bị <b>mất dấu tiếng Việt</b> (VD: &ldquo;MAI TH? HI?P&rdquo;), nhập vào sẽ sai tên. Hãy lưu lại file bằng định dạng <b>CSV UTF-8</b> như hướng dẫn ở
              trên rồi chọn lại.
            </p>
          </div>
        )}
        {result && !result.error && result.guests.length > 0 && (
          <div className="rounded-xl border p-3 text-sm space-y-1">
            <p>
              <b>{result.guests.length}</b> khách mời · <b>{invitations}</b> lượt mời qua các Term
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {result.guests
                .slice(0, 5)
                .map(g => g.full_name)
                .join(', ')}
              {result.guests.length > 5 ? '…' : ''}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border text-xs font-semibold hover:bg-muted">
            Huỷ
          </button>
          <button
            type="button"
            disabled={!canImport || busy}
            onClick={async () => {
              if (!result) return;
              setBusy(true);
              const r = await onImport(result.guests);
              setBusy(false);
              if (r) {
                toast.success(`Đã nhập: ${r.added} khách mời mới, cập nhật ${r.updated}, thêm ${r.invitations} lượt mời`);
                onClose();
              }
            }}
            className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-40"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Nhập {result?.guests.length || ''} khách mời
          </button>
        </div>
      </div>
    </div>
  );
}
