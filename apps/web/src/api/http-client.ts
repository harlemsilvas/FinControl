import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { sessionStore } from '../auth/session-store';
import { environment } from '../config/environment';

export interface ApiErrorBody { error:{code:string;message:string;requestId:string;details?:unknown} }
export class ApiError extends Error { constructor(readonly status:number,readonly code:string,message:string,readonly requestId?:string,readonly details?:unknown){super(message);this.name='ApiError';} }
export const httpClient=axios.create({baseURL:environment.VITE_API_URL,timeout:15000,headers:{Accept:'application/json'}});
httpClient.interceptors.request.use((config)=>{
  const token=sessionStore.getSnapshot()?.accessToken;
  if(token)config.headers.Authorization=`Bearer ${token}`;
  return config;
});
interface RetryConfig extends InternalAxiosRequestConfig { _retry?:boolean }
let refreshing:Promise<void>|null=null;
async function renewSession():Promise<void>{const token=sessionStore.getRefreshToken();if(!token)throw new Error('Refresh token ausente');const response=await axios.post<SessionResponse>(`${environment.VITE_API_URL.replace(/\/$/,'')}/auth/refresh`,{refreshToken:token});sessionStore.set(response.data);}
interface SessionResponse {accessToken:string;refreshToken:string;user:{id:string;fullName:string;email:string;isMaster:boolean;roles:string[];permissions:string[];companies?:{id:string;legalName:string;tradeName:string|null;documentNumber:string;companyType:'MAIN'|'BRANCH';isDefault:boolean;accessScope:'OPERATIONAL'|'VIEW_ONLY'}[];defaultCompanyId?:string|null}}
httpClient.interceptors.response.use(response=>response,async(error:AxiosError<ApiErrorBody>)=>{
  const config=error.config as RetryConfig|undefined;
  if(error.response?.status===401&&config&&!config._retry&&Boolean(config.headers.Authorization)&&sessionStore.getRefreshToken()){
    config._retry=true;refreshing??=renewSession().finally(()=>{refreshing=null;});
    try{await refreshing;return await httpClient.request(config);}catch{sessionStore.clear();}
  }
  const body=error.response?.data;if(body?.error)throw new ApiError(error.response?.status??0,body.error.code,body.error.message,body.error.requestId,body.error.details);throw new ApiError(error.response?.status??0,'NETWORK_ERROR','Não foi possível comunicar com a API.');
});
