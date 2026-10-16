// 34 đơn vị hành chính cấp tỉnh của Việt Nam sau sắp xếp theo Nghị quyết 202/2025/QH15
// (hiệu lực từ 01/07/2025): 6 thành phố trực thuộc trung ương và 28 tỉnh.
// value giữ "TP.HCM" để khớp dữ liệu và bộ lọc sẵn có của CRM.

export interface ProvinceOption {
  value: string;
  label: string;
}

export const VN_CITIES: ProvinceOption[] = [
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'TP.HCM', label: 'TP. Hồ Chí Minh' },
  { value: 'Hải Phòng', label: 'Hải Phòng' },
  { value: 'Đà Nẵng', label: 'Đà Nẵng' },
  { value: 'Cần Thơ', label: 'Cần Thơ' },
  { value: 'Huế', label: 'Huế' }
];

export const VN_PROVINCES: ProvinceOption[] = [
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai',
  'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long'
].map(name => ({ value: name, label: name }));

export const ABROAD = 'Nước ngoài';

export const ALL_PROVINCES: ProvinceOption[] = [...VN_CITIES, ...VN_PROVINCES];

export function provinceLabel(value: string): string {
  return ALL_PROVINCES.find(p => p.value === value)?.label || value;
}
