import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { AI_JOBS_MISSING, AI_KEY_MISSING, runAiTalentJob } from '@/lib/dienvienvn/ai-talent';

// AI tạo hồ sơ diễn viên từ tên và / hoặc link (đọc link, tìm thêm nguồn, đối chứng) — chỉ Super Admin và Casting.
// Chạy nền 2–3 phút; CRM hỏi tiến trình bằng GET.
export const maxDuration = 300;
const ROLES = ['super_admin', 'casting'];
const COLUMNS = 'id, created_by, input, status, talent_id, error, created_at, updated_at';
// Nhập tên hoặc dán link (chỉ cần một trong hai)
const schema = z
  .object({
    name: z.string().trim().max(120).default(''),
    links: z.array(z.string().trim().url('Link chưa đúng định dạng.').max(500)).max(5, 'Tối đa 5 link.').default([]),
    note: z.string().trim().max(1000).default(''),
    force: z.boolean().default(false)
  })
  .refine(v => v.name.length >= 2 || v.links.length > 0, { message: 'Nhập tên diễn viên hoặc dán ít nhất 1 link.' });
const likeExact = (v: string) => v.replace(/[\\%_]/g, m => `\\${m}`);
const missing = (m?: string) => /ai_profile_jobs|schema cache/i.test(m || '');

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: AI_KEY_MISSING }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });
  const { name, links, note, force } = parsed.data;

  // Tránh tạo trùng: tên đã có trong kho → hỏi lại trước
  if (!force && name) {
    const { data: dup } = await g.db.from('talent_profiles').select('id, full_name, username, submission_source, review_status').ilike('full_name', `%${likeExact(name)}%`).limit(5);
    if (dup?.length) return NextResponse.json({ duplicates: dup });
  }

  const input = { name, links, note };
  const { data: job, error } = await g.db.from('ai_profile_jobs').insert({ created_by: g.staff.email, input, status: 'running' }).select(COLUMNS).single();
  if (error || !job) return NextResponse.json({ error: missing(error?.message) ? AI_JOBS_MISSING : 'Không bắt đầu được. Vui lòng thử lại.' }, { status: 500 });

  // Chạy sau khi đã trả lời (không bắt CRM chờ)
  after(() => runAiTalentJob(g.db, job.id as string, input, g.staff.email));
  return NextResponse.json({ job });
}

/** ?id= : 1 lượt chạy; không có id: 10 lượt gần nhất. Lượt "đang chạy" quá 6 phút coi như lỗi. */
export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  const q = g.db.from('ai_profile_jobs').select(COLUMNS);
  const { data, error } = id ? await q.eq('id', id).limit(1) : await q.order('created_at', { ascending: false }).limit(10);
  if (error) return NextResponse.json({ jobs: [], error: missing(error.message) ? AI_JOBS_MISSING : 'Không tải được.' });
  const stale = Date.now() - 6 * 60 * 1000;
  const jobs = (data || []).map(j =>
    j.status === 'running' && Date.parse(j.created_at as string) < stale ? { ...j, status: 'failed', error: 'Lượt chạy bị gián đoạn. Vui lòng thử lại.' } : j
  );
  return NextResponse.json({ jobs, keyReady: !!process.env.ANTHROPIC_API_KEY }, { headers: { 'Cache-Control': 'no-store' } });
}
