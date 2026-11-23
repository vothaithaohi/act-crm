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
      const msg = `Diễn viên ${r.actor} (${b.withProjects ?? 0} người đã ứng tuyển dự án) · Nhà sản xuất ${r.partner} · Ekip ${r.crew}`;
      if (b.errors?.length) return void toast.warning('Đồng bộ chưa hết', { description: `${msg}. ${b.errors.join(' ')}`, duration: 20000 });
      toast.info('Đã gửi sang Brevo, Brevo đang nhập…', { description: `${msg}. Vui lòng đợi, sẽ báo khi Brevo nhập xong.`, duration: 15000 });
      // Brevo nhập ngầm: hỏi tiến độ mỗi 5 giây, tối đa 5 phút
      const ids: number[] = b.processIds || [];
      if (!ids.length) return;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const st = await authedFetch(`/api/admin/brevo-sync?ids=${ids.join(',')}`).then(x => x.json()).catch(() => null);
        const list: { status: string; error?: string }[] = st?.processes || [];
        if (list.some(x => x.error)) return void toast.error('Không kiểm tra được tiến độ trên Brevo', { description: list.find(x => x.error)?.error });
        if (list.length && list.every(x => x.status === 'completed')) {
          return void toast.success('Brevo đã nhập xong', { description: `${msg}. Tải lại trang Brevo để lọc.`, duration: 20000 });
        }
      }
      toast.warning('Brevo vẫn đang nhập', { description: 'Đợi thêm vài phút rồi tải lại trang Brevo.' });
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
