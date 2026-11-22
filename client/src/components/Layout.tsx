import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Gamepad2, Heart, Home, LogOut, Milestone, Settings } from 'lucide-react';
import { PLAYER_NAMES, otherPlayer, type Player } from '@shared/types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { getSocket } from '@/services/socket';
import { FloatingHearts } from './FloatingHearts';
import { MusicPlayer } from './MusicPlayer';

const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/frise', label: 'Frise', icon: Milestone },
  { to: '/jeux', label: 'Jeux', icon: Gamepad2 },
  { to: '/jeux/tableau-de-bord', label: 'Scores', icon: BarChart3 },
  { to: '/configuration', label: 'Config', icon: Settings },
];

/** Présence en temps réel du partenaire. */
export function usePartnerOnline(me: Player) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const s = getSocket();
    const ask = () => s.emit('presence:who', (r: { online: Player[] }) => setOnline(r.online.includes(otherPlayer(me))));
    const onPresence = (p: { player: Player; online: boolean }) => p.player !== me && setOnline(p.online);
    s.on('connect', ask);
    s.on('presence', onPresence);
    if (s.connected) ask();
    return () => {
      s.off('connect', ask);
      s.off('presence', onPresence);
    };
  }, [me]);
  return online;
}

export function Layout({ children, me }: { children: ReactNode; me: Player }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const partnerOnline = usePartnerOnline(me);
  const inGame = useLocation().pathname.startsWith('/partie');

  // Invitations en direct : « Miguel t'invite à jouer à… ».
  useEffect(() => {
    const s = getSocket();
    const onInvite = (inv: { id: string; message: string }) =>
      toast(inv.message, 'love', { label: 'Rejoindre', onClick: () => navigate(`/partie/${inv.id}`) });
    s.on('session:invite', onInvite);
    return () => {
      s.off('session:invite', onInvite);
    };
  }, [toast, navigate]);

  return (
    <div className="relative min-h-[100dvh]">
      <FloatingHearts />
      <header className="sticky top-0 z-30 border-b border-white/50 bg-cream/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 animate-heartbeat fill-blush-400 text-blush-400" />
            <span className="font-display text-lg font-bold text-wine-700">One Year, One Love</span>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `relative rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'text-white' : 'text-wine-700 hover:bg-blush-50'}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-wine-gradient" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-wine-700" title={partnerOnline ? 'En ligne' : 'Hors ligne'}>
              <span className="relative flex h-2.5 w-2.5">
                {partnerOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${partnerOnline ? 'bg-emerald-500' : 'bg-ink/20'}`} />
              </span>
              {PLAYER_NAMES[otherPlayer(me)]}
            </div>
            <button onClick={logout} className="rounded-full p-2 text-wine-600 hover:bg-blush-50" aria-label="Se déconnecter" title={`Connecté : ${PLAYER_NAMES[me]}`}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {children}

      <MusicPlayer hidePill={inGame} />

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/85 backdrop-blur-lg md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-dot" className="absolute top-0 h-1 w-8 rounded-b-full bg-wine-gradient" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                  <motion.span animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}>
                    <n.icon className={`h-6 w-6 ${isActive ? 'text-wine-600' : 'text-ink/40'}`} />
                  </motion.span>
                  <span className={isActive ? 'text-wine-700' : 'text-ink/50'}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
