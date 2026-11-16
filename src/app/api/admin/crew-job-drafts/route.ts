import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { DRAFTS_MISSING, deleteDraft, draftsMissing, getDraft, listDrafts, saveDraft } from '@/lib/dienvienvn/crew-job-drafts';

// Bản nháp tin tuyển ekip của team ACT (dùng chung trong CRM).
export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const draft = await getDraft(g.db, null, id);
    return draft ? NextResponse.json({ draft }, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Không tìm thấy bản nháp.' }, { status: 404 });
  }
  const { drafts, error } = await listDrafts(g.db, null);
  if (error) return NextResponse.json({ drafts: [], error: draftsMissing(error) ? DRAFTS_MISSING : 'Không tải được bản nháp.' });
  return NextResponse.json({ drafts }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const body = (await req.json().catch(() => null)) as { id?: string | null; form?: unknown } | null;
  const res = await saveDraft(g.db, null, { id: body?.id, form: body?.form }, g.staff.email);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}

export async function DELETE(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  await deleteDraft(g.db, null, req.nextUrl.searchParams.get('id') || '');
  return NextResponse.json({ ok: true });
}
