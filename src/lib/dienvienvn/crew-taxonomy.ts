// Danh mục chuẩn cho Form A "Đăng tin tuyển dụng" (theo tài liệu Trang tuyển dụng).

export type Option = { id: string; label: string };

export const COMPANY_TYPES: Option[] = [
  { id: 'production_house', label: 'Production House / Studio' },
  { id: 'agency', label: 'Creative / Advertising Agency' },
  { id: 'broadcaster', label: 'Đài truyền hình / Đơn vị phát hành (Platform/Broadcaster)' },
  { id: 'indie', label: 'Đoàn phim độc lập (Indie Filmmaker)' },
  { id: 'in_house_brand', label: 'Nhãn hàng / Doanh nghiệp tự sản xuất (In-house Brand)' }
];

export const CREW_PROJECT_TYPES: Option[] = [
  { id: 'feature_film', label: 'Phim điện ảnh / Phim chiếu rạp (Feature Film)' },
  { id: 'series', label: 'Phim bộ / Web Drama / Series' },
  { id: 'short_doc', label: 'Phim ngắn / Phim tài liệu' },
  { id: 'tvc', label: 'TVC / Video quảng cáo nhãn hàng' },
  { id: 'mv', label: 'Music Video (MV)' },
  { id: 'corporate_social', label: 'Corporate Video / Viral Clip / Social Content' },
  { id: 'live_event', label: 'Gameshow / Sự kiện trực tiếp (Live Event / Broadcast)' }
];

export const PROJECT_PHASES: Option[] = [
  { id: 'pre_production', label: 'Tiền kỳ (Pre-production)' },
  { id: 'shooting', label: 'Bấm máy / Trường quay (Shooting)' },
  { id: 'post_production', label: 'Hậu kỳ (Post-production)' }
];

export type Role = { id: string; vi: string; en: string };
export type Department = { id: string; label: string; roles: Role[] };

const r = (vi: string, en: string): Role => ({
  id: en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''),
  vi,
  en
});

/** Cấp 1: phân nhóm chuyên môn (department) → Cấp 2: vị trí cụ thể (role_title). */
export const DEPARTMENTS: Department[] = [
  {
    id: 'pre_production',
    label: 'Biên kịch',
    roles: [
      r('Trưởng nhóm biên kịch / Chủ biên', 'Head Writer / Lead Screenwriter'),
      r('Biên kịch', 'Screenwriter / Scriptwriter'),
      r('Biên kịch xử lý thoại / Tinh chỉnh kịch bản', 'Dialogue Writer / Script Doctor'),
      r('Trợ lý biên kịch / Thư ký phòng viết', "Writers' Room Assistant"),
      r('Nghiên cứu tư liệu / Bối cảnh kịch bản', 'Story / Script Researcher'),
      r('Họa sĩ kịch bản phân cảnh', 'Storyboard Artist'),
      r('Giám đốc tuyển vai', 'Casting Director'),
      r('Trợ lý tuyển vai', 'Casting Assistant / Casting Coordinator'),
      r('Quản lý địa điểm / Tìm bối cảnh', 'Location Scout / Location Manager')
    ]
  },
  {
    id: 'prod_directing_camera',
    label: 'Trường quay - Đạo diễn & Hình ảnh',
    roles: [
      r('Đạo diễn', 'Director'),
      r('Trợ lý đạo diễn 1', '1st Assistant Director - 1st AD'),
      r('Trợ lý đạo diễn 2', '2nd Assistant Director - 2nd AD'),
      r('Thư ký trường quay', 'Continuity Supervisor / Script Supervisor'),
      r('Giám đốc hình ảnh', 'Director of Photography - D.O.P / Cinematographer'),
      r('Quay phim chính', 'Camera Operator / Cam Op'),
      r('Trợ lý máy quay 1 / Lấy nét', '1st Assistant Camera - 1st AC / Focus Puller'),
      r('Trợ lý máy quay 2', '2nd Assistant Camera - 2nd AC / Clapper Loader'),
      r('Kỹ thuật viên quản lý hình ảnh số trên set', 'Digital Imaging Technician - DIT'),
      r('Người vận hành thiết bị chống rung', 'Gimbal / Steadicam / Ronin Operator'),
      r('Người điều khiển máy bay quay phim', 'Drone / Aerial Cinematographer'),
      r('Trưởng nhóm ánh sáng', 'Gaffer'),
      r('Kỹ thuật viên ánh sáng', 'Best Boy Electric / Spark'),
      r('Trưởng nhóm cơ khí / Ray cẩu', 'Key Grip'),
      r('Kỹ thuật viên cơ khí', 'Best Boy Grip / Grip')
    ]
  },
  {
    id: 'prod_art_wardrobe',
    label: 'Trường quay - Mỹ thuật & Phục trang',
    roles: [
      r('Giám đốc thiết kế mỹ thuật', 'Production Designer'),
      r('Chỉ đạo nghệ thuật hiện trường', 'Art Director'),
      r('Họa sĩ phối cảnh / Đồ họa bối cảnh', 'Concept Artist / Graphic Designer for Film'),
      r('Quản lý đạo cụ', 'Prop Master / Props Coordinator'),
      r('Thợ thi công bối cảnh', 'Set Decorator / Set Dresser'),
      r('Đội trưởng xây dựng bối cảnh', 'Construction Coordinator'),
      r('Trưởng bộ phận phục trang / Nhà thiết kế trang phục', 'Costume Designer / Wardrobe Head'),
      r('Trợ lý phục trang / Giám sát đồ diễn', 'Wardrobe Supervisor / Wardrobe Assistant'),
      r('Trưởng nhóm hóa trang & Làm tóc', 'Key Hair & Makeup Artist - HMU Head'),
      r('Chuyên viên hóa trang kỹ xảo / Đắp vết thương', 'SFX Makeup Artist')
    ]
  },
  {
    id: 'prod_sound',
    label: 'Trường quay - Âm thanh',
    roles: [
      r('Kỹ sư âm thanh trường quay', 'Production Sound Mixer / Sound Recordist'),
      r('Kỹ thuật viên cần micro boom', 'Boom Operator'),
      r('Trợ lý âm thanh hiện trường', 'Sound Utility / Sound Assistant')
    ]
  },
  {
    id: 'post_production',
    label: 'Hậu kỳ & Kỹ xảo',
    roles: [
      r('Giám đốc hậu kỳ', 'Post-Production Supervisor'),
      r('Dựng phim chính', 'Lead Editor / Offline Editor'),
      r('Trợ lý dựng phim', 'Assistant Editor'),
      r('Chuyên gia chỉnh màu', 'Colorist'),
      r('Giám sát kỹ xảo hình ảnh', 'VFX Supervisor'),
      r('Họa sĩ ghép hình kỹ xảo', 'Compositor / Nuke Artist'),
      r('Họa sĩ 3D / Kỹ xảo CGI', '3D Generalist / 3D Modeler / Animator'),
      r('Thiết kế chuyển động đồ họa', 'Motion Graphic Designer'),
      r('Thiết kế hiệu ứng âm thanh', 'Sound Designer'),
      r('Kỹ thuật viên tiếng động mô phỏng', 'Foley Artist'),
      r('Kỹ sư thu âm lồng tiếng & Thoại', 'ADR Recordist / Voiceover Recordist'),
      r('Kỹ sư hòa âm tổng thể', 'Re-recording Mixer / Audio Post Mixer')
    ]
  }
];

export const SENIORITY_LEVELS: Option[] = [
  { id: 'intern', label: 'Intern / Trainee (Học việc / Thực tập)' },
  { id: 'junior', label: 'Junior (1–2 năm kinh nghiệm / Đã làm các dự án nhỏ)' },
  { id: 'mid', label: 'Mid-Level (2–4 năm kinh nghiệm / Độc lập xử lý công việc)' },
  { id: 'senior', label: 'Senior / Lead (Trên 4 năm kinh nghiệm / Đã lead ekip, dự án lớn)' }
];

export const EMPLOYMENT_TYPES: Option[] = [
  { id: 'day_rate', label: 'Theo ngày quay (Day-rate / On-set gig)' },
  { id: 'project', label: 'Theo dự án ngắn hạn (Project-based)' },
  { id: 'part_time', label: 'Bán thời gian (Part-time)' },
  { id: 'full_time', label: 'Toàn thời gian cố định (Full-time in-house)' }
];

export const WORK_CITIES: Option[] = [
  { id: 'hcm', label: 'TP.HCM' },
  { id: 'hanoi', label: 'Hà Nội' },
  { id: 'danang', label: 'Đà Nẵng' },
  { id: 'other', label: 'Khác' }
];

export const WORK_MODES: Option[] = [
  { id: 'on_set', label: 'On-set' },
  { id: 'on_site_studio', label: 'On-site Studio' },
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' }
];

export const SALARY_TYPES: Option[] = [
  { id: 'per_day', label: 'Cố định theo ngày (VND/ngày)' },
  { id: 'per_project', label: 'Trọn gói theo dự án (VND/project)' },
  { id: 'per_month', label: 'Lương tháng cố định (VND/tháng)' },
  { id: 'negotiable', label: 'Thỏa thuận theo năng lực (Negotiable)' }
];

export const labelOf = (list: Option[], id?: string | null) => list.find(o => o.id === id)?.label || '';
export const departmentOf = (id?: string | null) => DEPARTMENTS.find(d => d.id === id) || null;
export const roleOf = (dept?: string | null, role?: string | null) => departmentOf(dept)?.roles.find(x => x.id === role) || null;
