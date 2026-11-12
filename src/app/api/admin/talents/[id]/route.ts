import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/supabase/auth-guard';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { purgeAuthIfOrphan } from '@/lib/supabase/account-cleanup';

// Xoá hồ sơ diễn viên (chỉ Super Admin — quyền talents:delete). Xoá luôn tài khoản đăng nhập của email đó
// nếu không còn gắn với hồ sơ nào khác, để nộp lại hồ sơ bằng email này không bị báo trùng.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffRole(req, ['super_admin', 'admin']);
  if (staff instanceof NextResponse) return staff;
  const { mode, db } = getServiceDb();
  if (mode === 'demo' || !staff) return NextResponse.json({ mode: 'demo', ok: true });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const { id } = await params;
  if (!/^[0-9a-z-]{1,64}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 });

  const { data: talent } = await db.from('talent_profiles').select('id, email, auth_user_id').eq('id', id).maybeSingle();
  if (!talent) return NextResponse.json({ ok: true, missing: true });
  const { error } = await db.from('talent_profiles').delete().eq('id', id);
  if (error) {
    console.error('[crm] Xoá hồ sơ diễn viên lỗi:', error.message);
    return NextResponse.json({ error: `Không xoá được hồ sơ: ${error.message}` }, { status: 500 });
  }
  const accountRemoved = await purgeAuthIfOrphan(db, { userId: talent.auth_user_id, email: talent.email }).catch(() => false);
  return NextResponse.json({ ok: true, accountRemoved });
}
