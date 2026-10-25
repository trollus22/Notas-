import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { signIn as twentySignIn, TwentyError } from '@/lib/twenty';
import { loadToken, saveToken } from '@/lib/twenty-session';

type Session = {
  /** undefined mientras se lee el token guardado; null si no hay sesión. */
  token: string | null | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Se llama cuando Twenty rechaza el token (caducado o revocado). */
  expire: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

export function TwentySessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void loadToken().then(setToken);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const t = await twentySignIn(email, password);
    await saveToken(t);
    setToken(t);
  }, []);

  const signOut = useCallback(async () => {
    await saveToken(null);
    setToken(null);
  }, []);

  const expire = useCallback(async () => {
    await saveToken(null);
    setToken(null);
  }, []);

  const value = useMemo(() => ({ token, signIn, signOut, expire }), [token, signIn, signOut, expire]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTwentySession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTwentySession fuera de TwentySessionProvider');
  return v;
}

/** Errores de Twenty que hay que mostrar tal cual (el 401 cierra la sesión). */
export function isUnauthorized(e: unknown) {
  return e instanceof TwentyError && e.status === 401;
}
