import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { BrevoContact, importBrevoContacts } from '@/lib/dienvienvn/brevo';
import { isTestAccount } from '@/lib/dienvienvn/test-accounts';

// Super Admin: đưa toàn bộ email đã đăng ký (diễn viên, NSX, ekip) sang 3 danh sách Brevo. Bỏ tài khoản test.
type Row = Record<string, string | null>;

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
  const [talents, partners, crews] = await Promise.all([
    pageAll('talent_profiles', 'email, full_name, phone'),
    pageAll('partner_accounts', 'email, full_name, phone'),
    pageAll('crew_profiles', 'public_email, full_name, public_phone')
  ]);
  const actor = talents.map(t => ({ email: t.email || '', name: t.full_name, phone: t.phone })).filter(notTest);
  const partner = partners.map(p => ({ email: p.email || '', name: p.full_name, phone: p.phone })).filter(notTest);
  const crew = crews.map(c => ({ email: c.public_email || '', name: c.full_name, phone: c.public_phone })).filter(notTest);
  const [a, p, c] = [await importBrevoContacts('actor', actor), await importBrevoContacts('partner', partner), await importBrevoContacts('crew', crew)];
  const errors = [a.error, p.error, c.error].filter(Boolean);
  return NextResponse.json({ ok: !errors.length, actor: a.count, partner: p.count, crew: c.count, errors }, { status: errors.length ? 207 : 200 });
}
