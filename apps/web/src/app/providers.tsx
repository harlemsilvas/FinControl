import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren, ReactElement } from 'react';
import { queryClient } from '../state/query-client';
import { AuthProvider } from '../auth/auth-provider';

export function AppProviders({children}:PropsWithChildren):ReactElement{return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;}
