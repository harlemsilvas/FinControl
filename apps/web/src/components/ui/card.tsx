import type { PropsWithChildren, ReactElement } from 'react';
export function Card({children,className=''}:PropsWithChildren<{className?:string}>):ReactElement{return <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</section>;}
