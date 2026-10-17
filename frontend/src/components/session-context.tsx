'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/types';

const SessionContext = createContext<SessionUser | null>(null);

export const SessionProvider = SessionContext.Provider;

/** The verified user resolved by the role layout. */
export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession must be used inside a role layout');
  return user;
}
