import { NextResponse } from 'next/server';
import { getPublicTalent } from '@/lib/dienvienvn/public-talents';

// Hồ sơ diễn viên cấp công khai (cho cửa sổ hồ sơ trượt): đã duyệt, công khai, không phải tài khoản test.
// Không có liên hệ, địa chỉ, ngày sinh, cân nặng, số đo, size giày.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const talent = await getPublicTalent(decodeURIComponent(username));
  if (!talent) return NextResponse.json({ error: 'Hồ sơ này chưa hiện công khai (chưa duyệt, đã ẩn hoặc là tài khoản test).' }, { status: 404 });
  return NextResponse.json({ talent }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', 'X-Robots-Tag': 'noindex' } });
}
