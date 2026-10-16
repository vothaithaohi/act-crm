import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPartnerEmail } from '@/lib/dienvienvn/partner-server';
import { PartnerAccount } from '@/lib/dienvienvn/partners';
import { EMAIL_RESULT_MESSAGE, guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';

const patchSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  company: z.string().trim().max(160).optional(),
  partner_type: z.enum(['director', 'producer', 'casting', 'agency', 'brand', 'other']).optional(),
  note: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'disabled']).optional(),
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
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) changes[k] = k === 'company' || k === 'note' ? (v as string) || null : v;
  }
  let partner: PartnerAccount | null = null;
  if (Object.keys(changes).length) {
    const { data, error } = await g.db
      .from('partner_accounts')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Không lưu được thay đổi.' }, { status: 500 });
    partner = data as PartnerAccount | null;
  } else {
    const { data } = await g.db.from('partner_accounts').select('*').eq('id', id).maybeSingle();
    partner = data as PartnerAccount | null;
  }
  if (!partner) return NextResponse.json({ error: 'Không tìm thấy đối tác.' }, { status: 404 });

  if (resend) {
    if (partner.status !== 'active') return NextResponse.json({ error: 'Tài khoản đang bị khoá. Mở khoá trước khi gửi email.' }, { status: 400 });
    const result = await sendPartnerEmail(g.db, partner, req.headers);
    const { data: fresh } = await g.db.from('partner_accounts').select('*').eq('id', id).single();
    return NextResponse.json({ partner: (fresh || partner) as PartnerAccount, email: result, message: EMAIL_RESULT_MESSAGE[result] });
  }
  return NextResponse.json({ partner });
}

// Xoá tài khoản đối tác (mất quyền xem ngay; tài khoản đăng nhập Supabase vẫn giữ để không ảnh hưởng hồ sơ diễn viên cùng email).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Không tìm thấy đối tác.' }, { status: 404 });
  const { error } = await g.db.from('partner_accounts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Không xoá được đối tác.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
