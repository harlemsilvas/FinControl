import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { LoginPage } from './login-page';

describe('LoginPage',()=>{
  it('validates credentials before calling the API',async()=>{const signIn=vi.fn();render(<AuthContext.Provider value={{session:null,initializing:false,signIn,signOut:vi.fn()}}><MemoryRouter><LoginPage/></MemoryRouter></AuthContext.Provider>);fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'user@example.com'}});fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'123'}});fireEvent.click(screen.getByRole('button',{name:'Entrar'}));expect(await screen.findByText('A senha deve possuir pelo menos 8 caracteres.')).toBeInTheDocument();expect(signIn).not.toHaveBeenCalled();});
});
