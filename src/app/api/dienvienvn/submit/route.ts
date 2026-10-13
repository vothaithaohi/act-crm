import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { castingDraftSchema } from '@/lib/dienvienvn/draft-schema';
import { CASTING_STEPS, CastingDraft, draftToTalentProfile, validateStep } from '@/lib/dienvienvn/casting-form';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, checkApplication } from '@/lib/projects/types';

/** Đơn ứng tuyển dự án đi kèm hồ sơ (khi diễn viên vào form từ trang dự án). */
const applicationSchema = z
  .object({
    project_id: z.string().uuid(),
    role_id: z.string().min(1).max(64),
    selftape_url: z.string().trim().max(500).optional().default('')
  })
  .optional()
  .nullable();

/** Cột mà PostgREST báo không tồn tại (PGRST204: "Could not find the 'x' column of 'y' in the schema cache"). */
function missingColumn(error: { code?: string; message?: string } | null): string | null {
  if (!error?.message) return null;
  if (error.code !== 'PGRST204' && error.code !== '42703' && !/column/i.test(error.message)) return null;
  return error.message.match(/'([a-z_]+)' column/i)?.[1] ?? error.message.match(/column "?([a-z_]+)"? of relation/i)?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  // Honeypot: trường ẩn mà người thật không bao giờ điền.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, id: crypto.randomUUID(), stored: 'supabase' });
  }

  if (isRateLimited(`submit:${clientIp(req.headers)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }

  const parsed = castingDraftSchema.safeParse((body as Record<string, unknown>)?.draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Thông tin chưa hợp lệ (${first?.path.join('.') || 'hồ sơ'}): ${first?.message}` },
      { status: 400 }
    );
  }

  const draft = parsed.data as CastingDraft;
  if (!draft.consent) {
    return NextResponse.json({ error: 'Vui lòng đồng ý với điều khoản sử dụng thông tin trước khi nộp.' }, { status: 400 });
  }

  for (const step of CASTING_STEPS) {
    const errors = validateStep(step.id, draft);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      return NextResponse.json({ error: `Bước ${step.id} (${step.title}): ${firstError}`, step: step.id }, { status: 400 });
    }
  }

  const appParsed = applicationSchema.safeParse((body as Record<string, unknown>)?.application);
  if (!appParsed.success) {
    return NextResponse.json({ error: 'Thông tin dự án ứng tuyển không hợp lệ.' }, { status: 400 });
  }
  const application = appParsed.data;

  const now = new Date().toISOString();
  const record = {
    ...draftToTalentProfile(draft),
    id: crypto.randomUUID(),
    submission_source: 'dienvienvn' as const,
    review_status: 'pending' as const,
    review_notes: null,
    submitted_at: now,
    created_at: now,
    updated_at: now
  };

  const { mode, db: supabase } = getServiceDb();
  if (mode === 'demo') {
    // Chế độ demo chưa cấu hình Supabase: trả bản ghi để trình duyệt lưu vào kho dữ liệu cục bộ của CRM.
    return NextResponse.json({ ok: true, id: record.id, stored: 'local', profile: record });
  }
  if (!supabase) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  if (application) {
    const { data: project } = await supabase.from('casting_projects').select('*').eq('id', application.project_id).maybeSingle();
    if (!project || project.status === 'draft') {
      return NextResponse.json({ error: 'Dự án ứng tuyển không còn tồn tại.' }, { status: 400 });
    }
    const problem = checkApplication(project as CastingProject, application.role_id, application.selftape_url);
    if (problem) return NextResponse.json({ error: problem, step: 6 }, { status: 400 });
  }

  // Nếu database còn thiếu cột (chưa chạy đủ migration), bỏ cột đó và lưu lại để không mất hồ sơ.
  const row: Record<string, unknown> = { ...record };
  let { error } = await supabase.from('talent_profiles').insert(row);
  for (let attempt = 0; error && attempt < 8; attempt++) {
    const col = missingColumn(error);
    if (!col || !(col in row) || col === 'id') break;
    console.error(`[dienvienvn] Bảng talent_profiles thiếu cột "${col}" — hãy chạy migration 20261014_schema_alignment.sql.`);
    delete row[col];
    ({ error } = await supabase.from('talent_profiles').insert(row));
  }

  if (error) {
    console.error('[dienvienvn] Không lưu được hồ sơ casting:', error);
    return NextResponse.json(
      { error: 'Hệ thống đang bận, hồ sơ chưa được lưu. Vui lòng thử lại sau ít phút.' },
      { status: 500 }
    );
  }

  if (application) {
    const { error: appError } = await supabase.from('project_applications').insert({
      project_id: application.project_id,
      role_id: application.role_id,
      talent_id: record.id,
      selftape_url: application.selftape_url || null,
      status: 'applied'
    });
    if (appError) {
      // Hồ sơ đã lưu; đơn ứng tuyển lỗi thì CRM vẫn thêm tay được từ kho diễn viên.
      console.error('[dienvienvn] Lưu hồ sơ OK nhưng không lưu được đơn ứng tuyển:', appError);
      return NextResponse.json({ ok: true, id: record.id, stored: 'supabase', applicationSaved: false });
    }
  }

  return NextResponse.json({ ok: true, id: record.id, stored: 'supabase', applicationSaved: !!application });
}
