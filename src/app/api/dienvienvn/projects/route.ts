import { NextRequest, NextResponse } from 'next/server';
import { getActor } from '@/lib/dienvienvn/actor-server';
import { findProjectByParam, getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CastingProject, toPublicProject } from '@/lib/projects/types';

// Dự án đang casting — chỉ diễn viên đã đăng nhập mới xem được.
// Danh sách dự án mở, hoặc 1 dự án theo ?id= (UUID hoặc đường dẫn tên dự án, VD: mot-phim-linh-dinh-dv-01; trừ bản nháp).
// Tên thật / công ty sản xuất bị loại bỏ ngay trên server khi dự án bật "Ẩn tên".
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const actor = await getActor(req, db);
  if (actor instanceof NextResponse) return actor;

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const data = await findProjectByParam(db, id);
    if (data === 'error') return NextResponse.json({ error: 'Không tải được dự án.' }, { status: 500 });
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
