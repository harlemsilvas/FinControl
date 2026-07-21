import { useSyncExternalStore } from 'react';
import { sessionStore, type Session } from './session-store';

export function useSession():Session|null{return useSyncExternalStore(
  (listener)=>sessionStore.subscribe(listener),
  ()=>sessionStore.getSnapshot(),
  ()=>sessionStore.getSnapshot(),
);}
