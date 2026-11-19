// Song ngữ DienVienVN: tiếng Việt là bản gốc (chữ trong code), tiếng Anh tra từ điển theo đúng câu tiếng Việt.
// Câu có biến dùng mẫu "{0}", "{1}"… (VD "Cần {0} người" → "Need {0} people").
// Không có trong từ điển → giữ nguyên tiếng Việt (không bao giờ lỗi trang).
export type Lang = 'vi' | 'en';
export type Dict = Record<string, string>;
export const LANG_COOKIE = 'dvvn_lang';
export const LANG_HEADER = 'x-dienvienvn-lang';

type Pattern = { re: RegExp; order: number[]; out: string; literal: number };
const VI_CHAR = /[À-ỹđĐ]/;
const SEP = ' · ';

/** Hàm dịch cho 1 từ điển (null = tiếng Việt, trả nguyên văn). */
export function makeTranslator(dict: Dict | null): (s: string) => string {
  if (!dict) return s => s;
  const patterns: Pattern[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{\d+\}/.test(k)) continue;
    const parts = k.split(/(\{\d+\})/);
    const order: number[] = [];
    const src = parts.map(p => {
      const m = /^\{(\d+)\}$/.exec(p);
      if (m) {
        order.push(Number(m[1]));
        return '([\\s\\S]*?)';
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    patterns.push({ re: new RegExp(`^${src.join('')}$`), order, out: v, literal: k.replace(/\{\d+\}/g, '').length });
  }
  // Mẫu có phần chữ cố định dài trước (khớp chính xác hơn)
  patterns.sort((a, b) => b.literal - a.literal);

  const viaPattern = (t: string): string | null => {
    for (const p of patterns) {
      const m = p.re.exec(t);
      if (!m) continue;
      const vals: Record<number, string> = {};
      // Giá trị trong mẫu cũng dịch nếu có trong từ điển (VD "Giọng {0}" với {0} = "Huế")
      p.order.forEach((n, i) => (vals[n] = dict[m[i + 1]] ?? m[i + 1]));
      // Mẫu ngắn (VD "{0} tuổi{1}") không được nuốt nội dung người dùng nhập ("Phim về tuổi trẻ")
      if (p.literal < 8 && Object.values(vals).some(x => VI_CHAR.test(x))) continue;
      return p.out.replace(/\{(\d+)\}/g, (_, n) => vals[Number(n)] ?? '');
    }
    return null;
  };

  const cache = new Map<string, string>();
  const tr = (s: string): string => {
    if (!s) return s;
    const hit = dict[s];
    if (hit !== undefined) return hit;
    if (!VI_CHAR.test(s)) return s;
    const cached = cache.get(s);
    if (cached !== undefined) return cached;
    const trimmed = s.trim();
    let out = s;
    if (trimmed !== s && dict[trimmed] !== undefined) out = s.replace(trimmed, dict[trimmed]);
    else {
      const viaP = viaPattern(trimmed);
      if (viaP !== null) out = s.replace(trimmed, viaP);
      // Danh sách ghép bằng " · " (VD "Nữ · 18–25 tuổi · Cần 1 người"): dịch từng phần
      else if (trimmed.includes(SEP)) out = s.replace(trimmed, trimmed.split(SEP).map(tr).join(SEP));
    }
    if (cache.size < 5000) cache.set(s, out);
    return out;
  };
  return tr;
}

/** Đường dẫn của trang ở ngôn ngữ kia (giữ nguyên trang đang xem). */
export function switchLangPath(pathname: string, to: Lang): string {
  const m = /^(\/dienvienvn)?(\/en)?(\/.*)?$/.exec(pathname);
  const prefix = m?.[1] || '';
  const rest = m?.[3] || '';
  if (to === 'en') return `${prefix}/en${rest === '/' ? '' : rest}` || '/en';
  return `${prefix}${rest}` || '/';
}
