import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { BrevoContact, brevoProcessStatus, ensureActorAttributes, ensureProjectList, importBrevoContacts, importProjectList } from '@/lib/dienvienvn/brevo';
import { loadActorBrevoContacts } from '@/lib/dienvienvn/brevo-actor';
import { isTestAccount } from '@/lib/dienvienvn/test-accounts';

// Super Admin: đưa toàn bộ email đã đăng ký (diễn viên, NSX, ekip — kể cả tài khoản ekip chưa điền hồ sơ) sang 3 danh sách Brevo.
// Không gồm nhân sự CRM, bỏ tài khoản test. Email trùng chỉ tính 1 lần (hồ sơ ekip đứng trước nên giữ được SĐT / tên trong hồ sơ).
type Row = Record<string, string | null>;

// Đọc toàn bộ dữ liệu + gửi Brevo có thể lâu (vài nghìn hồ sơ)
export const maxDuration = 300;

async function all(q: () => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<Row[]> {
  const { data } = await q();
  return (data || []) as Row[];
}

export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ['super_admin']);
  if ('res' in g) return g.res;
  const db = g.db;
  const pageAll = async (table: string, cols: string): Promise<Row[]> => {
    const out: Row[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const rows = await all(() => db.from(table).select(cols).range(from, from + 999));
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  };
  const notTest = (c: BrevoContact) => !!c.email && !/\+dvvn-test-/i.test(c.email) && !isTestAccount({ full_name: c.name, email: c.email });
  const [{ contacts: actorContacts, groups }, partners, crews] = await Promise.all([
    loadActorBrevoContacts(db),
    pageAll('partner_accounts', 'email, full_name, phone'),
    pageAll('crew_profiles', 'public_email, full_name, public_phone')
  ]);
  // Diễn viên kèm trường lọc (giới tính, đã học ACT, dự án / vai đã ứng tuyển…)
  const actor = actorContacts.filter(notTest);
  await ensureActorAttributes();
  const partner = partners.map(p => ({ email: p.email || '', name: p.full_name, phone: p.phone })).filter(notTest);
  const crew = crews.map(c => ({ email: c.public_email || '', name: c.full_name, phone: c.public_phone })).filter(notTest);
  // Tài khoản ekip đã đăng ký nhưng chưa điền hồ sơ ekip (chỉ có tài khoản đăng nhập)
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.user_metadata?.kind !== 'dienvienvn_crew' || !u.email) continue;
      const c = { email: u.email, name: (u.user_metadata?.full_name as string | undefined) || null, phone: null };
      if (notTest(c)) crew.push(c);
    }
    if (data.users.length < 1000) break;
  }
  const [a, p, c] = [await importBrevoContacts('actor', actor), await importBrevoContacts('partner', partner), await importBrevoContacts('crew', crew)];
  // Danh sách riêng từng dự án: "Ứng tuyển DV-10 – Dragon Back (HCM)"
  const projectIds: number[] = [];
  let projectLists = 0;
  const listErrors: string[] = [];
  for (const gr of groups) {
    const lid = await ensureProjectList(gr.code, gr.title);
    if (!lid) {
      listErrors.push(`Chưa tạo được danh sách Brevo cho ${gr.code}.`);
      continue;
    }
    const r = await importProjectList(lid, gr.emails);
    if (!r.ok) listErrors.push(`${gr.code}: ${r.error}`);
    else {
      projectLists++;
      if (r.processId) projectIds.push(r.processId);
    }
  }
  const errors = [a.error, p.error, c.error, ...listErrors].filter(Boolean);
  // Số diễn viên có ít nhất 1 dự án đã ứng tuyển (để đối chiếu với bộ lọc DU_AN_UNG_TUYEN trên Brevo)
  const withProjects = actor.filter(x => x.extra?.DU_AN_UNG_TUYEN).length;
  const processIds = [...(a.processIds || []), ...(p.processIds || []), ...(c.processIds || []), ...projectIds];
  return NextResponse.json(
    { ok: !errors.length, actor: a.count, partner: p.count, crew: c.count, withProjects, projectLists, processIds, errors },
    { status: errors.length ? 207 : 200 }
  );
}

/** ?ids=1,2 : Brevo đã nhập xong các lượt nhập chưa. */
export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ['super_admin']);
  if ('res' in g) return g.res;
  const ids = (req.nextUrl.searchParams.get('ids') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  return NextResponse.json({ processes: await brevoProcessStatus(ids) }, { headers: { 'Cache-Control': 'no-store' } });
}
