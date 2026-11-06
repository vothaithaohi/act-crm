import { ImportedGuest } from './import-csv';
import { ShowcaseGuest, ShowcaseInvitation, foldVi } from './types';

/**
 * Tính trước các bản ghi cần ghi khi nhập file Excel: khách mời trùng (cùng email, SĐT hoặc họ tên) thì chỉ bổ sung
 * thông tin còn trống và các lượt mời chưa có; khách mời mới thì thêm mới. Nhập lại cùng file nhiều lần không bị trùng.
 */
export function planGuestImport(
  items: ImportedGuest[],
  guests: ShowcaseGuest[],
  invitations: ShowcaseInvitation[],
  createdBy: string | null,
  now: string
) {
  const key = (s?: string | null) => (s ? foldVi(s).replace(/\s+/g, ' ').trim() : '');
  const digits = (s?: string | null) => (s || '').replace(/\D/g, '');
  const existing = [...guests];
  const findMatch = (g: ImportedGuest) =>
    existing.find(
      e =>
        (g.email && e.email && key(e.email) === key(g.email)) ||
        (digits(g.phone).length >= 9 && digits(e.phone) === digits(g.phone)) ||
        key(e.full_name) === key(g.full_name)
    );

  // Mỗi khách mời chỉ xuất hiện 1 lần trong lệnh ghi (nhiều dòng Excel có thể cùng là 1 người,
  // VD: cùng tên ở nhiều Term) — ghi trùng id trong cùng 1 lệnh upsert sẽ bị Postgres từ chối.
  const toSave = new Map<string, ShowcaseGuest>();
  const newIds = new Set<string>();
  const updatedIds = new Set<string>();
  const invRows: ShowcaseInvitation[] = [];
  for (const g of items) {
    const match = findMatch(g);
    const { invitations: invs, ...fields } = g;
    let guest: ShowcaseGuest;
    if (match) {
      guest = { ...match };
      let changed = false;
      for (const [k, v] of Object.entries(fields) as [keyof typeof fields, unknown][]) {
        const cur = (guest as unknown as Record<string, unknown>)[k];
        const empty = cur === null || cur === undefined || cur === '' || (Array.isArray(cur) && cur.length === 0);
        if (empty && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
          (guest as unknown as Record<string, unknown>)[k] = v;
          changed = true;
        }
      }
      // Thay bản ghi trong danh sách so khớp để các dòng sau bổ sung tiếp trên bản mới nhất
      existing[existing.indexOf(match)] = guest;
      if (changed) {
        guest.updated_at = now;
        toSave.set(guest.id, guest);
        if (!newIds.has(guest.id)) updatedIds.add(guest.id);
      }
    } else {
      guest = { id: crypto.randomUUID(), ...fields, talkativity: null, created_by: createdBy, created_at: now, updated_at: now };
      toSave.set(guest.id, guest);
      newIds.add(guest.id);
      existing.push(guest);
    }
    const have = new Set(
      [...invitations, ...invRows].filter(x => x.guest_id === guest.id).map(x => `${x.term}|${x.class_code || ''}|${x.session || ''}`)
    );
    for (const inv of invs) {
      const k = `${inv.term}|${inv.class_code || ''}|${inv.session || ''}`;
      if (have.has(k)) continue;
      have.add(k);
      invRows.push({ id: crypto.randomUUID(), guest_id: guest.id, ...inv, created_at: now, updated_at: now });
    }
  }

  return { guestRows: Array.from(toSave.values()), invRows, added: newIds.size, updated: updatedIds.size };
}
