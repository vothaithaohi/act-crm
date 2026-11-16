import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner } from '@/lib/dienvienvn/partner-server';
import { DRAFTS_MISSING, deleteDraft, draftsMissing, getDraft, listDrafts, saveDraft } from '@/lib/dienvienvn/crew-job-drafts';

// Bản nháp tin tuyển ekip của đối tác đang đăng nhập (chỉ đối tác đó thấy).
async function who(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return { res: NextResponse.json({ mode: 'demo', drafts: [] }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return { res: partner };
  return { db, partner };
}

export async function GET(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const draft = await getDraft(w.db, w.partner.id, id);
    return draft ? NextResponse.json({ draft }, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Không tìm thấy bản nháp.' }, { status: 404 });
  }
  const { drafts, error } = await listDrafts(w.db, w.partner.id);
  if (error) return NextResponse.json({ drafts: [], error: draftsMissing(error) ? DRAFTS_MISSING : undefined });
  return NextResponse.json({ drafts }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  const body = (await req.json().catch(() => null)) as { id?: string | null; form?: unknown } | null;
  const res = await saveDraft(w.db, w.partner.id, { id: body?.id, form: body?.form }, w.partner.email || 'Đối tác');
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}

export async function DELETE(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  await deleteDraft(w.db, w.partner.id, req.nextUrl.searchParams.get('id') || '');
  return NextResponse.json({ ok: true });
}
