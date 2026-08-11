import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { BackupsPage } from './backups-page';

vi.mock('../api/http-client',()=>({httpClient:{get:vi.fn(()=>Promise.resolve({data:{data:[{name:'fincontrol_20260801T150000Z_release_web.dump',sizeBytes:2048,createdAt:'2026-08-01T15:00:00.000Z',checksum:'abc123',metadata:null}]}})),post:vi.fn(()=>Promise.resolve({data:{}}))},ApiError:class ApiError extends Error{}}));

describe('BackupsPage',()=>{
  it('lists generated database backups',async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><BackupsPage/></QueryClientProvider>);
    expect(await screen.findByRole('heading',{name:'Backups do banco'})).toBeInTheDocument();
    expect(await screen.findByText('fincontrol_20260801T150000Z_release_web.dump')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'+ Gerar backup agora'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Exportar'})).toBeInTheDocument();
  });
});
