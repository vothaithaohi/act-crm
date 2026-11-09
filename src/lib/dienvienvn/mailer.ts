import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Gửi email thông báo (không phải email đăng nhập của Supabase) qua cùng SMTP Brevo mà Supabase đang dùng.
 * Cấu hình trên Vercel: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 */
export function mailerReady(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!mailerReady()) {
    console.error('[dienvienvn] Chưa cấu hình SMTP_HOST / SMTP_USER / SMTP_PASS nên không gửi được email.');
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transport.sendMail({ from: process.env.SMTP_FROM || 'DienVienVN <no-reply@dienvienvn.com>', ...msg });
    return true;
  } catch (e) {
    console.error('[dienvienvn] Gửi email lỗi:', e instanceof Error ? e.message : e);
    return false;
  }
}
