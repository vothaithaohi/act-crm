import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getCrewUser } from '@/lib/dienvienvn/crew-server';
import { CREW_FILES_MISSING, listFiles, maxOf } from '@/lib/dienvienvn/crew-files';
import { CrewFileKind, CrewProfile } from '@/lib/dienvienvn/crew-profiles';

export type FilesCtx = { db: SupabaseClient; user: User; crew: CrewProfile | null };

/** Tài khoản đang đăng nhập (chưa cần có hồ sơ ekip). Tài khoản ekip bị khoá → chặn. */
export async function filesCtx(req: NextRequest): Promise<FilesCtx | { res: NextResponse }> {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return { res: NextResponse.json({ mode: 'demo', cvs: [], covers: [], portfolios: [] }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  const u = await getCrewUser(req, db);
  if (u instanceof NextResponse) return { res: u };
  if (u.crew?.review_status === 'rejected') return { res: NextResponse.json({ error: 'Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.' }, { status: 403 }) };
  return { db, user: u.user, crew: u.crew };
}

export const parseKind = (v: unknown): CrewFileKind | null => (v === 'cv' || v === 'cover' || v === 'portfolio' ? v : null);

/** Số file đang có của 1 loại; null = bảng chưa sẵn sàng. */
export async function countOf(ctx: FilesCtx, kind: CrewFileKind): Promise<number | null> {
  const lib = await listFiles(ctx.db, ctx.user.id, ctx.crew?.id).catch(() => null);
  if (!lib) return null;
  return (kind === 'cv' ? lib.cvs : kind === 'portfolio' ? lib.portfolios : lib.covers).length;
}

export function fullMessage(kind: CrewFileKind) {
  if (kind === 'portfolio') return `Kho Portfolio đã đủ ${maxOf('portfolio')} file. Vui lòng xoá bớt Portfolio cũ rồi tải file mới.`;
  return kind === 'cv'
    ? `Kho CV đã đủ ${maxOf('cv')} file. Vui lòng xoá bớt CV cũ rồi tải CV mới.`
    : `Kho cover letter đã đủ ${maxOf('cover')}. Vui lòng xoá bớt cover letter cũ.`;
}

export async function listResponse(ctx: FilesCtx, extra: Record<string, unknown> = {}) {
  try {
    const files = await listFiles(ctx.db, ctx.user.id, ctx.crew?.id);
    return NextResponse.json({ ...files, ...extra }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
  }
}
