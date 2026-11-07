import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { toProducerTalent } from '@/lib/projects/producer';
import { approvedTalents, getPartner, logPartnerView } from '@/lib/dienvienvn/partner-server';
import { clientIp, isBlocked, recordHit } from '@/lib/dienvienvn/rate-limit';
import { TalentProfile } from '@/lib/types/crm';

// Link kho diễn viên gửi NSX: toàn bộ hồ sơ đã duyệt.
// Chưa đăng nhập: cấp công khai (ảnh, tên, khoảng tuổi, chiều cao, cân nặng, kinh nghiệm, kỹ năng; không liên hệ, số đo).
// Đối tác đã duyệt đăng nhập: đầy đủ. Mã sai nhiều lần thì IP bị chặn tạm, để không dò được mã.
const FAIL_LIMIT = 20;
const FAIL_WINDOW_MS = 60 * 60 * 1000;
const NOT_FOUND = 'Link không hợp lệ hoặc đã bị thu hồi.';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const raw = decodeURIComponent((await params).token).trim().toLowerCase();
  const token = raw.split('-').pop() || '';
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const failKey = `kho-fail:${clientIp(req.headers)}`;
  if (isBlocked(failKey, FAIL_LIMIT, FAIL_WINDOW_MS)) {
    return NextResponse.json({ error: 'Bạn đã mở sai link quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  if (!/^[0-9a-z]{12,64}$/.test(token)) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const { data: link } = await db.from('talent_catalog_links').select('*').eq('token', token).maybeSingle();
  if (!link || link.revoked) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  if (Date.parse(link.expires_at) < Date.now()) {
    return NextResponse.json({ error: 'Link đã hết hạn. Vui lòng liên hệ DienVienVN để nhận link mới.' }, { status: 410 });
  }

  let full = false;
  if (req.headers.get('authorization')) {
    const partner = await getPartner(req, db);
    if (!(partner instanceof NextResponse)) {
      full = true;
      logPartnerView(db, partner.id, { source: 'shortlist' });
    }
  }

  // Hồ sơ đã duyệt (đọc theo trang, mỗi lần tối đa 1000 dòng)
  const talents: TalentProfile[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await approvedTalents(db).order('updated_at', { ascending: false }).range(from, from + 999);
    if (error) return NextResponse.json({ error: 'Không tải được hồ sơ diễn viên.' }, { status: 500 });
    talents.push(...((data || []) as TalentProfile[]));
    if (!data || data.length < 1000) break;
  }

  return NextResponse.json(
    {
      mode: 'live',
      limited: !full,
      label: link.label || null,
      expires_at: link.expires_at,
      talents: talents.filter(t => t.headshot_url || t.fullbody_url).map(t => toProducerTalent(t, false, full ? 'partner' : 'public'))
    },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
  );
}
