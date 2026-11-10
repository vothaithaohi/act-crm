import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { CrewApplication } from '@/lib/dienvienvn/crew-profiles';
import { notifyApplications } from '@/lib/dienvienvn/crew-server';

const schema = z.object({ review_status: z.enum(['pending', 'approved', 'rejected']) });

// ACT duyệt / từ chối hồ sơ ekip. Duyệt xong: gửi email báo NSX cho các tin hồ sơ này đã ứng tuyển.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await g.db
    .from('crew_profiles')
    .update({ review_status: parsed.data.review_status, reviewed_at: parsed.data.review_status === 'pending' ? null : now, updated_at: now })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Không lưu được thay đổi.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 });

  let notified = 0;
  if (parsed.data.review_status === 'approved') {
    const { data: apps } = await g.db.from('crew_applications').select('*').eq('crew_profile_id', id).is('notified_at', null);
    const list = (apps || []) as CrewApplication[];
    await notifyApplications(g.db, list, req.headers);
    const { count } = await g.db.from('crew_applications').select('id', { count: 'exact', head: true }).eq('crew_profile_id', id).not('notified_at', 'is', null);
    notified = Math.min(list.length, count || 0);
  }
  return NextResponse.json({ profile: data, notified });
}
