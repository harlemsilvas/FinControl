import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren, ReactElement } from 'react';
import { queryClient } from '../state/query-client';
import { AuthProvider } from '../auth/auth-provider';
import { ToastProvider } from '../components/ui/toast';

export function AppProviders({children}:PropsWithChildren):ReactElement{return <QueryClientProvider client={queryClient}><ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider></QueryClientProvider>;}
