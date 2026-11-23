import 'server-only';

/**
 * Đưa email người đăng ký sang danh bạ Brevo (để gửi email hàng loạt), mỗi nhóm một danh sách:
 *   BREVO_API_KEY           – API key Brevo (Settings → SMTP & API → API Keys), nhập trên Vercel
 *   BREVO_LIST_ACTOR        – mã danh sách Diễn viên
 *   BREVO_LIST_PARTNER      – mã danh sách Nhà sản xuất / đối tác
 *   BREVO_LIST_CREW         – mã danh sách Ekip
 * Chưa cấu hình thì bỏ qua (không ảnh hưởng đăng ký).
 */
export type BrevoAudience = 'actor' | 'partner' | 'crew';
export type BrevoContact = {
  email: string;
  name?: string | null;
  phone?: string | null;
  /** Thông tin thêm để lọc trên Brevo (giới tính, đã học ACT, dự án đã ứng tuyển…) */
  extra?: Record<string, string | number>;
};

const LIST_ENV: Record<BrevoAudience, string> = { actor: 'BREVO_LIST_ACTOR', partner: 'BREVO_LIST_PARTNER', crew: 'BREVO_LIST_CREW' };
const API = 'https://api.brevo.com/v3';

export function brevoReady(): boolean {
  return !!process.env.BREVO_API_KEY;
}

const listId = (a: BrevoAudience): number | null => {
  const n = Number(process.env[LIST_ENV[a]]);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** 0901234567 → +84901234567 (Brevo cần số dạng quốc tế); không hợp lệ → bỏ. */
function intlPhone(phone?: string | null): string | null {
  const d = (phone || '').replace(/[^\d+]/g, '');
  if (/^\+\d{9,15}$/.test(d)) return d;
  if (/^0\d{9,10}$/.test(d)) return `+84${d.slice(1)}`;
  if (/^84\d{9,10}$/.test(d)) return `+${d}`;
  return null;
}

function attributes(c: BrevoContact, withPhone: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  if (c.name?.trim()) out.FIRSTNAME = c.name.trim();
  const p = withPhone ? intlPhone(c.phone) : null;
  if (p) out.SMS = p;
  return { ...out, ...(c.extra as Record<string, string>) };
}

/**
 * Các trường lọc của diễn viên trên Brevo (tự tạo nếu chưa có). Brevo: Contacts → lọc theo trường, hoặc tạo Segment.
 * text: lọc "chứa / bằng"; float: lọc lớn hơn / nhỏ hơn.
 */
export const ACTOR_BREVO_ATTRIBUTES: Record<string, 'text' | 'float'> = {
  GIOI_TINH: 'text',
  NAM_SINH: 'float',
  TUOI: 'float',
  TINH_THANH: 'text',
  CHIEU_CAO: 'float',
  CO_KINH_NGHIEM: 'text',
  SO_DU_AN_DA_DONG: 'float',
  HOC_ACT: 'text',
  CAP_DO_ACT: 'text',
  GIONG_VUNG_MIEN: 'text',
  NGOAI_NGU: 'text',
  TRANG_THAI_HO_SO: 'text',
  HIEN_CONG_KHAI: 'text',
  NGUON_HO_SO: 'text',
  SO_LAN_UNG_TUYEN: 'float',
  DU_AN_UNG_TUYEN: 'text',
  VAI_UNG_TUYEN: 'text'
};

let attributesReady: Promise<void> | null = null;
/** Tạo các trường lọc trên Brevo (1 lần mỗi lần máy chủ khởi động; trường đã có thì Brevo báo trùng, bỏ qua). */
export function ensureActorAttributes(): Promise<void> {
  if (!brevoReady()) return Promise.resolve();
  attributesReady ||= Promise.all(
    Object.entries(ACTOR_BREVO_ATTRIBUTES).map(([name, type]) => call(`/contacts/attributes/normal/${name}`, { type }))
  ).then(rs => {
    const bad = rs.filter(r => !r.ok && !/already|exist|duplicate|unique/i.test(r.text));
    if (bad.length) {
      console.error('[dienvienvn] Brevo: chưa tạo được trường lọc:', bad.map(b => `${b.status} ${b.text.slice(0, 120)}`).join(' | '));
      attributesReady = null; // lần sau thử lại
    }
  });
  return attributesReady;
}

async function call(path: string, body: unknown, method: 'POST' | 'GET' = 'POST'): Promise<{ ok: boolean; status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), path === '/contacts/import' ? 20000 : 6000);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'api-key': process.env.BREVO_API_KEY as string, 'content-type': 'application/json', accept: 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      signal: ctrl.signal
    });
    return { ok: res.ok, status: res.status, text: await res.text().catch(() => '') };
  } catch (e) {
    return { ok: false, status: 0, text: e instanceof Error ? e.message : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/** Thêm / cập nhật 1 liên hệ vào danh sách của nhóm. Không bao giờ ném lỗi (đăng ký vẫn thành công). */
export async function syncBrevoContact(audience: BrevoAudience, c: BrevoContact): Promise<void> {
  if (!brevoReady() || !c.email) return;
  const id = listId(audience);
  const body = (withPhone: boolean) => ({ email: c.email.trim().toLowerCase(), attributes: attributes(c, withPhone), updateEnabled: true, ...(id ? { listIds: [id] } : {}) });
  let r = await call('/contacts', body(true));
  // Số điện thoại trùng với liên hệ khác / sai định dạng → lưu không kèm SĐT
  if (!r.ok && /SMS|phone/i.test(r.text)) r = await call('/contacts', body(false));
  if (!r.ok) console.error(`[dienvienvn] Brevo: chưa thêm được liên hệ (${r.status}):`, r.text.slice(0, 200));
}

/** Đưa cả danh sách lên Brevo một lần (dùng cho các email đã đăng ký trước đây). */
export async function importBrevoContacts(
  audience: BrevoAudience,
  contacts: BrevoContact[]
): Promise<{ ok: boolean; count: number; error?: string; processIds?: number[] }> {
  if (!brevoReady()) return { ok: false, count: 0, error: 'Chưa cấu hình BREVO_API_KEY trên Vercel.' };
  const id = listId(audience);
  if (!id) return { ok: false, count: 0, error: `Chưa cấu hình ${LIST_ENV[audience]} trên Vercel.` };
  const seen = new Set<string>();
  const rows = contacts
    .map(c => ({ ...c, email: (c.email || '').trim().toLowerCase() }))
    .filter(c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) && !seen.has(c.email) && !!seen.add(c.email));
  if (!rows.length) return { ok: true, count: 0 };
  const processIds: number[] = [];
  // Nhập theo từng đợt; không gửi SĐT khi nhập hàng loạt (tránh 1 số trùng làm hỏng cả đợt)
  for (let i = 0; i < rows.length; i += 1000) {
    const r = await call('/contacts/import', {
      jsonBody: rows.slice(i, i + 1000).map(c => ({ email: c.email, attributes: attributes(c, false) })),
      listIds: [id],
      updateExistingContacts: true,
      emptyContactsAttributes: false
    });
    if (!r.ok) return { ok: false, count: i, error: `Brevo báo lỗi (${r.status}): ${r.text.slice(0, 160)}`, processIds };
    // Brevo nhập ngầm: giữ mã tiến trình để kiểm tra đã nhập xong chưa
    try {
      const id = Number(JSON.parse(r.text)?.processId);
      if (id) processIds.push(id);
    } catch {
      /* bỏ qua */
    }
  }
  return { ok: true, count: rows.length, processIds };
}

/** Trạng thái các lượt nhập ngầm trên Brevo: queued / in_process / completed (hoặc lỗi). */
export async function brevoProcessStatus(ids: number[]): Promise<{ id: number; status: string; error?: string }[]> {
  if (!brevoReady()) return [];
  return Promise.all(
    ids.slice(0, 20).map(async id => {
      const r = await call(`/processes/${id}`, null, 'GET');
      if (!r.ok) return { id, status: 'unknown', error: `${r.status} ${r.text.slice(0, 120)}` };
      try {
        const j = JSON.parse(r.text);
        return { id, status: String(j.status || 'unknown') };
      } catch {
        return { id, status: 'unknown' };
      }
    })
  );
}
