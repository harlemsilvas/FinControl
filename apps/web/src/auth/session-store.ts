export interface SessionUser { id:string;fullName:string;email:string;isMaster:boolean;roles:string[];permissions:string[] }
export interface Session { accessToken:string;refreshToken:string;user:SessionUser }
type Listener=()=>void;
const storageKey='fincontrol.refresh-token';
let current:Session|null=null;
const listeners=new Set<Listener>();

export const sessionStore={
  getSnapshot:():Session|null=>current,
  getRefreshToken:():string|null=>current?.refreshToken??sessionStorage.getItem(storageKey),
  set(session:Session):void{current=session;sessionStorage.setItem(storageKey,session.refreshToken);listeners.forEach(listener=>listener());},
  clear():void{current=null;sessionStorage.removeItem(storageKey);listeners.forEach(listener=>listener());},
  updateAccess(accessToken:string,refreshToken:string):void{if(current)this.set({...current,accessToken,refreshToken});},
  subscribe(listener:Listener):()=>void{listeners.add(listener);return()=>listeners.delete(listener);},
};
