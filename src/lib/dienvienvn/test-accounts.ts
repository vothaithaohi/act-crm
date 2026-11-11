// Tài khoản test của team dev: vẫn đăng ký / đăng nhập / dùng mọi tính năng như người dùng thường,
// nhưng KHÔNG hiện trong danh sách hồ sơ công khai (trang Hồ sơ diễn viên, ảnh chạy trên trang chủ, sitemap).

/** "TÉST", "(test)", "T.e.s.t", "t3st", "Testing Account"… → chuỗi chữ thường không dấu, chỉ còn chữ cái. */
function compact(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/3/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}

/** Ngoại lệ: hồ sơ vẫn hiện công khai dù khớp quy tắc test (theo username). */
const ALWAYS_PUBLIC: string[] = [];
/** Tài khoản test không có chữ "test" trong tên / username / email: liệt kê username ở đây để ẩn. */
const ALWAYS_HIDDEN = ['tienle'];

/** Hồ sơ là tài khoản test nếu tên, username hoặc email có chữ "test" (viết kiểu nào cũng nhận ra). */
export function isTestAccount(t: { full_name?: string | null; name?: string | null; username?: string | null; email?: string | null }): boolean {
  const user = (t.username || '').trim().toLowerCase();
  if (user && ALWAYS_HIDDEN.includes(user)) return true;
  if (user && ALWAYS_PUBLIC.includes(user)) return false;
  // Email chỉ xét phần trước @ (tên miền như "contest.vn" không tính)
  const emailLocal = t.email ? t.email.split('@')[0] : null;
  return [t.full_name, t.name, t.username, emailLocal].some(v => !!v && compact(v).includes('test'));
}
