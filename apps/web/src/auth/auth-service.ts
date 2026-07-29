import { httpClient } from '../api/http-client';
import type { Session } from './session-store';

interface TokenResponse extends Session { tokenType:string;expiresIn:number }
export async function login(email:string,password:string):Promise<Session>{const response=await httpClient.post<TokenResponse>('/auth/login',{email,password});return response.data;}
export async function refresh(refreshToken:string):Promise<Session>{const response=await httpClient.post<TokenResponse>('/auth/refresh',{refreshToken});return response.data;}
export async function logout():Promise<void>{await httpClient.post('/auth/logout');}
export async function requestPasswordReset(email:string):Promise<{message:string}>{const response=await httpClient.post<{message:string}>('/auth/password/forgot',{email});return response.data;}
export async function resetPassword(token:string,password:string):Promise<{message:string}>{const response=await httpClient.post<{message:string}>('/auth/password/reset',{token,password});return response.data;}
