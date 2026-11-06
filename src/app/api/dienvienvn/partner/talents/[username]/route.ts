import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { approvedTalents, getPartner, toPartnerTalent } from '@/lib/dienvienvn/partner-server';
import { USERNAME_PATTERN } from '@/lib/dienvienvn/hosts';
import { TalentProfile } from '@/lib/types/crm';

const NOT_FOUND = 'Không tìm thấy hồ sơ hoặc hồ sơ chưa được duyệt.';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;

  // Hồ sơ mở theo mã hồ sơ (UUID) — đối tác không được biết username vì username thường là tên thật
  const key = decodeURIComponent((await params).username).trim().toLowerCase();
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key);
  if (!isId && !USERNAME_PATTERN.test(key)) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

  const { data } = await approvedTalents(db).eq(isId ? 'id' : 'username', key).limit(1);
  const talent = (data?.[0] as TalentProfile | undefined) || null;
  if (!talent) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

  return NextResponse.json(
    { mode: 'live', talent: toPartnerTalent(talent) },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
  );
}
