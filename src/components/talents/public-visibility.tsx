'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useCRM } from '@/lib/store/crm-context';
import type { TalentProfile } from '@/lib/types/crm';
import { RESERVED_USERNAMES, USERNAME_PATTERN } from '@/lib/dienvienvn/hosts';

// Hiện / ẩn hồ sơ trên dienvienvn.com từ CRM.
// ACT ẩn = khoá: diễn viên không tự bật lại được; hồ sơ vẫn dùng trong CRM, dự án, link NSX (VD hồ sơ người nổi tiếng cho proposal).
// ACT hiện = mở khoá + bật công khai (cần hồ sơ Đã duyệt; chưa có đường dẫn thì tự tạo theo tên).

export type Visibility = 'public' | 'locked' | 'self_hidden' | 'not_approved';

export function visibilityOf(t: TalentProfile): Visibility {
  if (t.public_locked) return 'locked';
  if (t.review_status && t.review_status !== 'approved') return 'not_approved';
  if (!t.public_profile || !t.username) return 'self_hidden';
  return 'public';
}

const LABEL: Record<Visibility, string> = {
  public: 'Đang hiện trên dienvienvn.com',
  locked: 'ACT đã ẩn (khoá), chỉ trong CRM',
  self_hidden: 'Đang ẩn khỏi trang công khai',
  not_approved: 'Chưa duyệt, chưa hiện công khai'
};

/** Đường dẫn công khai từ tên: "Kathy Uyên (Lê ...)" → kathy-uyen; trùng thì thêm số. */
export async function freeUsername(db: NonNullable<ReturnType<typeof createClient>>, name: string): Promise<string | null> {
  const base = name
    .split(' (')[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34);
  if (base.length < 3) return null;
  for (let i = 0; i < 20; i++) {
    const u = i ? `${base}-${i + 1}` : base;
    if (!USERNAME_PATTERN.test(u) || RESERVED_USERNAMES.has(u)) continue;
    const { data } = await db.from('talent_profiles').select('id').eq('username', u).limit(1);
    if (!data?.length) return u;
  }
  return null;
}

/** Bật / tắt hiển thị công khai (dùng chung cho trang hồ sơ và thẻ diễn viên). */
function useVisibilityToggle(t: TalentProfile) {
  const { can, refreshTalents } = useCRM();
  const [busy, setBusy] = useState(false);
  const allowed = can('talents:write');
  const state = visibilityOf(t);

  const toggle = async () => {
    const db = createClient();
    if (!db) return void toast.error('Cần kết nối Supabase.');
    const showing = state === 'public';
    if (showing) {
      if (!window.confirm(`Ẩn hồ sơ ${t.full_name} khỏi dienvienvn.com và khoá lại? Diễn viên sẽ không tự bật hiện được. Hồ sơ vẫn dùng trong CRM, dự án và link NSX.`)) return;
    } else {
      if (t.review_status && t.review_status !== 'approved') return void toast.error('Duyệt hồ sơ trước khi hiện công khai.');
      const selfHidden = !t.public_locked && !t.public_profile && !!t.auth_user_id;
      const msg = selfHidden
        ? `Diễn viên ${t.full_name} đã tự ẩn hồ sơ. Chỉ hiện lại khi diễn viên đồng ý. Vẫn hiện công khai?`
        : t.submission_source === 'ai'
          ? `Hiện hồ sơ ${t.full_name} trên dienvienvn.com? Chỉ hiện khi diễn viên hoặc agency đã đồng ý.`
          : `Hiện hồ sơ ${t.full_name} trên dienvienvn.com?`;
      if (!window.confirm(msg)) return;
    }
    setBusy(true);
    try {
      const patch: Record<string, unknown> = showing
        ? { public_profile: false, public_locked: true, updated_at: new Date().toISOString() }
        : { public_profile: true, public_locked: false, updated_at: new Date().toISOString() };
      if (!showing && !t.username) {
        const u = await freeUsername(db, t.full_name);
        if (!u) return void toast.error('Không tạo được đường dẫn công khai từ tên này. Hãy đặt username trong phần sửa hồ sơ.');
        patch.username = u;
      }
      const { error } = await db.from('talent_profiles').update(patch).eq('id', t.id);
      if (error) {
        return void toast.error('Không lưu được', {
          description: /public_locked/.test(error.message) ? 'Hãy chạy migration 20261129_public_lock.sql.' : error.message
        });
      }
      toast.success(showing ? 'Đã ẩn và khoá, hồ sơ chỉ còn trong CRM.' : `Đã hiện công khai: dienvienvn.com/${(patch.username as string) || t.username}`);
      await refreshTalents();
    } finally {
      setBusy(false);
    }
  };
  return { allowed, busy, state, toggle };
}

/** Trên trang hồ sơ: trạng thái + nút Hiện / Ẩn công khai. */
export function PublicVisibilityControl({ talent }: { talent: TalentProfile }) {
  const { allowed, busy, state, toggle } = useVisibilityToggle(talent);
  const isPublic = state === 'public';
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1 font-semibold ${isPublic ? 'text-emerald-700' : state === 'locked' ? 'text-rose-700' : 'text-muted-foreground'}`}>
        {isPublic ? <Eye className="w-3.5 h-3.5" /> : state === 'locked' ? <Lock className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {LABEL[state]}
      </span>
      {allowed && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy || state === 'not_approved'}
          title={state === 'not_approved' ? 'Duyệt hồ sơ trước khi hiện công khai' : undefined}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold disabled:opacity-50 ${isPublic ? 'hover:bg-rose-50 hover:text-rose-700' : 'hover:bg-emerald-50 hover:text-emerald-700'}`}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isPublic ? 'Ẩn & khoá' : 'Hiện công khai'}
        </button>
      )}
    </span>
  );
}

/** Trên thẻ diễn viên (Casting Matching): biểu tượng con mắt bật / tắt nhanh. */
export function PublicEyeButton({ talent, compact = false }: { talent: TalentProfile; compact?: boolean }) {
  const { allowed, busy, state, toggle } = useVisibilityToggle(talent);
  if (!allowed) return null;
  const isPublic = state === 'public';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || state === 'not_approved'}
      title={state === 'not_approved' ? 'Chưa duyệt, chưa hiện công khai' : isPublic ? 'Đang hiện trên dienvienvn.com. Bấm để ẩn và khoá' : `${LABEL[state]}. Bấm để hiện công khai`}
      aria-label={isPublic ? 'Ẩn khỏi trang công khai' : 'Hiện công khai'}
      className={
        compact
          ? `h-6 w-6 inline-flex items-center justify-center rounded-full shadow-md backdrop-blur-md border transition-colors disabled:opacity-60 ${
              isPublic ? 'bg-emerald-600 text-white border-white/40' : state === 'locked' ? 'bg-rose-600 text-white border-white/40' : 'bg-black/50 text-white/80 border-white/30 hover:bg-black/70'
            }`
          : `h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
              isPublic ? 'text-emerald-700 hover:bg-emerald-50' : state === 'locked' ? 'text-rose-700 hover:bg-rose-50' : 'text-muted-foreground hover:bg-muted'
            }`
      }
    >
      {busy ? (
        <Loader2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin`} />
      ) : isPublic ? (
        <Eye className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : state === 'locked' ? (
        <Lock className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : (
        <EyeOff className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      )}
    </button>
  );
}
