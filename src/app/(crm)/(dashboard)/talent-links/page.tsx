'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Library, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { createClient } from '@/lib/supabase/client';
import { useCRM } from '@/lib/store/crm-context';
import { publicSiteBase } from '@/lib/projects/use-projects';

interface CatalogLink {
  id: string;
  token: string;
  label: string | null;
  revoked: boolean;
  created_by: string | null;
  created_at: string;
}

const MIGRATION_HINT = 'Hãy chạy migration 20261109_talent_catalog_links.sql trong Supabase.';

/** Mã 16 ký tự chữ thường + số (~82 bit ngẫu nhiên). */
function newToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) if (b < 252 && out.length < 16) out += alphabet[b % 36];
  return out.length === 16 ? out : newToken();
}


/** Link kho diễn viên gửi NSX: toàn bộ hồ sơ đã duyệt, hiện theo cấp công khai; đối tác đã duyệt đăng nhập xem đầy đủ. */
export default function TalentLinksPage() {
  const { currentUser } = useCRM();
  const [links, setLinks] = useState<CatalogLink[] | null>(null);
  const [problem, setProblem] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const db = createClient();
    if (!db) return setProblem('Tính năng cần kết nối Supabase (chế độ demo chưa hỗ trợ).');
    const { data, error } = await db.from('talent_catalog_links').select('*').order('created_at', { ascending: false });
    if (error) return setProblem(`Không tải được danh sách link: ${error.message}. ${MIGRATION_HINT}`);
    setProblem('');
    setLinks((data || []) as CatalogLink[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const url = (l: CatalogLink) => `${publicSiteBase()}/kho/${l.token}`;
  const copy = async (l: CatalogLink) => {
    try {
      await navigator.clipboard.writeText(url(l));
      toast.success('Đã sao chép link');
    } catch {
      toast.error('Không sao chép được, hãy chọn và copy thủ công.');
    }
  };

  const create = async () => {
    const db = createClient();
    if (!db) return;
    setBusy(true);
    const { error } = await db
      .from('talent_catalog_links')
      .insert({ token: newToken(), label: label.trim() || null, created_by: currentUser?.email || null });
    setBusy(false);
    if (error) return toast.error('Không tạo được link', { description: `${error.message}. ${MIGRATION_HINT}` });
    setLabel('');
    toast.success('Đã tạo link kho diễn viên.');
    load();
  };

  const update = async (l: CatalogLink, patch: Partial<CatalogLink>, msg: string) => {
    const db = createClient();
    if (!db) return;
    const { error } = await db.from('talent_catalog_links').update(patch).eq('id', l.id);
    if (error) return toast.error('Không lưu được', { description: error.message });
    toast.success(msg);
    load();
  };

  const remove = async (l: CatalogLink) => {
    if (!window.confirm('Xoá link này? Người đang giữ link sẽ không mở được nữa.')) return;
    const db = createClient();
    if (!db) return;
    const { error } = await db.from('talent_catalog_links').delete().eq('id', l.id);
    if (error) return toast.error('Không xoá được', { description: error.message });
    toast.success('Đã xoá link.');
    load();
  };

  return (
    <PermissionGuard permission="talents:write" customTitle="Link kho diễn viên" customMessage="Chỉ Ban Giám Đốc và bộ phận Casting tạo link kho diễn viên.">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Library className="w-6 h-6" /> Link kho diễn viên
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Link gửi đạo diễn / nhà sản xuất để xem <b className="text-foreground">toàn bộ hồ sơ đã duyệt</b>, có bộ lọc giới tính, tuổi, chiều cao. Người mở link thấy ảnh,
            tên, khoảng tuổi, chiều cao, cân nặng, kinh nghiệm, kỹ năng; đối tác đã duyệt đăng nhập thấy thêm SĐT, email, số đo. Link không có hạn dùng; bấm "Thu hồi" khi muốn ngừng.
          </p>
        </div>

        <div className="p-4 rounded-2xl border bg-card flex flex-col sm:flex-row gap-2">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Tên link (không bắt buộc), VD: Gửi đạo diễn Victor Vũ – phim mới"
            className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-foreground"
          />
          <button onClick={create} disabled={busy} className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tạo link mới
          </button>
        </div>

        {problem ? (
          <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>
        ) : !links ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="p-10 rounded-2xl border bg-card text-center text-sm text-muted-foreground">Chưa có link nào. Tạo link đầu tiên ở trên.</div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y">
            {links.map(l => {
              const dead = l.revoked;
              return (
                <div key={l.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          l.revoked ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {l.revoked ? 'Đã thu hồi' : 'Đang dùng'}
                      </span>
                      <span className="font-semibold text-sm">{l.label || 'Link kho diễn viên'}</span>
                    </div>
                    <p className={`mt-1 font-mono text-[11px] break-all ${dead ? 'text-muted-foreground line-through' : ''}`}>{url(l)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tạo {new Date(l.created_at).toLocaleDateString('vi-VN')}
                      {l.created_by ? ` · ${l.created_by}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!l.revoked && (
                      <>
                        <button onClick={() => copy(l)} className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-[#1d1d1f] text-white text-xs font-semibold">
                          <Copy className="w-3.5 h-3.5" /> Sao chép
                        </button>
                        <button onClick={() => update(l, { revoked: true }, 'Đã thu hồi link.')} className="h-8 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted">
                          Thu hồi
                        </button>
                      </>
                    )}
                    <button title="Xoá" onClick={() => remove(l)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
