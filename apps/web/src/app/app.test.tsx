import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { AppShell } from '../layouts/app-shell';
import { FoundationPage } from '../pages/foundation-page';

describe('authenticated application shell',()=>{
  it('renders the operational menu for an authenticated user',()=>{const session={accessToken:'access',refreshToken:'refresh',user:{id:'1',fullName:'Operador',email:'user@example.com',isMaster:true,roles:['MASTER'],permissions:[]}};render(<AuthContext.Provider value={{session,initializing:false,signIn:vi.fn(),signOut:vi.fn()}}><MemoryRouter><Routes><Route path="/" element={<AppShell/>}><Route index element={<FoundationPage/>}/></Route></Routes></MemoryRouter></AuthContext.Provider>);expect(screen.getByRole('heading',{name:'Cadastros financeiros'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Fornecedores'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Sair'})).toBeInTheDocument();});
});
