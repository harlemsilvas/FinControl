import type { PropsWithChildren, ReactElement } from 'react';
export function Card({children}:PropsWithChildren):ReactElement{return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</section>;}
