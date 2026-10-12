import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, toPublicProject } from '@/lib/projects/types';

// Danh sách dự án công khai (đang casting), hoặc 1 dự án theo ?id= (trừ bản nháp).
// Tên thật / công ty sản xuất bị loại bỏ ngay trên server khi dự án bật "Ẩn tên".
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    const { data, error } = await db.from('casting_projects').select('*').eq('id', id).neq('status', 'draft').maybeSingle();
    if (error) return NextResponse.json({ error: 'Không tải được dự án.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    return NextResponse.json({ mode: 'live', project: toPublicProject(data as CastingProject) });
  }

  const { data, error } = await db
    .from('casting_projects')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Không tải được danh sách dự án.' }, { status: 500 });
  return NextResponse.json({ mode: 'live', projects: (data as CastingProject[]).map(toPublicProject) });
}
