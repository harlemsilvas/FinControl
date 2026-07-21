import type { ButtonHTMLAttributes, ReactElement } from 'react';

type Variant='primary'|'secondary'|'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>{variant?:Variant}
const variants:Record<Variant,string>={primary:'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600',secondary:'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',danger:'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600'};
export function Button({variant='primary',className='',type='button',...props}:ButtonProps):ReactElement{return <button type={type} className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variants[variant]} ${className}`} {...props}/>;}
