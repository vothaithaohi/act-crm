// Danh mục cơ sở đào tạo nghệ thuật tại Việt Nam (tham khảo cho form hồ sơ diễn viên).
// Nguồn: tài liệu "Danh sách trường nghệ thuật Việt Nam" do ban quản trị cung cấp.

export type SchoolRegion = 'north' | 'central' | 'south';

export interface ArtSchool {
  name: string;
  group: string;
  city: string;
  region: SchoolRegion;
}

export const ACT_ACADEMY_SCHOOL = 'ACT Academy';
export const OTHER_SCHOOL = 'Cơ sở khác / Tự nhập';

export const SCHOOL_REGION_LABELS: Record<SchoolRegion, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam'
};

export const ART_SCHOOLS: ArtSchool[] = [
  { name: 'Trường Đại học Sân khấu - Điện ảnh Hà Nội', group: 'Sân khấu – điện ảnh – diễn xuất', city: 'Hà Nội', region: 'north' },
  { name: 'Trường Đại học Văn hóa Nghệ thuật Quân đội', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'Hà Nội', region: 'north' },
  { name: 'Học viện Âm nhạc Quốc gia Việt Nam', group: 'Âm nhạc – thanh nhạc', city: 'Hà Nội', region: 'north' },
  { name: 'Trường Đại học Mỹ thuật Việt Nam', group: 'Mỹ thuật – thiết kế', city: 'Hà Nội', region: 'north' },
  { name: 'Học viện Múa Việt Nam', group: 'Múa – nghệ thuật biểu diễn', city: 'Hà Nội', region: 'north' },
  { name: 'Trường Đại học Văn hóa Hà Nội', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'Hà Nội', region: 'north' },
  { name: 'Trường Cao đẳng Nghệ thuật Hà Nội', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'Hà Nội', region: 'north' },
  { name: 'Trường Đại học Nghệ thuật, Đại học Huế', group: 'Mỹ thuật – thiết kế', city: 'Huế', region: 'central' },
  { name: 'Học viện Âm nhạc Huế', group: 'Âm nhạc – thanh nhạc', city: 'Huế', region: 'central' },
  { name: 'Trường Cao đẳng Văn hóa Nghệ thuật Đà Nẵng', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'Đà Nẵng', region: 'central' },
  { name: 'Trường Đại học Sân khấu - Điện ảnh TP.HCM', group: 'Sân khấu – điện ảnh – diễn xuất', city: 'TP. Hồ Chí Minh', region: 'south' },
  { name: 'Nhạc viện TP.HCM', group: 'Âm nhạc – thanh nhạc', city: 'TP. Hồ Chí Minh', region: 'south' },
  { name: 'Trường Đại học Mỹ thuật TP.HCM', group: 'Mỹ thuật – thiết kế', city: 'TP. Hồ Chí Minh', region: 'south' },
  { name: 'Trường Đại học Văn hóa TP.HCM', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'TP. Hồ Chí Minh', region: 'south' },
  { name: 'Trường Cao đẳng Văn hóa Nghệ thuật TP.HCM', group: 'Văn hóa – nghệ thuật tổng hợp', city: 'TP. Hồ Chí Minh', region: 'south' }
];

export function findArtSchool(name?: string | null): ArtSchool | undefined {
  if (!name) return undefined;
  return ART_SCHOOLS.find(s => s.name === name);
}
