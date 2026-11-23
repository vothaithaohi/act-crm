import { NextRequest, NextResponse, after } from 'next/server';
import { syncActorToBrevo } from '@/lib/dienvienvn/brevo-actor';
import { z } from 'zod';
import { getActor } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, NEW_APPLICATION_STATUS, SelftapeItem, checkApplication, missingRequiredSelftape, roleSelftapeRequests, visibleRoles } from '@/lib/projects/types';
import { selfTapeUrl } from '@/lib/dienvienvn/selftapes';

const schema = z.object({
  project_id: z.string().uuid(),
  role_id: z.string().min(1).max(64),
  selftape_url: z.string().trim().max(500).optional().default(''),
  selftape_urls: z.array(selfTapeUrl).max(10).optional().default([]),
  selftape_items: z.array(z.object({ request_id: z.string().min(1).max(64), url: z.string().trim().max(500) })).max(10).optional().default([]),
  note: z.string().trim().max(1000).optional().default('')
});

const isUrl = (u: string) => /^https?:\/\/\S+$/i.test(u);

/** Self-tape theo yêu cầu của vai (bỏ yêu cầu không có / link trống) + các link khác; trả lỗi nếu link sai. */
function collectTapes(role: CastingProject['roles'][number], items: SelftapeItem[], extra: string[]): { items: SelftapeItem[]; urls: string[]; error?: string } {
  const ids = new Set(roleSelftapeRequests(role).map(q => q.id));
  const clean = items.map(i => ({ request_id: i.request_id, url: (i.url || '').trim() })).filter(i => ids.has(i.request_id) && i.url);
  const bad = [...clean.map(i => i.url), ...extra].find(u => !isUrl(u));
  if (bad) return { items: [], urls: [], error: 'Link self-tape không hợp lệ (cần bắt đầu bằng http:// hoặc https://).' };
  const urls = Array.from(new Set([...clean.map(i => i.url), ...extra.map(u => u.trim()).filter(Boolean)]));
  return { items: clean, urls };
}

/** Ghi đơn; chưa chạy migration selftape_items / selftape_updated_at thì bỏ các cột đó. */
async function writeApplication(run: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string; code?: string } | null }>, row: Record<string, unknown>) {
  let r = await run(row);
  for (const col of ['selftape_items', 'selftape_updated_at', 'selftape_urls']) {
    if (r.error && new RegExp(col, 'i').test(r.error.message) && col in row) {
      delete row[col];
      r = await run(row);
    }
  }
  return r;
}

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
  // Self-tape theo từng yêu cầu của vai + self-tape tick trong thư viện + link dán thêm, bỏ trùng
  const role = (project as CastingProject).roles?.find(r => r.id === body.role_id);
  const t = collectTapes(role || ({} as CastingProject['roles'][number]), body.selftape_items, [...body.selftape_urls, body.selftape_url]);
  if (t.error) return NextResponse.json({ error: t.error }, { status: 400 });
  const tapes = t.urls;
  const problem = checkApplication(project as CastingProject, body.role_id, tapes[0] || '') || (role ? missingRequiredSelftape(role, t.items) : null);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row: Record<string, unknown> = {
    project_id: body.project_id,
    role_id: body.role_id,
    talent_id: actor.talent.id,
    selftape_url: tapes[0] || null,
    selftape_urls: tapes,
    selftape_items: t.items,
    note: body.note || null,
    status: NEW_APPLICATION_STATUS
  };
  const { error } = await writeApplication(r => db.from('project_applications').insert(r), row);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Bạn đã ứng tuyển vai này rồi.' }, { status: 409 });
    console.error('[dienvienvn] Không lưu được đơn ứng tuyển:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, vui lòng thử lại.' }, { status: 500 });
  }
  // Brevo: thêm dự án / vai vừa ứng tuyển vào trường lọc của diễn viên
  const talentId = actor.talent.id;
  after(() => syncActorToBrevo(db, talentId));
  return NextResponse.json({ ok: true, full_name: actor.talent.full_name });
}

const editSchema = z.object({
  application_id: z.string().uuid(),
  selftape_url: z.string().trim().max(500).optional().default(''),
  selftape_urls: z.array(selfTapeUrl).max(10).optional().default([]),
  selftape_items: z.array(z.object({ request_id: z.string().min(1).max(64), url: z.string().trim().max(500) })).max(10).optional().default([]),
  note: z.string().trim().max(1000).optional()
});

// Chỉnh sửa hồ sơ ứng tuyển: diễn viên bổ sung / nộp lại self-tape (theo từng yêu cầu của vai) và lời nhắn.
// Được sửa khi dự án còn mở (kể cả đã qua hạn nộp, để ACT yêu cầu nộp lại) và vai còn hiện. CRM và link NSX thấy ngay.
export async function PATCH(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  if (isRateLimited(`apply-edit:${clientIp(req.headers)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }
  const actor = await getActor(req, db);
  if (actor instanceof NextResponse) return actor;
  if (!actor.talent) return NextResponse.json({ error: 'Tài khoản này chưa gắn với hồ sơ diễn viên nào.' }, { status: 404 });

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Self-tape chưa hợp lệ.' }, { status: 400 });
  const body = parsed.data;

  const { data: app } = await db.from('project_applications').select('id, project_id, role_id, talent_id').eq('id', body.application_id).maybeSingle();
  if (!app || app.talent_id !== actor.talent.id) return NextResponse.json({ error: 'Không tìm thấy đơn ứng tuyển.' }, { status: 404 });
  const { data: project } = await db.from('casting_projects').select('*').eq('id', app.project_id).maybeSingle();
  const role = visibleRoles((project as CastingProject | null)?.roles).find(r => r.id === app.role_id);
  if (!project || project.status !== 'open' || !role) {
    return NextResponse.json({ error: 'Dự án đã ngừng nhận hồ sơ nên không sửa được self-tape.' }, { status: 400 });
  }
  const t = collectTapes(role, body.selftape_items, [...body.selftape_urls, body.selftape_url]);
  if (t.error) return NextResponse.json({ error: t.error }, { status: 400 });
  if ((project as CastingProject).selftape_required && !t.urls.length) return NextResponse.json({ error: 'Dự án này bắt buộc gửi link self-tape (YouTube, Google Drive…).' }, { status: 400 });
  const missing = missingRequiredSelftape(role, t.items);
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { selftape_url: t.urls[0] || null, selftape_urls: t.urls, selftape_items: t.items, selftape_updated_at: now };
  if (body.note !== undefined) patch.note = body.note || null;
  const { error } = await writeApplication(r => db.from('project_applications').update(r).eq('id', app.id), patch);
  if (error) {
    console.error('[dienvienvn] Không sửa được self-tape:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, selftape_urls: t.urls, selftape_items: t.items, note: patch.note ?? null, selftape_updated_at: 'selftape_updated_at' in patch ? now : null });
}
