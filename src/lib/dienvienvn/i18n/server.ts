import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import { Dict, LANG_COOKIE, LANG_HEADER, Lang, makeTranslator } from './core';
import EN from './en.json';

/** Ngôn ngữ của request: trang (middleware gắn header khi vào /en); API / email: theo cookie ngôn ngữ người dùng đang xem. */
export async function getLang(): Promise<Lang> {
  const h = await headers();
  const fromPage = h.get(LANG_HEADER);
  if (fromPage) return fromPage === 'en' ? 'en' : 'vi';
  return (await cookies()).get(LANG_COOKIE)?.value === 'en' ? 'en' : 'vi';
}

export const dictFor = (lang: Lang): Dict | null => (lang === 'en' ? (EN as Dict) : null);

let enTr: ((s: string) => string) | null = null;
/** Hàm dịch phía máy chủ. */
export async function serverTr(): Promise<(s: string) => string> {
  const lang = await getLang();
  if (lang !== 'en') return s => s;
  return (enTr ||= makeTranslator(EN as Dict));
}

/** Dịch tiêu đề / mô tả của metadata (tab trình duyệt, Google, ảnh xem trước). */
export async function localizeMetadata(meta: Metadata): Promise<Metadata> {
  if ((await getLang()) !== 'en') return meta;
  const tr = await serverTr();
  const t = (v: unknown) => (typeof v === 'string' ? tr(v) : v);
  const out: Metadata = { ...meta };
  if (typeof meta.title === 'string') out.title = tr(meta.title);
  if (meta.description) out.description = tr(meta.description);
  // Địa chỉ chính (canonical) của bản tiếng Anh là /en/... để Google lập chỉ mục cả 2 bản
  const toEn = (u: string) => u.replace(/^(https?:\/\/[^/]+)(\/|$)/, (_m, host) => `${host}/en/`).replace(/\/en\/$/, '/en');
  if (meta.alternates && typeof meta.alternates.canonical === 'string') {
    const vi = meta.alternates.canonical;
    out.alternates = { ...meta.alternates, canonical: toEn(vi), languages: { vi, en: toEn(vi) } };
  }
  if (meta.openGraph) {
    const og = { ...meta.openGraph, title: t(meta.openGraph.title) as string, description: t(meta.openGraph.description) as string } as Record<string, unknown>;
    if (og.locale) og.locale = 'en_US';
    if (typeof og.url === 'string') og.url = toEn(og.url);
    out.openGraph = og as Metadata['openGraph'];
  }
  if (meta.twitter) out.twitter = { ...meta.twitter, title: t(meta.twitter.title) as string, description: t(meta.twitter.description) as string };
  return out;
}
