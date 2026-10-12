'use client';

import { createContext, useContext } from 'react';

// '' khi chạy trên dienvienvn.com (middleware rewrite), '/dienvienvn' khi chạy chung domain với CRM.
const BasePathContext = createContext<string>('/dienvienvn');

export function BasePathProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <BasePathContext.Provider value={base}>{children}</BasePathContext.Provider>;
}

export function useDvvnHref() {
  const base = useContext(BasePathContext);
  return (path: string) => {
    const clean = path === '/' ? '' : path;
    return `${base}${clean}` || '/';
  };
}
