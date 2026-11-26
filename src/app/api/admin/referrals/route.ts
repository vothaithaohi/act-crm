import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin, PARTNER_MANAGER_ROLES } from '@/lib/dienvienvn/partner-admin';
import { REFERRAL_MISSING, cleanRefCode } from '@/lib/dienvienvn/referral';

// Mục "Giới thiệu (Referral)" trong CRM: người giới thiệu + hồ sơ diễn viên mỗi người mang về.
const missing = (m?: string) => /referrers|referral_code|schema cache|does not exist/i.test(m || '');

export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req, PARTNER_MANAGER_ROLES);
  if ('res' in g) return g.res;
  const { data: referrers, error } = await g.db.from('referrers').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ referrers: [], talents: [], error: missing(error.message) ? REFERRAL_MISSING : 'Không tải được danh sách.' });

  // Hồ sơ có nguồn giới thiệu (mã link, tự khai hoặc utm quảng cáo)
  const talents: Record<string, unknown>[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error: e } = await g.db
      .from('talent_profiles')
      .select('id, full_name, email, phone, review_status, submitted_at, created_at, referral_code, referral_note, utm_source, utm_medium, utm_campaign, referred_at')
      .or('referral_code.not.is.null,referral_note.not.is.null,utm_source.not.is.null')
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (e) return NextResponse.json({ referrers, talents: [], error: missing(e.message) ? REFERRAL_MISSING : 'Không tải được hồ sơ.' });
    talents.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  // Đã ứng tuyển dự án nào chưa
  const applied = new Set<string>();
  const ids = talents.map(t => t.id as string);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await g.db.from('project_applications').select('talent_id').in('talent_id', ids.slice(i, i + 200));
    for (const a of data || []) applied.add(a.talent_id as string);
  }
  return NextResponse.json(
    { referrers, talents: talents.map(t => ({ ...t, applied: applied.has(t.id as string) })) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên người giới thiệu.').max(120),
  code: z.string().trim().max(60),
  note: z.string().trim().max(300).optional().default('')
});

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, PARTNER_MANAGER_ROLES);
  if ('res' in g) return g.res;
  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });
  const code = cleanRefCode(parsed.data.code || parsed.data.name);
  if (!code) return NextResponse.json({ error: 'Mã giới thiệu 2–40 ký tự: chữ thường không dấu, số, "-" hoặc "_".' }, { status: 400 });
  const row = { name: parsed.data.name, code, note: parsed.data.note || null };
  const q = parsed.data.id
    ? g.db.from('referrers').update(row).eq('id', parsed.data.id).select('*').maybeSingle()
    : g.db.from('referrers').insert({ ...row, created_by: g.staff.email }).select('*').maybeSingle();
  const { data, error } = await q;
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `Mã "${code}" đã có người dùng, chọn mã khác.` }, { status: 409 });
    return NextResponse.json({ error: missing(error.message) ? REFERRAL_MISSING : 'Không lưu được.' }, { status: 500 });
  }
  return NextResponse.json({ referrer: data });
}

export async function DELETE(req: NextRequest) {
  const g = await guardPartnerAdmin(req, PARTNER_MANAGER_ROLES);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Thiếu mã.' }, { status: 400 });
  const { error } = await g.db.from('referrers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Không xoá được.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
