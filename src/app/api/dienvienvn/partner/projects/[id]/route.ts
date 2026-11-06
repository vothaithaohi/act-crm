import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner, partnerProjectView, updatePartnerProject } from '@/lib/dienvienvn/partner-server';
import { firstIssue, partnerProjectSchema } from '@/lib/dienvienvn/partner-project-input';

// Ứng viên của 1 dự án được gắn cho đối tác (chỉ hồ sơ đã duyệt, không bị Loại).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;

  const { id } = await params;
  const view = /^[0-9a-z-]{1,100}$/i.test(id) ? await partnerProjectView(db, partner, id) : null;
  if (!view) return NextResponse.json({ error: 'Không tìm thấy dự án hoặc bạn chưa được gắn vào dự án này.' }, { status: 404 });

  return NextResponse.json({ mode: 'live', ...view }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}

// Đối tác sửa casting call tự đăng (chỉ khi còn chờ ACT duyệt).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
  const parsed = partnerProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  const result = await updatePartnerProject(db, partner, id, parsed.data);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.project.id });
}
