import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, History, Play } from 'lucide-react';
import { GAMES, GAME_IDS, PLAYER_NAMES } from '@shared/types';
import { api, type Dashboard, type SessionSummary } from '@/services/api';
import { getSocket } from '@/services/socket';
import { GameCard } from '@/components/games/GameCard';
import { Avatar } from '@/components/games/common';
import { Page, SectionTitle, stagger } from '@/components/ui';

export function GamesHome() {
  const [ongoing, setOngoing] = useState<SessionSummary[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);

  const load = useCallback(() => {
    api.sessions({ status: 'in_progress', limit: 10 }).then(setOngoing).catch(() => undefined);
    api.dashboard().then(setDash).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    s.on('sessions:changed', load);
    return () => {
      s.off('sessions:changed', load);
    };
  }, [load]);

  return (
    <Page className="max-w-5xl">
      <SectionTitle kicker="Our Love Games" title="Jouons ensemble">
        Six jeux pour célébrer votre première année. Ici, la complicité compte plus que la compétition.
      </SectionTitle>

      <div className="-mt-2 mb-6 flex flex-wrap gap-2">
        <Link to="/jeux/historique" className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 bg-white px-4 py-2 text-sm font-semibold text-wine-800 hover:bg-blush-50">
          <History className="h-4 w-4" /> Historique et reprise
        </Link>
        <Link to="/jeux/tableau-de-bord" className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 bg-white px-4 py-2 text-sm font-semibold text-wine-800 hover:bg-blush-50">
          <BarChart3 className="h-4 w-4" /> Nos scores
        </Link>
      </div>

      {ongoing.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Parties en cours</h2>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {ongoing.map((s) => (
              <Link key={s.id} to={`/partie/${s.id}`} className="card flex min-w-[240px] snap-start items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine-600 text-white">
                  <Play className="h-4 w-4 translate-x-0.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-wine-700">{GAMES[s.gameId].title}</p>
                  <p className="flex items-center gap-1 text-xs text-ink/60">
                    {s.players.map((p) => (
                      <Avatar key={p} player={p} size={16} />
                    ))}
                    <span className="ml-1">lancée par {PLAYER_NAMES[s.createdBy]}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_IDS.map((id) => (
          <GameCard key={id} gameId={id} best={dash?.perGame.find((g) => g.gameId === id)?.best} />
        ))}
      </motion.section>

    </Page>
  );
}
