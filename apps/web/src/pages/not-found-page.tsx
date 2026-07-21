import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
export function NotFoundPage():ReactElement{return <div className="py-20 text-center"><p className="text-sm font-bold text-teal-700">404</p><h1 className="mt-2 text-3xl font-bold">Página não encontrada</h1><Link className="mt-6 inline-block font-semibold text-teal-700 hover:underline" to="/">Voltar ao início</Link></div>;}
