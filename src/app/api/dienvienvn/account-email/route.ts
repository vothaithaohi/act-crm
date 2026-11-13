import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findAuthUserByEmail, findTalentByEmail, isStaffEmail, sendAccountEmail } from '@/lib/dienvienvn/actor-server';
import { mailAuthLink } from '@/lib/dienvienvn/auth-mail';
import { sendPartnerEmail } from '@/lib/dienvienvn/partner-server';
import { PartnerAccount } from '@/lib/dienvienvn/partners';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';

const schema = z.object({ email: z.string().trim().email().max(160) });

// Gửi lại email kích hoạt tài khoản / đặt lại mật khẩu. Luôn trả cùng một thông báo
// để không lộ email nào đã có hồ sơ.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ error: 'Chế độ demo chưa hỗ trợ tài khoản diễn viên.' }, { status: 400 });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  if (isRateLimited(`account-email:${clientIp(req.headers)}`, 5, 15 * 60 * 1000) || isRateLimited(`account-email:${email}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, { status: 429 });
  }

  const talent = await findTalentByEmail(db, email);
  if (talent) {
    await sendAccountEmail(db, talent, req.headers);
    return NextResponse.json({ ok: true });
  }
  // Tài khoản đối tác (đạo diễn, NSX…) quên mật khẩu, hoặc đối tác đang chờ duyệt chưa nhận được email xác nhận
  const like = email.replace(/[\\%_]/g, m => `\\${m}`);
  const { data } = await db.from('partner_accounts').select('*').ilike('email', like).limit(1);
  const partner = data?.[0] as PartnerAccount | undefined;
  if (partner && partner.status !== 'disabled') {
    await sendPartnerEmail(db, partner, req.headers);
    return NextResponse.json({ ok: true });
  }
  // Tài khoản ứng viên ekip: quên mật khẩu, hoặc chưa nhận được email xác nhận
  if (!(await isStaffEmail(db, email))) {
    const user = await findAuthUserByEmail(db, email);
    const { data: crewRows } = await db.from('crew_profiles').select('full_name').ilike('public_email', like).limit(1).then(r => r, () => ({ data: null }));
    const isCrew = !!crewRows?.length || user?.user_metadata?.kind === 'dienvienvn_crew';
    if (user && isCrew) {
      const name = (crewRows?.[0]?.full_name as string) || (user.user_metadata?.full_name as string) || '';
      // Chưa từng đăng nhập (chưa tạo mật khẩu) → email xác nhận; đã dùng → email đặt lại mật khẩu
      await mailAuthLink(db, { email, name, audience: 'crew', type: 'recovery', purpose: user.last_sign_in_at ? 'reset' : 'confirm' }, req.headers);
    }
  }
  return NextResponse.json({ ok: true });
}
