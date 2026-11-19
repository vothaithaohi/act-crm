import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { TRANSLATE_KEY_MISSING, translatePost } from '@/lib/dienvienvn/academy-server';
import { viHash } from '@/lib/dienvienvn/academy';

// AI dịch bài Academy sang tiếng Anh. Trả bản dịch để Admin xem / sửa rồi mới lưu.
export const maxDuration = 300;
const schema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(400).default(''),
  content: z.string().trim().max(100_000).default('')
});

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ['super_admin']);
  if ('res' in g) return g.res;
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: TRANSLATE_KEY_MISSING }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Cần có tiêu đề trước khi dịch.' }, { status: 400 });
  try {
    const en = await translatePost(parsed.data);
    return NextResponse.json({ ...en, source_hash: viHash(parsed.data) });
  } catch (e) {
    console.error('[academy] Dịch lỗi:', e);
    const msg = e instanceof Error && /[À-ỹ]/.test(e.message) ? e.message : 'AI chưa dịch được. Vui lòng thử lại sau ít phút.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
