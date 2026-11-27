import { NextRequest, NextResponse, after } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceDb } from '@/lib/projects/server';
import { advance, chain, processSecret } from '@/lib/recap/server';

// Mỗi lượt chạy xử lý 1 bước (tải file sang AI / bóc băng 20 phút / tóm tắt) rồi tự gọi lượt tiếp theo.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const given = Buffer.from(req.headers.get('x-recap-secret') || '');
  const want = Buffer.from(processSecret());
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const { id } = await req.json().catch(() => ({ id: '' }));
  const { db } = getServiceDb();
  if (!db || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Thiếu mã.' }, { status: 400 });
  const origin = req.nextUrl.origin;
  after(async () => {
    if (await advance(db, id)) await chain(origin, id);
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
