import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SET_PASSWORD_PATH } from './actor-server';
import { publicSiteUrl } from './hosts';
import { sendMail } from './mailer';

/**
 * Email tài khoản do hệ thống tự gửi qua Brevo (không dùng mẫu email chung của Supabase — mẫu đó viết cho diễn viên).
 * Dùng cho đối tác và ứng viên ekip: xác nhận tài khoản mới, gửi lại link, quên mật khẩu.
 */
export type AuthMailAudience = 'partner' | 'crew';
export type AuthMailPurpose = 'confirm' | 'reset';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const COPY: Record<AuthMailAudience, Record<AuthMailPurpose, { subject: string; title: string; body: string; button: string; ignore: string }>> = {
  partner: {
    confirm: {
      subject: 'DienVienVN – Xác nhận tài khoản đối tác',
      title: 'Xác nhận tài khoản đối tác.',
      body: 'bấm nút bên dưới để xác nhận email và tạo mật khẩu. Bạn dùng được cổng đối tác (xem liên hệ diễn viên, đăng casting, tuyển ekip) sau khi DienVienVN duyệt tài khoản.',
      button: 'Xác nhận & tạo mật khẩu',
      ignore: 'Nếu bạn không đăng ký tài khoản đối tác trên DienVienVN, hãy bỏ qua email này.'
    },
    reset: {
      subject: 'DienVienVN – Đặt lại mật khẩu tài khoản đối tác',
      title: 'Đặt lại mật khẩu.',
      body: 'bấm nút bên dưới để đặt mật khẩu mới cho tài khoản đối tác DienVienVN.',
      button: 'Đặt mật khẩu mới',
      ignore: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.'
    }
  },
  crew: {
    confirm: {
      subject: 'DienVienVN – Xác nhận tài khoản ứng viên ekip',
      title: 'Xác nhận tài khoản ứng viên ekip.',
      body: 'bấm nút bên dưới để xác nhận email và tạo mật khẩu. Sau đó bạn hoàn thiện hồ sơ ekip, lưu CV và ứng tuyển việc làm ekip trên DienVienVN.',
      button: 'Xác nhận & tạo mật khẩu',
      ignore: 'Nếu bạn không đăng ký tài khoản ekip trên DienVienVN, hãy bỏ qua email này.'
    },
    reset: {
      subject: 'DienVienVN – Đặt lại mật khẩu tài khoản ekip',
      title: 'Đặt lại mật khẩu.',
      body: 'bấm nút bên dưới để đặt mật khẩu mới cho tài khoản ứng viên ekip DienVienVN.',
      button: 'Đặt mật khẩu mới',
      ignore: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.'
    }
  }
};

function render(audience: AuthMailAudience, purpose: AuthMailPurpose, name: string, link: string) {
  const c = COPY[audience][purpose];
  const hello = name ? `Xin chào ${escapeHtml(name)},` : 'Xin chào,';
  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1d1d1f">
  <p style="font-size:20px;font-weight:600;margin:0 0 24px">🎬 DienVienVN</p>
  <h2 style="font-size:22px;margin:0 0 12px">${c.title}</h2>
  <p style="font-size:15px;line-height:1.5;color:#424245;margin:0 0 24px">${hello} ${c.body}</p>
  <a href="${link}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:980px">${escapeHtml(c.button)}</a>
  <p style="font-size:12px;line-height:1.5;color:#86868b;margin:28px 0 0">${c.ignore}</p>
</div>`;
  const text = `${name ? `Xin chào ${name},` : 'Xin chào,'} ${c.body}\n\n${c.button}: ${link}\n\n${c.ignore}`;
  return { subject: c.subject, html, text };
}

/** Trang tạo mật khẩu nhận "for" để hiện lời nhắn đúng đối tượng. */
const FOR_PARAM: Record<AuthMailAudience, string> = { partner: 'doi-tac', crew: 'ekip' };

/**
 * Tạo link xác nhận / đặt lại mật khẩu (chỉ chủ hộp thư mới mở được) và tự gửi email.
 * - type 'invite': tài khoản mới (tạo luôn tài khoản với `data` làm user_metadata). Email đã có tài khoản → trả 'exists'.
 * - type 'recovery': tài khoản đã có. `purpose` chọn nội dung email (xác nhận lại hay đặt lại mật khẩu).
 */
export async function mailAuthLink(
  db: SupabaseClient,
  opts: {
    email: string;
    name: string;
    audience: AuthMailAudience;
    type: 'invite' | 'recovery';
    purpose: AuthMailPurpose;
    data?: Record<string, unknown>;
  },
  headers: Headers
): Promise<{ result: 'sent' | 'exists' | 'failed'; userId: string | null }> {
  const email = opts.email.trim().toLowerCase();
  const redirectTo = `${publicSiteUrl(headers)}${SET_PASSWORD_PATH}`;
  const { data, error } =
    opts.type === 'invite'
      ? await db.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: opts.data } })
      : await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  if (error || !data?.properties?.hashed_token) {
    if (error && /already|registered|exists/i.test(error.message)) return { result: 'exists', userId: null };
    console.error('[dienvienvn] Không tạo được link tài khoản:', error?.message);
    return { result: 'failed', userId: null };
  }
  // Xác nhận tài khoản: trang tạo mật khẩu hiện như "Xác nhận tài khoản" (kể cả khi là link khôi phục gửi lại)
  const forParam = opts.purpose === 'confirm' ? `&for=${FOR_PARAM[opts.audience]}` : '';
  const link = `${redirectTo}?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${opts.type}${forParam}`;
  const ok = await sendMail({ to: email, ...render(opts.audience, opts.purpose, opts.name, link) });
  return { result: ok ? 'sent' : 'failed', userId: data.user?.id || null };
}
