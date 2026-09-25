# ACT ACADEMY - MINI CRM & TALENT CASTING MATCHING SYSTEM

Hệ thống Web Application Mini CRM chuyên biệt cho **ACT ACADEMY**, phục vụ hai mục tiêu chiến lược cốt lõi:
1. **Academy Growth (Tuyển sinh & Bán hàng):** Quản lý chu trình và phễu tuyển sinh (Lead Pipeline Kanban & Data Table), tiếp nhận Lead tự động qua Meta Ads Webhook (Facebook Lead Gen), hỗ trợ nhập tay nhanh chóng, và chuyển đổi Lead thành Talent chỉ với 1 click.
2. **Casting Matching (Talent Pool & Tuyển vai):** Quản trị hồ sơ diễn viên chuyên sâu theo chuẩn Casting Form 6 phần của ngành điện ảnh, tích hợp bộ lọc đa tiêu chí thông minh thời gian thực (nhân trắc học, độ tuổi, chiều cao, số đo 3 vòng, giọng vùng miền, ngoại ngữ, võ thuật/nhạc cụ/vũ đạo, mức độ sẵn sàng vai diễn: cảnh hôn/bikini/bán khỏa thân, khu vực quay phim), cùng tính năng xuất **Comp-Card (Sed Card) tiêu chuẩn A4** gửi Đạo diễn và Nhà sản xuất.
3. **Nạp sẵn dữ liệu thực tế:** Hệ thống đã tự động trích xuất, chuẩn hóa số điện thoại và làm sạch toàn bộ 1.750 dòng dữ liệu học viên (621 học viên duy nhất) từ file `[CRM] ACT - Student Data.xlsx`.

---

## 🛠️ Tech Stack
* **Framework:** Next.js 15+ (App Router, React 19, TypeScript, Server & Client Components)
* **Giao diện & Styling:** Tailwind CSS, Radix UI primitives, Lucide Icons, Sonner (Toast alerts), Canvas Confetti
* **Cơ sở dữ liệu & Backend:** Supabase (PostgreSQL, Supabase Auth, Storage bucket `talent-media`, Row Level Security - RLS)
* **Kiến trúc Dữ liệu Dual-Mode:**
  * **Live Supabase Mode:** Kết nối trực tiếp khi cấu hình file `.env.local`
  * **Offline / Local Demo Mode:** Chạy độc lập mượt mà với toàn bộ dữ liệu thực tế từ Excel được nạp sẵn vào client state và localStorage.

---

## 📁 Cấu Trúc Thư Mục
```
mkt admission/
├── [CRM] ACT - Student Data.xlsx     # File Excel dữ liệu học viên thực tế của ACT
├── scripts/
│   └── extract_excel_students.py     # Script Python trích xuất & chuẩn hóa dữ liệu Excel
├── supabase/
│   ├── migrations/
│   │   └── 20250101_init_crm.sql     # Script SQL migration hoàn chỉnh (Bảng, RLS, Storage)
│   └── seed.sql                      # SQL seed dữ liệu học viên thực tế ACT Academy
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Dashboard KPIs tổng quan (Lead, Tỷ lệ nhập học, Talent Pool)
│   │   │   ├── layout.tsx            # Layout với Sidebar & Topbar
│   │   │   ├── leads/page.tsx        # Pipeline Kanban 6 cột & Bảng dữ liệu Lead
│   │   │   └── talents/
│   │   │       ├── page.tsx          # Smart Casting Filter Dashboard & Talent Grid
│   │   │       ├── new/page.tsx      # Form tạo mới hồ sơ Casting 6 bước
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # Chi tiết hồ sơ diễn viên & Xuất Comp-Card
│   │   │           └── edit/page.tsx # Chỉnh sửa hồ sơ 6 bước
│   │   └── api/webhooks/meta-lead/
│   │       └── route.ts              # Route Handler tiếp nhận webhook Meta Ads
│   ├── components/
│   │   ├── leads/                    # Kanban Board, Table View, Dialog nhập lead
│   │   ├── talents/                  # Filter Sidebar, Talent Card, Comp-Card, Form 6 bước
│   │   └── navigation/               # Sidebar & Topbar
│   ├── lib/
│   │   ├── store/crm-context.tsx     # Context & State Provider
│   │   ├── supabase/                 # Client & Server Supabase helpers
│   │   ├── types/crm.ts              # TypeScript models chuẩn
│   │   └── utils.ts
│   └── data/
│       └── seed_data.json            # 621 Leads & 50 Talent Profiles thực tế từ Excel
└── .env.example
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Khởi động môi trường phát triển:
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 2. Triển khai Cơ sở dữ liệu Supabase (Tùy chọn):
1. Đăng nhập vào trang quản trị [Supabase Dashboard](https://supabase.com).
2. Vào **SQL Editor**, mở file `supabase/migrations/20250101_init_crm.sql` và bấm **Run** để khởi tạo các bảng:
   * `profiles` (Kế thừa từ `auth.users`)
   * `leads` (Quản trị tuyển sinh, nguồn, campaign)
   * `talent_profiles` (Hồ sơ diễn viên chuyên sâu 6 phần)
   * Storage bucket `talent-media` và toàn bộ chính sách Row Level Security (RLS).
3. Mở file `supabase/seed.sql` và bấm **Run** để nạp học viên thực tế vào database.
4. Tạo file `.env.local` từ mẫu `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
META_WEBHOOK_VERIFY_TOKEN=act_crm_meta_token_secret_2025
META_PAGE_ACCESS_TOKEN=your-meta-page-access-token
```

---

## 📡 Tích Hợp Meta Ads Lead Gen (Facebook Webhook)
1. Endpoint Webhook: `https://your-domain.vercel.app/api/webhooks/meta-lead`
2. **Xác thực Token (GET request):**
   * Hub Verify Token: `act_crm_meta_token_secret_2025` (hoặc cấu hình trong `.env`)
   * Endpoint tự động trả về `hub.challenge` với HTTP 200.
3. **Tiếp nhận Lead (POST request):**
   * Endpoint tự động trích xuất `leadgen_id`, gọi Meta Graph API để lấy thông tin họ tên, số điện thoại, khóa học quan tâm, rồi ghi vào bảng `leads` với `source = 'meta_ads'`.
