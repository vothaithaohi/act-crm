'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, Pencil, Plus, QrCode, Share2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { cleanRefCode } from '@/lib/dienvienvn/referral';

const SITE = 'https://www.dienvienvn.com';
const refLink = (code: string) => `${SITE}/?ref=${code}`;
const qrSrc = (code: string) => `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(refLink(code))}`;

type Referrer = { id: string; code: string; name: string; note: string | null; created_at: string };
type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  review_status: string | null;
  submitted_at: string | null;
  created_at: string;
  referral_code: string | null;
  referral_note: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  applied: boolean;
};
type Metric = 'all' | 'approved' | 'applied';
type Group = { key: string; title: string; code?: string; referrer?: Referrer; rows: Row[] };

const inputCls = 'w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black/10';
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1.5';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const STATUS: Record<string, string> = { approved: 'Đã duyệt', rejected: 'Từ chối', pending: 'Chờ duyệt' };
const pick = (rows: Row[], m: Metric) => (m === 'approved' ? rows.filter(r => r.review_status === 'approved') : m === 'applied' ? rows.filter(r => r.applied) : rows);

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Đã sao chép link');
  } catch {
    window.prompt('Sao chép link:', text);
  }
}

export function ReferralAdmin() {
  const [referrers, setReferrers] = useState<Referrer[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [problem, setProblem] = useState('');
  const [form, setForm] = useState<{ id?: string; name: string; code: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState<Referrer | null>(null);
  const [open, setOpen] = useState<{ key: string; metric: Metric } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/referrals');
      const d = await res.json().catch(() => ({}));
      if (d.mode === 'demo') {
        setProblem('Chế độ demo chưa kết nối Supabase.');
        setReferrers([]);
        return;
      }
      if (!res.ok && d.error) setProblem(d.error);
      else setProblem(d.error || '');
      setReferrers(d.referrers || []);
      setRows(d.talents || []);
    } catch {
      setProblem('Mất kết nối mạng.');
      setReferrers([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo<Group[]>(() => {
    const list = referrers || [];
    const known = new Set(list.map(r => r.code));
    const out: Group[] = list.map(r => ({ key: r.code, title: r.name, code: r.code, referrer: r, rows: rows.filter(t => t.referral_code === r.code) }));
    // Mã có trong hồ sơ nhưng chưa tạo người giới thiệu
    const orphan = Array.from(new Set(rows.map(t => t.referral_code).filter((c): c is string => !!c && !known.has(c))));
    for (const c of orphan) out.push({ key: c, title: `Mã “${c}” (chưa có trong danh sách)`, code: c, rows: rows.filter(t => t.referral_code === c) });
    const self = rows.filter(t => !t.referral_code && t.referral_note);
    if (self.length) out.push({ key: '__note', title: 'Tự khai trong form (không qua link)', rows: self });
    const ads = rows.filter(t => !t.referral_code && !t.referral_note && t.utm_source);
    if (ads.length) out.push({ key: '__utm', title: 'Quảng cáo (utm, không có mã giới thiệu)', rows: ads });
    return out;
  }, [referrers, rows]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await authedFetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || 'Không lưu được.');
        return;
      }
      toast.success(form.id ? 'Đã lưu' : `Đã tạo link cho ${d.referrer?.name}`);
      setForm(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Referrer) => {
    if (!window.confirm(`Xoá người giới thiệu “${r.name}”? Hồ sơ đã ghi mã “${r.code}” vẫn giữ nguyên mã.`)) return;
    const res = await authedFetch(`/api/admin/referrals?id=${r.id}`, { method: 'DELETE' });
    if (!res.ok) toast.error('Không xoá được.');
    else load();
  };

  const opened = open ? groups.find(g => g.key === open.key) : null;
  const openedRows = opened && open ? pick(opened.rows, open.metric) : [];
  const codePreview = form ? cleanRefCode(form.code || form.name) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="w-6 h-6" /> Giới thiệu (Referral)
        </h1>
        <button
          onClick={() => setForm({ name: '', code: '', note: '' })}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Thêm người giới thiệu
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Gắn <code className="px-1 rounded bg-muted">?ref=mã</code> vào cuối bất kỳ link nào trên dienvienvn.com (trang chủ, dự án, vai, nộp hồ sơ). Web nhớ mã 30 ngày và tính cho người giới thiệu đầu tiên.
      </p>

      {problem && <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm px-4 py-3">{problem}</div>}

      {form && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Tên người giới thiệu</label>
              <input autoFocus className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Chan, Tường Anh, Nhóm FB Diễn viên" />
            </div>
            <div>
              <label className={labelCls}>Mã (trên link)</label>
              <input className={inputCls} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder={cleanRefCode(form.name) || 'VD: chan'} />
            </div>
            <div>
              <label className={labelCls}>Ghi chú</label>
              <input className={inputCls} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <p className="text-sm">
            Link: <span className="font-mono">{codePreview ? refLink(codePreview) : '—'}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !form.name.trim() || !codePreview}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
            </button>
            <button onClick={() => setForm(null)} className="h-10 px-4 rounded-lg border text-sm font-semibold">
              Huỷ
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-3 font-semibold">Người giới thiệu</th>
              <th className="px-4 py-3 font-semibold">Link</th>
              <th className="px-4 py-3 font-semibold text-center">Đã nộp hồ sơ</th>
              <th className="px-4 py-3 font-semibold text-center">Đã duyệt</th>
              <th className="px-4 py-3 font-semibold text-center">Đã ứng tuyển</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {referrers === null && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                </td>
              </tr>
            )}
            {referrers !== null && groups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Chưa có người giới thiệu.
                </td>
              </tr>
            )}
            {groups.map(g => (
              <tr key={g.key} className="border-b last:border-0 align-middle">
                <td className="px-4 py-3">
                  <div className="font-semibold">{g.title}</div>
                  {g.referrer?.note && <div className="text-xs text-muted-foreground">{g.referrer.note}</div>}
                </td>
                <td className="px-4 py-3">
                  {g.code ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">?ref={g.code}</span>
                      <button title="Sao chép link" onClick={() => copy(refLink(g.code!))} className="p-1.5 rounded-md border hover:bg-muted">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {g.referrer && (
                        <button title="Mã QR" onClick={() => setQr(g.referrer!)} className="p-1.5 rounded-md border hover:bg-muted">
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {(['all', 'approved', 'applied'] as Metric[]).map(m => {
                  const n = pick(g.rows, m).length;
                  const active = open?.key === g.key && open.metric === m;
                  return (
                    <td key={m} className="px-4 py-3 text-center">
                      <button
                        disabled={!n}
                        onClick={() => setOpen(active ? null : { key: g.key, metric: m })}
                        className={`min-w-10 h-8 px-2 rounded-lg font-bold ${active ? 'bg-foreground text-background' : n ? 'hover:bg-muted underline underline-offset-2' : 'text-muted-foreground'}`}
                      >
                        {n}
                      </button>
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {g.referrer && (
                    <>
                      <button
                        title="Sửa"
                        onClick={() => setForm({ id: g.referrer!.id, name: g.referrer!.name, code: g.referrer!.code, note: g.referrer!.note || '' })}
                        className="p-1.5 rounded-md hover:bg-muted"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button title="Xoá" onClick={() => remove(g.referrer!)} className="p-1.5 rounded-md hover:bg-muted text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {opened && open && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">
              {opened.title} · {open.metric === 'approved' ? 'Đã duyệt' : open.metric === 'applied' ? 'Đã ứng tuyển' : 'Đã nộp hồ sơ'} ({openedRows.length})
            </div>
            <button onClick={() => setOpen(null)} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="px-4 py-2 font-semibold">Diễn viên</th>
                  <th className="px-4 py-2 font-semibold">Ngày nộp</th>
                  <th className="px-4 py-2 font-semibold">Trạng thái</th>
                  <th className="px-4 py-2 font-semibold">Ứng tuyển</th>
                  <th className="px-4 py-2 font-semibold">Tự khai / Quảng cáo</th>
                </tr>
              </thead>
              <tbody>
                {openedRows.map(t => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/talents/${t.id}`} className="font-semibold hover:underline">
                        {t.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{[t.phone, t.email].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-2">{fmt(t.submitted_at || t.created_at)}</td>
                    <td className="px-4 py-2">{STATUS[t.review_status || 'pending'] || 'Chờ duyệt'}</td>
                    <td className="px-4 py-2">{t.applied ? 'Có' : 'Chưa'}</td>
                    <td className="px-4 py-2 text-xs">
                      {[t.referral_note && `“${t.referral_note}”`, t.utm_source && [t.utm_source, t.utm_campaign].filter(Boolean).join(' / ')].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {qr && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setQr(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <div className="font-bold text-lg">{qr.name}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc(qr.code)} alt={`QR ${refLink(qr.code)}`} className="w-full aspect-square rounded-lg border" />
            <div className="font-mono text-xs break-all">{refLink(qr.code)}</div>
            <div className="flex justify-center gap-2">
              <a href={qrSrc(qr.code)} target="_blank" rel="noopener noreferrer" className="h-10 px-4 inline-flex items-center rounded-lg border text-sm font-semibold">
                Mở ảnh QR để lưu
              </a>
              <button onClick={() => setQr(null)} className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-semibold">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
