import { useEffect, useMemo, useState, type PropsWithChildren, type ReactElement } from 'react';
import * as authService from './auth-service';
import { sessionStore } from './session-store';
import { useSession } from './use-session';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({children}:PropsWithChildren):ReactElement{
  const session=useSession();const [initializing,setInitializing]=useState(true);
  useEffect(()=>{let active=true;if(sessionStore.getSnapshot()){setInitializing(false);return;}const token=sessionStore.getRefreshToken();if(!token){setInitializing(false);return;}
    void authService.refresh(token).then((next):void=>{if(active)sessionStore.set(next);}).catch(():void=>sessionStore.clear()).finally(():void=>{if(active)setInitializing(false);});return():void=>{active=false;};},[]);
  const value=useMemo<AuthContextValue>(()=>({session,initializing,async signIn(email,password):Promise<void>{sessionStore.set(await authService.login(email,password));},async signOut():Promise<void>{try{await authService.logout();}finally{sessionStore.clear();}}}),[session,initializing]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
