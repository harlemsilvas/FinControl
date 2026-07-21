import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

export function ProtectedRoute():ReactElement{const {session,initializing}=useAuth();const location=useLocation();if(initializing)return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-700" aria-label="Carregando sessão"/></div>;if(!session)return <Navigate to="/login" replace state={{from:location.pathname}}/>;return <Outlet/>;}
