import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActor } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, checkApplication } from '@/lib/projects/types';

const schema = z.object({
  project_id: z.string().uuid(),
  role_id: z.string().min(1).max(64),
  selftape_url: z.string().trim().max(500).optional().default(''),
  note: z.string().trim().max(1000).optional().default('')
});

// Diễn viên đã đăng nhập tự ứng tuyển một vai bằng hồ sơ của mình.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  if (isRateLimited(`apply:${clientIp(req.headers)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }

  const actor = await getActor(req, db);
  if (actor instanceof NextResponse) return actor;
  if (!actor.talent) {
    return NextResponse.json({ error: 'Tài khoản này chưa gắn với hồ sơ diễn viên nào.' }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin ứng tuyển chưa hợp lệ.' }, { status: 400 });
  const body = parsed.data;

  const { data: project } = await db.from('casting_projects').select('*').eq('id', body.project_id).maybeSingle();
  if (!project || project.status === 'draft') return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
  const problem = checkApplication(project as CastingProject, body.role_id, body.selftape_url);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await db.from('project_applications').insert({
    project_id: body.project_id,
    role_id: body.role_id,
    talent_id: actor.talent.id,
    selftape_url: body.selftape_url || null,
    note: body.note || null,
    status: 'applied'
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Bạn đã ứng tuyển vai này rồi.' }, { status: 409 });
    console.error('[dienvienvn] Không lưu được đơn ứng tuyển:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, full_name: actor.talent.full_name });
}
