import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isStaffEmail } from '@/lib/dienvienvn/actor-server';
import { sendPartnerEmail } from '@/lib/dienvienvn/partner-server';
import { PartnerAccount } from '@/lib/dienvienvn/partners';
import { cleanProjectIds, EMAIL_RESULT_MESSAGE, guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  full_name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160).optional().default(''),
  partner_type: z.enum(['director', 'producer', 'casting', 'agency', 'brand', 'other']).default('producer'),
  note: z.string().trim().max(1000).optional().default(''),
  project_ids: z.array(z.string()).max(100).optional().default([])
});

export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { data, error } = await g.db.from('partner_accounts').select('*').order('created_at', { ascending: false });
  if (error) {
    const missing = /partner_accounts/.test(error.message);
    return NextResponse.json(
      { error: missing ? 'Chưa có bảng partner_accounts — hãy chạy migration 20261017_partner_accounts.sql.' : 'Không tải được danh sách đối tác.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ mode: 'live', partners: data as PartnerAccount[] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Vui lòng nhập họ tên và email hợp lệ.' }, { status: 400 });
  const input = parsed.data;

  if (await isStaffEmail(g.db, input.email)) {
    return NextResponse.json({ error: EMAIL_RESULT_MESSAGE.staff }, { status: 400 });
  }

  const { data, error } = await g.db
    .from('partner_accounts')
    .insert({
      email: input.email,
      full_name: input.full_name,
      company: input.company || null,
      partner_type: input.partner_type,
      note: input.note || null,
      project_ids: await cleanProjectIds(g.db, input.project_ids),
      created_by: g.staff.email
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email này đã có tài khoản đối tác.' }, { status: 409 });
    if (/project_ids/.test(error.message)) {
      return NextResponse.json({ error: 'Chưa gắn được dự án — hãy chạy migration 20261027_partner_projects.sql.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Không tạo được tài khoản đối tác.' }, { status: 500 });
  }

  const result = await sendPartnerEmail(g.db, data as PartnerAccount, req.headers);
  const { data: fresh } = await g.db.from('partner_accounts').select('*').eq('id', data.id).single();
  return NextResponse.json({ partner: (fresh || data) as PartnerAccount, email: result, message: EMAIL_RESULT_MESSAGE[result] });
}
