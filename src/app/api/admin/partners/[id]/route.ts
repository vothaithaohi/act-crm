import { NextRequest, NextResponse } from 'next/server';
import { purgeAuthIfOrphan } from '@/lib/supabase/account-cleanup';
import { z } from 'zod';
import { sendPartnerApprovalEmail, sendPartnerEmail } from '@/lib/dienvienvn/partner-server';
import { PartnerAccount } from '@/lib/dienvienvn/partners';
import { cleanProjectIds, EMAIL_RESULT_MESSAGE, guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';

const patchSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  company: z.string().trim().max(160).optional(),
  partner_type: z.enum(['director', 'producer', 'casting', 'agency', 'brand', 'other']).optional(),
  note: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  phone: z.string().trim().max(20).optional(),
  project_ids: z.array(z.string()).max(100).optional(),
  /** Gửi lại email mời / đặt mật khẩu */
  resend: z.boolean().optional()
});

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// Sửa thông tin, khoá / mở khoá, gửi lại email cho tài khoản đối tác.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Không tìm thấy đối tác.' }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const { resend, ...fields } = parsed.data;

  const changes: Record<string, unknown> = {};
  const { project_ids, ...rest } = fields;
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) changes[k] = k === 'company' || k === 'note' || k === 'phone' ? (v as string) || null : v;
  }
  // Duyệt đăng ký (Chờ duyệt → Hoạt động): gửi luôn email để đối tác tự đặt mật khẩu
  const { data: before } = await g.db.from('partner_accounts').select('status').eq('id', id).maybeSingle();
  const approving = before?.status === 'pending' && changes.status === 'active';
  if (project_ids) changes.project_ids = await cleanProjectIds(g.db, project_ids);
  let partner: PartnerAccount | null = null;
  if (Object.keys(changes).length) {
    const { data, error } = await g.db
      .from('partner_accounts')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) {
      const noColumn = /project_ids/.test(error.message);
      return NextResponse.json(
        { error: noColumn ? 'Chưa gắn được dự án — hãy chạy migration 20261027_partner_projects.sql.' : 'Không lưu được thay đổi.' },
        { status: 500 }
      );
    }
    partner = data as PartnerAccount | null;
  } else {
    const { data } = await g.db.from('partner_accounts').select('*').eq('id', id).maybeSingle();
    partner = data as PartnerAccount | null;
  }
  if (!partner) return NextResponse.json({ error: 'Không tìm thấy đối tác.' }, { status: 404 });

  if (resend || approving) {
    if (partner.status !== 'active') return NextResponse.json({ error: 'Tài khoản đang bị khoá. Mở khoá trước khi gửi email.' }, { status: 400 });
    const result = approving ? await sendPartnerApprovalEmail(g.db, partner, req.headers) : await sendPartnerEmail(g.db, partner, req.headers);
    const { data: fresh } = await g.db.from('partner_accounts').select('*').eq('id', id).single();
    return NextResponse.json({ partner: (fresh || partner) as PartnerAccount, email: result, message: EMAIL_RESULT_MESSAGE[result] });
  }
  return NextResponse.json({ partner });
}

// Xoá tài khoản đối tác (mất quyền xem ngay). Tài khoản đăng nhập của email đó cũng bị xoá nếu không còn gắn với
// hồ sơ nào khác (VD: diễn viên cùng email thì giữ) — để đăng ký lại bằng email này không bị báo trùng.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Không tìm thấy đối tác.' }, { status: 404 });
  const { data: partner } = await g.db.from('partner_accounts').select('email, auth_user_id').eq('id', id).maybeSingle();
  const { error } = await g.db.from('partner_accounts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Không xoá được đối tác.' }, { status: 500 });
  const accountRemoved = partner ? await purgeAuthIfOrphan(g.db, { userId: partner.auth_user_id, email: partner.email }).catch(() => false) : false;
  return NextResponse.json({ ok: true, accountRemoved });
}
