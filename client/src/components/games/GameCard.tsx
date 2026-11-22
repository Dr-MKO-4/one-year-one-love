import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { GAMES, type GameId } from '@shared/types';
import { GAME_VISUALS } from '@/games/registry';
import { rise } from '../ui';

export function GameCard({ gameId, index, best }: { gameId: GameId; index: number; best?: number | null }) {
  const g = GAMES[gameId];
  const v = GAME_VISUALS[gameId];
  const Icon = v.icon;
  return (
    <motion.div variants={rise} whileHover={{ y: -6, rotate: index % 2 ? 0.8 : -0.8 }} whileTap={{ scale: 0.97 }}>
      <Link to={`/jeux/${gameId}`} className="group card relative flex h-full flex-col overflow-hidden p-5">
        <motion.div
          className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${v.gradient} opacity-15`}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 5 + index }}
        />
        <div className="relative flex items-start justify-between">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${v.gradient} text-white shadow-soft transition-transform group-hover:rotate-6`}>
            <Icon className="h-6 w-6" />
          </span>
          <span className="text-xs font-bold text-wine-400">0{index + 1}</span>
        </div>
        <h2 className="relative mt-4 text-xl font-bold">{g.title}</h2>
        <p className="relative mt-1 flex-1 text-sm text-ink/70">{g.tagline}</p>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="chip">{g.difficultyLabel}</span>
          {best !== undefined && best !== null && <span className="chip bg-gold-300/40 text-gold-500">Record {best}</span>}
          <ArrowRight className="ml-auto h-5 w-5 text-wine-500 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}
