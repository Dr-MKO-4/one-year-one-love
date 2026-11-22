import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Gamepad2, Heart, Home, LogOut, Milestone, Settings } from 'lucide-react';
import { PLAYER_NAMES, otherPlayer, type Player } from '@shared/types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { getSocket } from '@/services/socket';
import { FloatingHearts } from './FloatingHearts';
import { HeaderMusic, MobileMusicBar, MusicSheet } from './MusicPlayer';

type Section = 'accueil' | 'frise' | 'jeux' | 'scores' | 'config';

const NAV: Array<{ id: Section; to: string; label: string; icon: typeof Home }> = [
  { id: 'accueil', to: '/', label: 'Accueil', icon: Home },
  { id: 'frise', to: '/frise', label: 'Frise', icon: Milestone },
  { id: 'jeux', to: '/jeux', label: 'Jeux', icon: Gamepad2 },
  { id: 'scores', to: '/jeux/tableau-de-bord', label: 'Scores', icon: BarChart3 },
  { id: 'config', to: '/configuration', label: 'Config', icon: Settings },
];

/** Une seule section active à la fois (le tableau de bord n'active pas « Jeux »). */
function sectionOf(path: string): Section {
  if (path.startsWith('/jeux/tableau-de-bord') || path.startsWith('/jeux/historique')) return 'scores';
  if (path.startsWith('/jeux') || path.startsWith('/partie')) return 'jeux';
  if (path.startsWith('/frise')) return 'frise';
  if (path.startsWith('/configuration')) return 'config';
  return 'accueil';
}

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
  const path = useLocation().pathname;
  const partner = otherPlayer(me);
  const partnerOnline = usePartnerOnline(me);
  const active = sectionOf(path);
  const inGame = path.startsWith('/partie');
  // Écrans de lecture, de jeu et de gestion : fond calme, sans décor animé.
  const calm = inGame || path.startsWith('/configuration') || path.startsWith('/jeux/');

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
      {!calm && <FloatingHearts />}
      <header className="sticky top-0 z-30 border-b border-blush-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Heart className="h-5 w-5 shrink-0 fill-wine-500 text-wine-500" />
            <span className="truncate font-display text-base font-bold text-wine-800 sm:text-lg">
              <span className="min-[360px]:hidden">One Love</span>
              <span className="hidden min-[360px]:inline">One Year, One Love</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {NAV.map((n) => {
              const isActive = n.id === active;
              return (
                <Link
                  key={n.id}
                  to={n.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'text-white' : 'text-wine-800 hover:bg-blush-50'}`}
                >
                  {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-wine-600" transition={{ duration: 0.2 }} />}
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {!inGame && (
              <div className="hidden md:block">
                <HeaderMusic />
              </div>
            )}
            <span
              className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-wine-800"
              title={`${PLAYER_NAMES[partner]} est ${partnerOnline ? 'en ligne' : 'hors ligne'}`}
            >
              <span className={`h-2 w-2 rounded-full ${partnerOnline ? 'bg-emerald-600' : 'bg-ink/30'}`} aria-hidden />
              {PLAYER_NAMES[partner]}
              <span className={`sr-only min-[400px]:not-sr-only ${partnerOnline ? 'text-emerald-800' : 'text-ink/65'}`}>{partnerOnline ? 'en ligne' : 'hors ligne'}</span>
            </span>
            <button
              onClick={logout}
              className="rounded-full p-2 text-wine-700 hover:bg-blush-50"
              aria-label={`Se déconnecter (${PLAYER_NAMES[me]})`}
              title={`Connecté en tant que ${PLAYER_NAMES[me]} · se déconnecter`}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {children}

      <MusicSheet />

      {/* Bloc mobile : lecteur (zone réservée) + navigation, même point de rupture. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-blush-100 bg-white/95 backdrop-blur md:hidden">
        {!inGame && <MobileMusicBar />}
        <nav className="mx-auto grid max-w-md grid-cols-5" aria-label="Navigation principale">
          {NAV.map((n) => {
            const isActive = n.id === active;
            return (
              <Link key={n.id} to={n.to} aria-current={isActive ? 'page' : undefined} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold">
                {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-wine-600" />}
                <n.icon className={`h-6 w-6 ${isActive ? 'text-wine-700' : 'text-ink/55'}`} />
                <span className={isActive ? 'text-wine-800' : 'text-ink/65'}>{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
