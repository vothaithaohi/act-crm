'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Dict, LANG_COOKIE, Lang, makeTranslator, switchLangPath } from '@/lib/dienvienvn/i18n/core';

// Ngôn ngữ trang (vi / en) + hàm dịch. Ngoài DienVienVN (CRM) không có provider → luôn tiếng Việt.
const LangContext = createContext<{ lang: Lang; tr: (s: string) => string }>({ lang: 'vi', tr: s => s });

export function LangProvider({ lang, dict, children }: { lang: Lang; dict: Dict | null; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, tr: makeTranslator(lang === 'en' ? dict : null) }), [lang, dict]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;

/** tx(x): chữ tiếng Việt → bản dịch theo ngôn ngữ trang; giá trị không phải chữ giữ nguyên. */
export function useTx() {
  const { tr } = useContext(LangContext);
  return useMemo(() => <T,>(v: T): T => (typeof v === 'string' ? (tr(v) as unknown as T) : v), [tr]);
}

/** Nút đổi ngôn ngữ VI | EN: chuyển đúng trang đang xem, nhớ lựa chọn. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  const go = (to: Lang) => {
    if (to === lang) return;
    try {
      document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* bỏ qua */
    }
    const { pathname, search, hash } = window.location;
    window.location.assign(switchLangPath(pathname, to) + search + hash);
  };
  const btn = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => go(l)}
      aria-pressed={lang === l}
      aria-label={l === 'en' ? 'English' : 'Tiếng Việt'}
      className={`px-1.5 py-0.5 rounded-md text-[13px] transition-colors ${lang === l ? 'font-semibold text-black' : 'text-black/50 hover:text-black'}`}
    >
      {label}
    </button>
  );
  return (
    <span className={`inline-flex items-center ${className}`} role="group" aria-label="Language">
      {btn('vi', 'VI')}
      <span className="text-black/25">|</span>
      {btn('en', 'EN')}
    </span>
  );
}
