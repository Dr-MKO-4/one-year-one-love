import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Player } from '@shared/types';
import { api } from '@/services/api';
import { closeSocket } from '@/services/socket';

interface AuthCtx {
  player: Player | null;
  loading: boolean;
  login: (p: Player, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((r) => setPlayer(r.player))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
    const onExpired = () => {
      closeSocket();
      setPlayer(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (p: Player, pin: string) => {
    const r = await api.login(p, pin);
    closeSocket();
    setPlayer(r.player);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    closeSocket();
    setPlayer(null);
  }, []);

  return <Ctx.Provider value={{ player, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors AuthProvider');
  return c;
}

/** Joueur connecté (garanti dans les pages protégées). */
export function useMe(): Player {
  const { player } = useAuth();
  if (!player) throw new Error('Non connecté');
  return player;
}
