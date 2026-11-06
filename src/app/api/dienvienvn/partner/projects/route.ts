import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { createPartnerProject, getPartner } from '@/lib/dienvienvn/partner-server';
import { firstIssue, partnerProjectSchema } from '@/lib/dienvienvn/partner-project-input';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';

// Đối tác đăng casting call mới: luôn chờ ACT duyệt trước khi hiện cho diễn viên.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;
  if (isRateLimited(`partner-project:${partner.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã đăng quá nhiều dự án trong 1 giờ. Vui lòng thử lại sau.' }, { status: 429 });
  }

  const parsed = partnerProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  const result = await createPartnerProject(db, partner, parsed.data);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ id: result.project.id, code: result.project.code });
}
