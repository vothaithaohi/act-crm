import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { approvedTalents, getPartner, partnerProjects, toPartnerTalent } from '@/lib/dienvienvn/partner-server';
import { TalentProfile } from '@/lib/types/crm';

const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

// Cổng đối tác: toàn bộ hồ sơ diễn viên đã duyệt, đầy đủ thông tin (chỉ tài khoản đối tác đang hoạt động).
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;

  const { data, error } = await approvedTalents(db).order('updated_at', { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ error: 'Không tải được danh sách diễn viên.' }, { status: 500 });

  return NextResponse.json(
    {
      mode: 'live',
      partner: { full_name: partner.full_name, company: partner.company, partner_type: partner.partner_type },
      talents: ((data || []) as TalentProfile[]).map(toPartnerTalent),
      projects: await partnerProjects(db, partner)
    },
    { headers: PRIVATE }
  );
}
