import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';

// Tải file PDF gốc (kịch bản, hướng dẫn self-tape) lên kho công khai để diễn viên xem và tải về in.
// Cấp link tải thẳng từ trình duyệt (không qua Vercel → không bị giới hạn 4,5MB).
const ROLES = ['super_admin', 'admin', 'casting'];
const MAX = 30 * 1024 * 1024;
const BUCKET = 'talent-media';

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const body = (await req.json().catch(() => null)) as { name?: string; size?: number } | null;
  if (!body?.name || !/\.pdf$/i.test(body.name)) return NextResponse.json({ error: 'Chỉ nhận file PDF.' }, { status: 400 });
  if (typeof body.size === 'number' && body.size > MAX) return NextResponse.json({ error: 'File PDF quá lớn (tối đa 30MB).' }, { status: 400 });
  const path = `dienvienvn/briefs/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.pdf`;
  const { data, error } = await g.db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[dienvienvn] Không tạo được link tải PDF:', error?.message);
    return NextResponse.json({ error: 'Không tải được file PDF lên. Vui lòng thử lại.' }, { status: 500 });
  }
  const url = g.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ bucket: BUCKET, path: data.path, token: data.token, url });
}
