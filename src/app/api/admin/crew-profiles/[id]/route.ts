import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { CrewApplication } from '@/lib/dienvienvn/crew-profiles';
import { notifyApplications } from '@/lib/dienvienvn/crew-server';
import { attachmentsFor, listCvs } from '@/lib/dienvienvn/crew-files';
import { CrewJob } from '@/lib/dienvienvn/crew-jobs';

const schema = z.object({ review_status: z.enum(['pending', 'approved', 'rejected']) });

// ACT xem kho CV + các lượt ứng tuyển (kèm CV / cover letter, link xem tạm 1 giờ) của 1 ứng viên ekip.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 });
  const { data: apps } = await g.db.from('crew_applications').select('*').eq('crew_profile_id', id).order('created_at', { ascending: false });
  const list = (apps || []) as CrewApplication[];
  const { data: jobs } = list.length ? await g.db.from('crew_jobs').select('id,title,company').in('id', list.map(a => a.job_id)) : { data: [] };
  const jobById = new Map(((jobs || []) as Pick<CrewJob, 'id' | 'title' | 'company'>[]).map(j => [j.id, j]));
  const [cvs, files] = await Promise.all([listCvs(g.db, id).catch(() => []), attachmentsFor(g.db, list).catch(() => new Map())]);
  const applications = list.map(a => ({
    id: a.id,
    created_at: a.created_at,
    title: jobById.get(a.job_id)?.title || 'Tin đã xoá',
    company: jobById.get(a.job_id)?.company || '',
    attachments: files.get(a.id) || null
  }));
  return NextResponse.json({ cvs, applications }, { headers: { 'Cache-Control': 'no-store' } });
}

// ACT khoá / mở khoá tài khoản ekip (hồ sơ cũ "Chờ duyệt" mở khoá = duyệt). Mở khoá: gửi email báo NSX các lượt ứng tuyển chưa báo.
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
