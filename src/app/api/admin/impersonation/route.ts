import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { publicSiteUrl } from '@/lib/dienvienvn/hosts';
import {
  IMPERSONATION_MISSING,
  ImpersonationKind,
  ImpersonationSession,
  KIND_HOME,
  KIND_LABEL,
  createImpersonation,
  impersonationItems,
  impersonationMarks
} from '@/lib/dienvienvn/impersonation';

// Giả lập tài khoản người dùng trên dienvienvn.com — chỉ Super Admin.
const ROLES = ['super_admin'];
const TABLE: Record<ImpersonationKind, { table: string; label: string }> = {
  actor: { table: 'talent_profiles', label: 'full_name' },
  partner: { table: 'partner_accounts', label: 'full_name' },
  crew: { table: 'crew_profiles', label: 'full_name' }
};
const schema = z.object({ kind: z.enum(['actor', 'partner', 'crew']), id: z.string().uuid() });
const COLUMNS = 'id, admin_user_id, admin_email, target_user_id, target_kind, target_label, created_at, last_seen_at, ended_at';
const missing = (m?: string) => /impersonation_sessions|schema cache/i.test(m || '');

/** Mở phiên giả lập → trả link dùng 1 lần (2 phút) để mở trong tab mới. */
export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thiếu thông tin tài khoản.' }, { status: 400 });
  const { kind, id } = parsed.data;
  const t = TABLE[kind];
  const { data: row } = await g.db.from(t.table).select(`auth_user_id, email, ${t.label}`).eq('id', id).maybeSingle();
  const r = row as Record<string, string | null> | null;
  if (!r) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 });
  if (!r.auth_user_id) return NextResponse.json({ error: 'Hồ sơ này chưa có tài khoản đăng nhập nên không giả lập được.' }, { status: 400 });
  // Không giả lập tài khoản của nhân sự CRM
  if (r.email) {
    const { data: staff } = await g.db.from('profiles').select('id').ilike('email', r.email.replace(/[\\%_]/g, m => `\\${m}`)).limit(1);
    if (staff?.length) return NextResponse.json({ error: 'Không giả lập tài khoản của nhân sự CRM.' }, { status: 400 });
  }
  const label = String(r[t.label] || r.email || KIND_LABEL[kind]);
  const res = await createImpersonation(g.db, { id: g.staff.userId || null, email: g.staff.email }, { userId: r.auth_user_id, kind, label });
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

/** Kết thúc phiên (tab dienvienvn.com sẽ tự thoát ở thao tác kế tiếp) + trả danh sách thao tác thật cần xoá. */
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
  const items = await impersonationItems(g.db, row as ImpersonationSession).catch(() => []);
  return NextResponse.json({ session: row, items });
}
