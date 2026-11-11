import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { CREW_BUCKET, CREW_FILES_MISSING, maxOf, newPath } from '@/lib/dienvienvn/crew-files';
import { CREW_FILE_MAX_BYTES } from '@/lib/dienvienvn/crew-profiles';
import { countOf, filesCtx, fullMessage, parseKind } from '../shared';

// Bước 1 tải file: cấp link tải thẳng từ trình duyệt lên kho riêng tư (không qua Vercel → không bị giới hạn 4,5MB).
export async function POST(req: NextRequest) {
  const ctx = await filesCtx(req);
  if ('res' in ctx) return ctx.res;
  if (isRateLimited(`crew-upload:${ctx.user.id}`, 40, 60 * 60 * 1000)) return NextResponse.json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { kind?: string; size?: number } | null;
  const kind = parseKind(body?.kind);
  if (!kind) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  if (typeof body?.size === 'number' && body.size > CREW_FILE_MAX_BYTES) return NextResponse.json({ error: 'File vượt quá 10MB.' }, { status: 400 });
  const count = await countOf(ctx, kind);
  if (count === null) return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
  if (count >= maxOf(kind)) return NextResponse.json({ error: fullMessage(kind), full: true }, { status: 400 });

  const path = newPath(ctx.user.id, kind);
  const { data, error } = await ctx.db.storage.from(CREW_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[dienvienvn] Không tạo được link tải file ekip:', error?.message);
    return NextResponse.json({ error: /not found|bucket/i.test(error?.message || '') ? CREW_FILES_MISSING : 'Không tải được file lên. Vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token, bucket: CREW_BUCKET });
}
