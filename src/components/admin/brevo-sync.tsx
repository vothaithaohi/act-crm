'use client';

import { useEffect, useState } from 'react';
import { Loader2, MailPlus } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { useCRM } from '@/lib/store/crm-context';

// Super Admin: đưa toàn bộ email diễn viên, nhà sản xuất, ekip của dienvienvn.com sang 3 danh sách Brevo.
// (Không gồm nhân sự CRM.) Người đăng ký mới được tự đưa sang, nút này dùng cho email cũ / đồng bộ lại.
type Result = { actor: number; partner: number; crew: number; at: string };
const KEY = 'act-brevo-last-sync';

export function BrevoSyncMenu() {
  const { realRole, viewAsRole } = useCRM();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Result | null>(null);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v) setLast(JSON.parse(v));
    } catch {
      /* bỏ qua */
    }
  }, []);
  if (realRole !== 'super_admin' || viewAsRole) return null;

  const run = async () => {
    if (!window.confirm('Đồng bộ toàn bộ email Diễn viên, Nhà sản xuất, Ekip của dienvienvn.com sang Brevo? Email đã có sẽ được cập nhật, không bị trùng.')) return;
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/brevo-sync', { method: 'POST' });
      const b = await res.json().catch(() => ({}));
      if (b.mode === 'demo') return void toast.info('Chế độ demo không đồng bộ Brevo.');
      if (!res.ok && res.status !== 207) return void toast.error(b.error || 'Không đồng bộ được.');
      const r: Result = { actor: b.actor || 0, partner: b.partner || 0, crew: b.crew || 0, at: new Date().toISOString() };
      setLast(r);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(r));
      } catch {
        /* bỏ qua */
      }
      const msg = `Diễn viên ${r.actor} · Nhà sản xuất ${r.partner} · Ekip ${r.crew}`;
      if (b.errors?.length) toast.warning('Đồng bộ chưa hết', { description: `${msg}. ${b.errors.join(' ')}` });
      else toast.success('Đã đồng bộ sang Brevo', { description: msg });
    } catch {
      toast.error('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-2 pt-1.5 pb-1 border-b border-border/60">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full flex items-start gap-2 px-2.5 py-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60 text-left"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin" /> : <MailPlus className="w-3.5 h-3.5 mt-0.5 text-emerald-600" />}
        <span className="min-w-0">
          <span className="block font-medium text-foreground">{busy ? 'Đang đồng bộ Brevo…' : 'Đồng bộ email sang Brevo'}</span>
          <span className="block text-[10px]">Diễn viên · Nhà sản xuất · Ekip</span>
          {last && (
            <span className="block text-[10px] mt-0.5">
              Lần gần nhất {new Date(last.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}: DV {last.actor} · NSX {last.partner} · Ekip {last.crew}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
