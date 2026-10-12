import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, checkApplication } from '@/lib/projects/types';
import { normalizePhone } from '@/lib/dienvienvn/casting-form';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';

const schema = z.object({
  project_id: z.string().uuid(),
  role_id: z.string().min(1).max(64),
  phone: z.string().trim().min(9).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selftape_url: z.string().trim().max(500).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
  website: z.string().optional()
});

// Ứng tuyển nhanh cho diễn viên đã có hồ sơ: xác minh bằng SĐT + ngày sinh.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  if (isRateLimited(`apply:${clientIp(req.headers)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin ứng tuyển chưa hợp lệ.' }, { status: 400 });
  const body = parsed.data;
  if (body.website) return NextResponse.json({ ok: true, full_name: '' });

  const { data: project } = await db.from('casting_projects').select('*').eq('id', body.project_id).maybeSingle();
  if (!project || project.status === 'draft') return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
  const problem = checkApplication(project as CastingProject, body.role_id, body.selftape_url);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const phone = normalizePhone(body.phone);
  const { data: candidates } = await db
    .from('talent_profiles')
    .select('id, full_name, phone, created_at')
    .eq('dob', body.dob)
    .order('created_at', { ascending: false });
  const talent = (candidates || []).find(t => normalizePhone(t.phone || '') === phone);
  if (!talent) {
    return NextResponse.json(
      { error: 'Không tìm thấy hồ sơ khớp số điện thoại và ngày sinh. Bạn hãy nộp hồ sơ mới để ứng tuyển.', notFound: true },
      { status: 404 }
    );
  }

  const { error } = await db.from('project_applications').insert({
    project_id: body.project_id,
    role_id: body.role_id,
    talent_id: talent.id,
    selftape_url: body.selftape_url || null,
    note: body.note || null,
    status: 'applied'
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Bạn đã ứng tuyển vai này rồi.' }, { status: 409 });
    console.error('[dienvienvn] Không lưu được đơn ứng tuyển:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, full_name: talent.full_name });
}
