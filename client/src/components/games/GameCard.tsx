import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { GAMES, MODE_LABELS, type GameId } from '@shared/types';
import { GAME_VISUALS } from '@/games/registry';
import { rise } from '../ui';

export function GameCard({ gameId, best }: { gameId: GameId; index?: number; best?: number | null }) {
  const g = GAMES[gameId];
  const v = GAME_VISUALS[gameId];
  const Icon = v.icon;
  return (
    <motion.div variants={rise}>
      <Link to={`/jeux/${gameId}`} className="group card flex h-full flex-col p-5 transition-shadow hover:shadow-soft">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${v.gradient} text-white`}>
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-bold">{g.title}</h2>
        </div>
        <p className="mt-3 flex-1 text-sm text-ink/80">{g.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-wine-800">
          <span>{g.modes.map((m) => MODE_LABELS[m]).join(' ou ')}</span>
          {best !== undefined && best !== null && <span className="rounded-full bg-gold-300/40 px-2 py-0.5 text-gold-700">Record {best}</span>}
          <ArrowRight className="ml-auto h-5 w-5 text-wine-600 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}
