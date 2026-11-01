// Đọc file "MASTER GUEST LIST SHOWCASE" (xuất từ Excel dạng CSV UTF-8) thành danh sách khách mời
// + lịch sử mời theo Term / lớp / buổi.
//
// Bố cục bảng gốc:
//   dòng tiêu đề:  STT | FULL NAME | FIRST NAME | TITLE | PHONE | EMAIL | BIO | PHOTO | NOTES | … | TERM 36 | … | TERM 35 | …
//   dòng dưới:     … | CONTACT in Future Y/N | SUITABLE FOR | ACT1A | ACT1B | …     (lớp của từng Term)
//   dòng dưới nữa: … AM | PM | CONTACTED | 9/7/2023 …                                  (buổi)
//   các dòng sau:  mỗi dòng 1 khách mời, ô của từng cột Term/lớp/buổi là trạng thái (CONFIRMED, SUCCESS…)
import { InvitationStatus, parseInvitationStatus } from './types';

export interface ImportedGuest {
  full_name: string;
  call_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  judge_notes: string | null;
  contact_future: boolean | null;
  suitable_for: string[];
  invitations: { term: string; class_code: string | null; session: string | null; status: InvitationStatus; note: string | null }[];
}

export interface ImportResult {
  guests: ImportedGuest[];
  /** File không phải UTF-8 / bị mất dấu tiếng Việt */
  brokenEncoding: boolean;
  error?: string;
}

/** CSV chuẩn RFC 4180: hỗ trợ ô có dấu phẩy, xuống dòng, dấu nháy kép. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const clean = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const cleanMultiline = (s: string | undefined) => (s || '').replace(/\r/g, '').trim();
const orNull = (s: string) => (s ? s : null);

/** Tên đầy đủ: "NGUYỄN VĂN A" → "Nguyễn Văn A" (giữ nguyên nếu đã viết hoa thường). */
function titleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function parseGuestSheet(text: string): ImportResult {
  const body = text.replace(/^﻿/, '');
  // Dấu hiệu mất dấu: ký tự thay thế, hoặc nhiều dấu "?" kẹt giữa chữ (VD: "TH? HI?P")
  const brokenEncoding = /�/.test(body) || (body.match(/[A-Za-zÀ-ỹ]\?[A-Za-zÀ-ỹ]/g) || []).length > 20;

  const rows = parseCsv(body);
  const headerIdx = rows.findIndex(r => r.some(c => /full\s*name/i.test(c)));
  if (headerIdx < 0) return { guests: [], brokenEncoding, error: 'Không tìm thấy dòng tiêu đề có cột "FULL NAME".' };
  const header = rows[headerIdx];
  const classRow = rows[headerIdx + 1] || [];
  const sessionRow = rows[headerIdx + 2] || [];

  const col = (re: RegExp, rowArr = header) => rowArr.findIndex(c => re.test(c));
  const cName = col(/full\s*name/i);
  const cFirst = col(/first\s*name/i);
  const cTitle = col(/^\s*title\s*$/i);
  const cPhone = col(/phone/i);
  const cEmail = col(/e-?mail/i);
  const cBio = col(/^\s*bio\s*$/i);
  const cPhoto = col(/photo/i);
  const cNotes = col(/notes|judge/i);
  const cContact = col(/contact\s*in\s*future/i, classRow);
  const cSuitable = col(/suitable/i, classRow);

  // Cột Term: từ cột "TERM …" đầu tiên trở đi; ô tiêu đề Term / lớp được kéo sang các cột trống bên phải
  const firstTermCol = header.findIndex(c => /term\s*\d+/i.test(c));
  if (firstTermCol < 0) return { guests: [], brokenEncoding, error: 'Không tìm thấy cột "TERM …".' };
  const width = Math.max(header.length, classRow.length, sessionRow.length);
  const termOf: (string | null)[] = [];
  const classOf: (string | null)[] = [];
  let term: string | null = null;
  let cls: string | null = null;
  for (let j = 0; j < width; j++) {
    if (j < firstTermCol) {
      termOf.push(null);
      classOf.push(null);
      continue;
    }
    const t = clean(header[j]);
    if (/term\s*\d+/i.test(t)) {
      term = t.toUpperCase().replace(/\s+/g, ' ');
      cls = null;
    }
    const c = cleanMultiline(classRow[j]).split('\n').map(s => s.trim()).filter(Boolean).join(' / ');
    if (c) cls = c;
    termOf.push(term);
    classOf.push(cls);
  }

  const guests: ImportedGuest[] = [];
  for (const r of rows.slice(headerIdx + 3)) {
    const name = clean(r[cName]);
    if (!name) continue;
    const invitations: ImportedGuest['invitations'] = [];
    for (let j = firstTermCol; j < r.length; j++) {
      const raw = clean(r[j]);
      if (!raw || !termOf[j] || /^#(REF|N\/A|VALUE|NAME)[!?]?$/i.test(raw)) continue;
      const { status, note } = parseInvitationStatus(raw);
      invitations.push({ term: termOf[j] as string, class_code: classOf[j], session: orNull(clean(sessionRow[j])), status, note });
    }
    const contactRaw = cContact >= 0 ? clean(r[cContact]).toLowerCase() : '';
    guests.push({
      full_name: titleCase(name),
      call_name: cFirst >= 0 ? orNull(clean(r[cFirst])) : null,
      title: cTitle >= 0 ? orNull(clean(r[cTitle])) : null,
      phone: cPhone >= 0 ? orNull(clean(r[cPhone]).replace(/[^\d+ ]/g, '')) : null,
      email: cEmail >= 0 ? orNull(clean(r[cEmail]).toLowerCase()) : null,
      bio: cBio >= 0 ? orNull(cleanMultiline(r[cBio])) : null,
      photo_url: cPhoto >= 0 && /^https?:\/\//i.test(clean(r[cPhoto])) ? clean(r[cPhoto]) : null,
      judge_notes: [cNotes >= 0 ? cleanMultiline(r[cNotes]) : '', cPhoto >= 0 && clean(r[cPhoto]) && !/^https?:\/\//i.test(clean(r[cPhoto])) ? `Ảnh: ${clean(r[cPhoto])}` : '']
        .filter(Boolean)
        .join('\n') || null,
      contact_future: contactRaw ? /^(y|yes|có|co)$/.test(contactRaw) : null,
      suitable_for: cSuitable >= 0 ? cleanMultiline(r[cSuitable]).split(/\n|,/).map(s => s.trim()).filter(Boolean) : [],
      invitations
    });
  }
  return { guests, brokenEncoding };
}
