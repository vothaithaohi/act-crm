import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getCrewUser } from '@/lib/dienvienvn/crew-server';
import { readPdf, storePdf } from '@/lib/dienvienvn/crew-files';

// Tải cover letter (PDF) trước khi bấm gửi ứng tuyển. Trả về đường dẫn để gửi kèm lượt ứng tuyển.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', path: null });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const u = await getCrewUser(req, db);
  if (u instanceof NextResponse) return u;
  if (!u.crew) return NextResponse.json({ error: 'Vui lòng tạo hồ sơ ekip trước.', noProfile: true }, { status: 404 });
  if (u.crew.review_status === 'rejected') return NextResponse.json({ error: 'Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.' }, { status: 403 });
  if (isRateLimited(`crew-cover:${u.crew.id}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const pdf = await readPdf(form?.get('file') ?? null);
  if ('error' in pdf) return NextResponse.json({ error: pdf.error }, { status: 400 });
  const path = await storePdf(db, u.crew.id, 'cover', pdf.buffer);
  if (!path) return NextResponse.json({ error: 'Không tải được file lên. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ path, name: pdf.name });
}
