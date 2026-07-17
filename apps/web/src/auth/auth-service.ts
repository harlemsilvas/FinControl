import { httpClient } from '../api/http-client';
import type { Session } from './session-store';

interface TokenResponse extends Session { tokenType:string;expiresIn:number }
export async function login(email:string,password:string):Promise<Session>{const response=await httpClient.post<TokenResponse>('/auth/login',{email,password});return response.data;}
export async function refresh(refreshToken:string):Promise<Session>{const response=await httpClient.post<TokenResponse>('/auth/refresh',{refreshToken});return response.data;}
export async function logout():Promise<void>{await httpClient.post('/auth/logout');}
