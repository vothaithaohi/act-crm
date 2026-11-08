import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActor } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, NEW_APPLICATION_STATUS, checkApplication } from '@/lib/projects/types';
import { selfTapeUrl } from '@/lib/dienvienvn/selftapes';

const schema = z.object({
  project_id: z.string().uuid(),
  role_id: z.string().min(1).max(64),
  selftape_url: z.string().trim().max(500).optional().default(''),
  selftape_urls: z.array(selfTapeUrl).max(10).optional().default([]),
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
  // Self-tape đã tick trong thư viện + link dán thêm (nếu có), bỏ trùng
  const tapes = Array.from(new Set([...body.selftape_urls, body.selftape_url].map(u => (u || '').trim()).filter(Boolean)));
  const problem = checkApplication(project as CastingProject, body.role_id, tapes[0] || '');
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row: Record<string, unknown> = {
    project_id: body.project_id,
    role_id: body.role_id,
    talent_id: actor.talent.id,
    selftape_url: tapes[0] || null,
    selftape_urls: tapes,
    note: body.note || null,
    status: NEW_APPLICATION_STATUS
  };
  let { error } = await db.from('project_applications').insert(row);
  // Chưa chạy migration selftape_urls: vẫn lưu đơn với self-tape đầu tiên
  if (error && /selftape_urls/i.test(error.message)) {
    delete row.selftape_urls;
    ({ error } = await db.from('project_applications').insert(row));
  }
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Bạn đã ứng tuyển vai này rồi.' }, { status: 409 });
    console.error('[dienvienvn] Không lưu được đơn ứng tuyển:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, full_name: actor.talent.full_name });
}
