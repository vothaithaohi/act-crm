'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Handshake, Loader2, Lock, Mail, Plus, Trash2, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { PARTNER_TYPE_LABELS, PartnerAccount, PartnerType } from '@/lib/dienvienvn/partners';

const PORTAL_URL = 'https://www.dienvienvn.com/doi-tac';

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ p }: { p: PartnerAccount }) {
  if (p.status === 'disabled') return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Đã khoá</span>;
  if (!p.last_seen_at) return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-brand-50 text-[#8c5f2a] border-brand-200">Chờ kích hoạt</span>;
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Đang hoạt động</span>;
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerAccount[] | null>(null);
  const [problem, setProblem] = useState('');
  const [demo, setDemo] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/partners', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (body.mode === 'demo') return setDemo(true);
      if (!res.ok) return setProblem(body.error || 'Không tải được danh sách đối tác.');
      setProblem('');
      setPartners(body.partners || []);
    } catch {
      setProblem('Mất kết nối mạng. Vui lòng tải lại trang.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (p: PartnerAccount, payload: Record<string, unknown>, success?: string) => {
    setBusyId(p.id);
    try {
      const res = await authedFetch(`/api/admin/partners/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(body.error || 'Không thực hiện được.');
      setPartners(list => (list || []).map(x => (x.id === p.id ? body.partner : x)));
      if (body.message) (body.email === 'invited' || body.email === 'reset' ? toast.success : toast.warning)(body.message);
      else if (success) toast.success(success);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: PartnerAccount) => {
    if (!window.confirm(`Xoá tài khoản đối tác "${p.full_name}"? Đối tác sẽ mất quyền xem hồ sơ ngay lập tức.`)) return;
    setBusyId(p.id);
    try {
      const res = await authedFetch(`/api/admin/partners/${p.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(body.error || 'Không xoá được.');
      setPartners(list => (list || []).filter(x => x.id !== p.id));
      toast.success('Đã xoá tài khoản đối tác.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PermissionGuard permission="talents:export">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <Handshake className="w-6 h-6" />
              Tài khoản đối tác
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Cấp tài khoản cho đạo diễn, nhà sản xuất và đối tác casting. Đối tác đăng nhập tại{' '}
              <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2 whitespace-nowrap">
                dienvienvn.com/doi-tac
              </a>{' '}
              để xem đầy đủ hồ sơ diễn viên đã duyệt (gồm số điện thoại, email, số đo).
            </p>
          </div>
          {!demo && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold whitespace-nowrap shadow-md shadow-black/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo tài khoản đối tác
            </button>
          )}
        </div>

        {demo ? (
          <div className="p-6 rounded-2xl border bg-card text-sm text-muted-foreground">
            Tài khoản đối tác cần kết nối Supabase. Chế độ demo hiện tại chưa hỗ trợ tính năng này.
          </div>
        ) : problem ? (
          <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>
        ) : !partners ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 rounded-2xl border bg-card text-center">
            <Handshake className="w-8 h-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 font-semibold">Chưa có tài khoản đối tác nào</p>
            <p className="mt-1 text-sm text-muted-foreground">Tạo tài khoản, đối tác sẽ nhận email để tự đặt mật khẩu.</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="px-4 py-3 font-semibold">Đối tác</th>
                  <th className="px-4 py-3 font-semibold">Loại · Công ty</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Truy cập gần nhất</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id} className="border-b last:border-0 align-middle">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                      {p.note && <div className="text-xs text-muted-foreground italic mt-0.5">{p.note}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{PARTNER_TYPE_LABELS[p.partner_type] || p.partner_type}</div>
                      <div className="text-muted-foreground">{p.company || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge p={p} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(p.last_seen_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {busyId === p.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        <button
                          title="Gửi lại email mời / đặt mật khẩu"
                          disabled={busyId === p.id || p.status === 'disabled'}
                          onClick={() => patch(p, { resend: true })}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          title={p.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                          disabled={busyId === p.id}
                          onClick={() =>
                            patch(p, { status: p.status === 'active' ? 'disabled' : 'active' }, p.status === 'active' ? 'Đã khoá tài khoản.' : 'Đã mở khoá tài khoản.')
                          }
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"
                        >
                          {p.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          title="Xoá tài khoản đối tác"
                          disabled={busyId === p.id}
                          onClick={() => remove(p)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ExternalLink className="w-3.5 h-3.5" /> Mở cổng đối tác
        </a>
      </div>

      {isModalOpen && (
        <CreatePartnerModal
          onClose={() => setIsModalOpen(false)}
          onCreated={p => {
            setPartners(list => [p, ...(list || [])]);
            setIsModalOpen(false);
          }}
        />
      )}
    </PermissionGuard>
  );
}

function CreatePartnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: PartnerAccount) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<PartnerType>('producer');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Vui lòng nhập họ tên và email hợp lệ.');
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, company, partner_type: type, note })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error || 'Không tạo được tài khoản.');
      (body.email === 'invited' || body.email === 'reset' ? toast.success : toast.warning)(body.message || 'Đã tạo tài khoản đối tác.');
      onCreated(body.partner);
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-foreground transition-colors';
  const label = 'text-xs font-semibold text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Tạo tài khoản đối tác</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className={label}>Họ tên *</label>
          <input className={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn A" autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className={label}>Email đăng nhập *</label>
          <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doitac@congty.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={label}>Vai trò</label>
            <select className={input} value={type} onChange={e => setType(e.target.value as PartnerType)}>
              {Object.entries(PARTNER_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={label}>Công ty</label>
            <input className={input} value={company} onChange={e => setCompany(e.target.value)} placeholder="Tuỳ chọn" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={label}>Ghi chú nội bộ</label>
          <input className={input} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Dự án phim Mai 2" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Đối tác sẽ nhận email để tự đặt mật khẩu, rồi đăng nhập tại dienvienvn.com/doi-tac. Bạn có thể khoá tài khoản bất cứ lúc nào.
        </p>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border text-xs font-semibold hover:bg-muted">
            Huỷ
          </button>
          <button type="submit" disabled={busy} className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo & gửi email mời
          </button>
        </div>
      </form>
    </div>
  );
}
