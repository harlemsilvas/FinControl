import { createContext, useContext } from 'react';
import type { Session } from './session-store';

export interface AuthContextValue {
  session:Session|null;
  initializing:boolean;
  signIn(email:string,password:string):Promise<void>;
  signOut():Promise<void>;
}
export const AuthContext=createContext<AuthContextValue|null>(null);
export function useAuth():AuthContextValue{const value=useContext(AuthContext);if(!value)throw new Error('useAuth deve ser usado dentro de AuthProvider');return value;}
