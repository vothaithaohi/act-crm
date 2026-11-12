
import { toast } from 'sonner';

/**
 * Super Admin "Xem với vai trò…": chỉ đổi giao diện sang vai trò khác để kiểm tra.
 * Trong lúc xem thử, mọi thao tác ghi (tạo / sửa / xoá) bị chặn ngay ở trình duyệt để không lỡ tay đổi dữ liệu thật.
 */
export const VIEW_AS_KEY = 'act_crm_view_as';

export function readViewAs(): string | null {
  try {
    return window.sessionStorage.getItem(VIEW_AS_KEY);
  } catch {
    return null;
  }
}

export function writeViewAs(role: string | null) {
  try {
    if (role) window.sessionStorage.setItem(VIEW_AS_KEY, role);
    else window.sessionStorage.removeItem(VIEW_AS_KEY);
  } catch {
    /* trình duyệt chặn lưu */
  }
}

export const PREVIEW_BLOCKED_MESSAGE = 'Đang xem thử với vai trò khác — thay đổi không được lưu. Thoát chế độ xem thử để thao tác.';

let lastToast = 0;
function blocked(): Response {
  if (Date.now() - lastToast > 2500) {
    lastToast = Date.now();
    toast.warning(PREVIEW_BLOCKED_MESSAGE);
  }
  return new Response(JSON.stringify({ error: PREVIEW_BLOCKED_MESSAGE, message: PREVIEW_BLOCKED_MESSAGE, code: 'PREVIEW_READ_ONLY' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

/** fetch chặn ghi khi đang xem thử (đăng nhập / làm mới phiên và hàm đọc dữ liệu vẫn cho qua). */
export function previewGuardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && typeof window !== 'undefined' && readViewAs()) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const allowed = /\/auth\/v1\//.test(url) || /\/rest\/v1\/rpc\//.test(url) || /\/storage\/v1\/object\/sign\//.test(url);
    if (!allowed) return Promise.resolve(blocked());
  }
  return fetch(input, init);
}
