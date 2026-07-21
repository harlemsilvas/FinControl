import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/http-client';

export const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:(count,error):boolean=>error instanceof ApiError&&error.status>=400&&error.status<500?false:count<2,refetchOnWindowFocus:false},mutations:{retry:false}}});
