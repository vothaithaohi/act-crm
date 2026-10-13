import { NextRequest, NextResponse } from 'next/server';
import { castingDraftSchema } from '@/lib/dienvienvn/draft-schema';
import { CASTING_STEPS, CastingDraft, draftToTalentProfile, talentToDraft, validateStep } from '@/lib/dienvienvn/casting-form';
import { getActor, writeTalent } from '@/lib/dienvienvn/actor-server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, ProjectApplication, toPublicProject } from '@/lib/projects/types';
import { getReviewStatus } from '@/lib/types/crm';

const NO_PROFILE = 'Tài khoản này chưa gắn với hồ sơ casting nào. Vui lòng liên hệ đội ngũ DienVienVN.';

// Hồ sơ của diễn viên đang đăng nhập + các vai đã ứng tuyển.
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const actor = await getActor(req, db);
  if (actor instanceof NextResponse) return actor;
  const { talent, user } = actor;
  if (!talent) return NextResponse.json({ error: NO_PROFILE, noProfile: true, email: user.email }, { status: 404 });

  const { data: apps } = await db
    .from('project_applications')
    .select('*')
    .eq('talent_id', talent.id)
    .order('created_at', { ascending: false });
  const applications = (apps || []) as ProjectApplication[];
  const projectIds = Array.from(new Set(applications.map(a => a.project_id)));
  const { data: projects } = projectIds.length
    ? await db.from('casting_projects').select('*').in('id', projectIds)
    : { data: [] as CastingProject[] };
  const byId = new Map((projects as CastingProject[] | null || []).map(p => [p.id, toPublicProject(p)]));

  return NextResponse.json({
    mode: 'live',
    profile: {
      id: talent.id,
      full_name: talent.full_name,
      email: talent.email,
      headshot_url: talent.headshot_url || null,
      review_status: getReviewStatus(talent),
      updated_at: talent.updated_at || null
    },
    draft: talentToDraft(talent),
    applications: applications.map(a => {
      const project = byId.get(a.project_id);
      return {
        id: a.id,
        project_id: a.project_id,
        project_name: project?.display_name || 'Dự án đã kết thúc',
        role_name: project?.roles.find(r => r.id === a.role_id)?.name || 'Vai đã gỡ',
        created_at: a.created_at
      };
    })
  });
}

// Diễn viên tự chỉnh sửa / bổ sung hồ sơ. Email đăng nhập và trạng thái duyệt giữ nguyên.
export async function PUT(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ error: 'Chế độ demo chưa hỗ trợ tài khoản diễn viên.' }, { status: 400 });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const actor = await getActor(req, db);
  if (actor instanceof NextResponse) return actor;
  const { talent } = actor;
  if (!talent) return NextResponse.json({ error: NO_PROFILE }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = castingDraftSchema.safeParse(body?.draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: `Thông tin chưa hợp lệ (${first?.path.join('.') || 'hồ sơ'}): ${first?.message}` }, { status: 400 });
  }
  const draft = { ...(parsed.data as CastingDraft), email: talent.email };
  for (const step of CASTING_STEPS) {
    const firstError = Object.values(validateStep(step.id, draft))[0];
    if (firstError) return NextResponse.json({ error: `Bước ${step.id} (${step.title}): ${firstError}`, step: step.id }, { status: 400 });
  }

  const record: Record<string, unknown> = { ...draftToTalentProfile(draft), updated_at: new Date().toISOString() };
  ['email', 'user_id', 'lead_id', 'submission_source', 'review_status'].forEach(k => delete record[k]);

  const { error } = await writeTalent(row => db.from('talent_profiles').update(row).eq('id', talent.id), record);
  if (error) {
    console.error('[dienvienvn] Không cập nhật được hồ sơ:', error);
    return NextResponse.json({ error: 'Hệ thống đang bận, thay đổi chưa được lưu. Vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
