import { NextRequest } from 'next/server';
import { SITE_URL, isPublicHost } from '@/lib/dienvienvn/hosts';

// llms.txt: tóm tắt cho các trợ lý AI về DienVienVN (https://llmstxt.org).
export function GET(req: NextRequest) {
  if (!isPublicHost(req.headers)) return new Response('Not found', { status: 404 });
  const body = `# DienVienVN

> DienVienVN (dienvienvn.com) là nền tảng hồ sơ diễn viên kết nối diễn viên Việt Nam với đạo diễn và nhà sản xuất phim điện ảnh, web drama, phim truyền hình, quảng cáo (TVC) và MV. Chính thức ra mắt 00:00 ngày 11/11/2026 (giờ Việt Nam). Cổng nộp hồ sơ diễn viên đã mở.

Diễn viên nộp hồ sơ 7 bước (thông tin cá nhân, số đo, kinh nghiệm, kỹ năng, mức độ sẵn sàng vai, hình ảnh, đào tạo diễn xuất), xác nhận email để tạo tài khoản, sau đó đăng nhập để chỉnh sửa hồ sơ và ứng tuyển các dự án đang casting. Hồ sơ được đội ngũ casting duyệt trước khi giới thiệu tới nhà sản xuất.

## Trang chính
- [Trang chủ](${SITE_URL}/): giới thiệu và đếm ngược ngày ra mắt
- [Nộp hồ sơ diễn viên](${SITE_URL}/nop-ho-so): form đăng ký hồ sơ diễn viên
- [Diễn viên](${SITE_URL}/dien-vien): danh sách hồ sơ diễn viên đã duyệt; mỗi diễn viên có trang riêng dạng ${SITE_URL}/<username>

## Lưu ý
- Danh sách dự án đang casting chỉ hiển thị cho diễn viên đã đăng nhập.
- Đơn vị đào tạo liên kết: ACT Academy.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
