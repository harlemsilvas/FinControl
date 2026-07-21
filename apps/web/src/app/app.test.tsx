import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { AppShell } from '../layouts/app-shell';
import { FoundationPage } from '../pages/foundation-page';

vi.mock('../api/http-client',()=>({httpClient:{get:vi.fn((url:string)=>Promise.resolve(url.includes('dashboard')?{data:{summary:{totalPayable:'0',overdue:'0',upcoming:'0',paid:'0'},dueSeries:[],categories:[],upcoming:[]}}:{data:{data:[]}}))}}));

describe('authenticated application shell',()=>{
  it('renders the operational menu for an authenticated user',()=>{const session={accessToken:'access',refreshToken:'refresh',user:{id:'1',fullName:'Operador',email:'user@example.com',isMaster:true,roles:['MASTER'],permissions:[]}};const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><AuthContext.Provider value={{session,initializing:false,signIn:vi.fn(),signOut:vi.fn()}}><MemoryRouter><Routes><Route path="/" element={<AppShell/>}><Route index element={<FoundationPage/>}/></Route></Routes></MemoryRouter></AuthContext.Provider></QueryClientProvider>);expect(screen.getByRole('heading',{name:'Visão geral'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Fornecedores'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Agenda'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Sair'})).toBeInTheDocument();});
});
