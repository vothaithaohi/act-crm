import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { publicSiteUrl } from '@/lib/dienvienvn/hosts';
import {
  IMPERSONATION_MISSING,
  ImpersonationKind,
  ImpersonationSession,
  KIND_HOME,
  createImpersonation,
  ensureTestAccount,
  impersonationItems,
  impersonationMarks,
  purgeImpersonationItems
} from '@/lib/dienvienvn/impersonation';

// Giả lập bằng tài khoản test của chính Super Admin (diễn viên / nhà sản xuất / ekip) — không giả lập tài khoản người khác.
const ROLES = ['super_admin'];
const schema = z.object({ kind: z.enum(['actor', 'partner', 'crew']) });
const COLUMNS = 'id, admin_user_id, admin_email, target_user_id, target_kind, target_label, created_at, last_seen_at, ended_at';
const missing = (m?: string) => /impersonation_sessions|schema cache/i.test(m || '');
const likeExact = (v: string) => v.trim().toLowerCase().replace(/[\\%_]/g, m => `\\${m}`);

/** Mở phiên giả lập → trả link dùng 1 lần (2 phút) để mở trong tab mới. */
export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Chọn vai cần giả lập.' }, { status: 400 });
  const kind = parsed.data.kind as ImpersonationKind;
  const { data: me } = await g.db.from('profiles').select('full_name, phone').ilike('email', likeExact(g.staff.email)).limit(1);
  const acc = await ensureTestAccount(g.db, { email: g.staff.email, name: String(me?.[0]?.full_name || ''), phone: (me?.[0]?.phone as string | null) || null }, kind);
  if ('error' in acc) return NextResponse.json({ error: acc.error }, { status: 500 });
  const res = await createImpersonation(g.db, { id: g.staff.userId || null, email: g.staff.email }, { userId: acc.userId, kind, label: acc.label });
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 500 });
  const url = `${publicSiteUrl(req.headers)}/gia-lap?code=${encodeURIComponent(res.code)}&next=${encodeURIComponent(KIND_HOME[kind])}`;
  return NextResponse.json({ url, session: res.session });
}

/** Phiên giả lập đang mở của Super Admin này; ?marks=1 → mã các dòng TEST để CRM đánh dấu. */
export async function GET(req: NextRequest) {
  const marksOnly = req.nextUrl.searchParams.get('marks') === '1';
  // Đánh dấu TEST: ai xem được CRM cũng thấy (để không nhầm với dữ liệu thật)
  const g = await guardPartnerAdmin(req, marksOnly ? ['super_admin', 'admin', 'sales', 'marketing', 'casting', 'developer', 'viewer'] : ROLES);
  if ('res' in g) return g.res;
  if (marksOnly) {
    const marks = await impersonationMarks(g.db).catch(() => ({}));
    return NextResponse.json({ marks }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const { data, error } = await g.db
    .from('impersonation_sessions')
    .select(COLUMNS)
    .ilike('admin_email', g.staff.email.replace(/[\\%_]/g, m => `\\${m}`))
    .is('ended_at', null)
    .not('code_used_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ sessions: [], error: missing(error.message) ? IMPERSONATION_MISSING : undefined });
  return NextResponse.json({ sessions: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Kết thúc phiên (tab dienvienvn.com tự thoát ở thao tác kế tiếp) + trả danh sách thao tác thật; ?purge=1 xoá luôn các thao tác đó. */
export async function DELETE(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy phiên.' }, { status: 404 });
  const { data } = await g.db
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .is('ended_at', null)
    .select(COLUMNS)
    .maybeSingle();
  const { data: row } = data ? { data } : await g.db.from('impersonation_sessions').select(COLUMNS).eq('id', id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Không tìm thấy phiên.' }, { status: 404 });
  // ?purge=1: xoá toàn bộ thao tác thật của phiên
  if (req.nextUrl.searchParams.get('purge') === '1') {
    const own = String((row as ImpersonationSession).admin_email).toLowerCase() === g.staff.email.toLowerCase();
    if (!own) return NextResponse.json({ error: 'Chỉ người mở phiên mới xoá được.' }, { status: 403 });
    const result = await purgeImpersonationItems(g.db, row as ImpersonationSession);
    return NextResponse.json({ session: row, items: [], ...result });
  }
  const items = await impersonationItems(g.db, row as ImpersonationSession).catch(() => []);
  return NextResponse.json({ session: row, items });
}
