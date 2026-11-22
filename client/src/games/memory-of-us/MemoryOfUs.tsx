import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarHeart, Heart, MapPin, Quote, Sparkles, Timer } from 'lucide-react';
import { PLAYER_NAMES, type MemoryCard, type MemorySide } from '@shared/types';
import { photoUrl } from '@/services/api';
import { Avatar, Countdown, TurnBanner, canActFor, type GameProps } from '@/components/games/common';

const ICONS = { date: CalendarHeart, place: MapPin, memory: Heart, text: Quote, photo: Heart };

function Face({ side }: { side: MemorySide }) {
  if (side.kind === 'photo') return <img src={photoUrl(side.value)} alt="" className="h-full w-full rounded-2xl object-cover" draggable={false} />;
  const Icon = ICONS[side.kind];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl bg-white p-2 text-center">
      <Icon className="h-5 w-5 shrink-0 text-blush-500" />
      <span className="line-clamp-4 text-[11px] font-bold leading-tight text-wine-700 sm:text-sm">{side.value}</span>
    </div>
  );
}

function Card({ card, faceUp, onClick, disabled, index }: { card: MemoryCard; faceUp: boolean; onClick: () => void; disabled: boolean; index: number }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      onClick={onClick}
      disabled={disabled}
      className="perspective aspect-[3/4] w-full"
      aria-label={faceUp && card.content ? card.content.value : 'Carte cachée'}
    >
      <motion.div className="preserve-3d relative h-full w-full" animate={{ rotateY: faceUp ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl bg-wine-gradient shadow-soft">
          <div className="absolute inset-1.5 rounded-xl border border-white/20" />
          <Heart className="h-7 w-7 fill-white/20 text-white/60" />
        </div>
        <div
          className={`backface-hidden absolute inset-0 rounded-2xl shadow-soft ${card.matched ? 'ring-4 ring-emerald-300' : 'ring-2 ring-blush-200'}`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          {card.content && <Face side={card.content} />}
          {card.matched && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
              <Heart className="h-3.5 w-3.5 fill-white text-white" />
            </motion.span>
          )}
        </div>
      </motion.div>
    </motion.button>
  );
}

function Elapsed({ startedAt, offset }: { startedAt: number; offset: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now + offset - startedAt) / 1000));
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <Timer className="h-4 w-4" /> {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

export function MemoryOfUs({ session, me, act, busy, clockOffset }: GameProps<'memory-of-us'>) {
  const { state } = session;
  const [showMiss, setShowMiss] = useState<number[]>([]);
  const [levelUp, setLevelUp] = useState(false);
  const lastLevel = useRef(state.level);
  const solo = session.mode === 'solo';
  const actor = solo ? session.players[0] : state.turn;
  const myTurn = canActFor(session, me, actor);

  // Les cartes d'une erreur restent visibles une seconde avant de se retourner.
  useEffect(() => {
    if (!state.lastMiss) return setShowMiss([]);
    setShowMiss(state.lastMiss.cards);
    const t = setTimeout(() => setShowMiss([]), 1000);
    return () => clearTimeout(t);
  }, [state.lastMiss?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.level !== lastLevel.current) {
      lastLevel.current = state.level;
      setLevelUp(true);
      const t = setTimeout(() => setLevelUp(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.level]);

  const cols = state.cards.length <= 8 ? 'grid-cols-3 sm:grid-cols-4' : state.cards.length <= 12 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6';
  const found = Object.values(state.pairsFound).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between text-sm font-semibold text-wine-600">
        <span className="chip">
          <Sparkles className="h-3.5 w-3.5" /> Niveau {state.level + 1} / {state.levels.length}
        </span>
        <span>
          {found} / {state.totalPairs} paires
        </span>
        {!state.timeLimitSec && <Elapsed startedAt={state.startedAt} offset={clockOffset} />}
      </div>
      {state.timeLimitSec && (
        <Countdown
          deadline={state.startedAt + state.timeLimitSec * 1000}
          totalSec={state.timeLimitSec}
          offset={clockOffset}
          onExpire={() => act('timeout', {}, actor)}
        />
      )}
      {!solo && <TurnBanner player={actor} me={me} shared={session.sharedDevice} />}

      <div className={`grid gap-2.5 sm:gap-3 ${cols}`}>
        {state.cards.map((c, i) => {
          const faceUp = c.matched || state.flipped.includes(c.id) || showMiss.includes(c.id);
          return (
            <Card
              key={c.id}
              index={i}
              card={c}
              faceUp={faceUp && !!c.content}
              disabled={!myTurn || busy || faceUp || showMiss.length > 0}
              onClick={() => act('flip', { cardId: c.id }, actor)}
            />
          );
        })}
      </div>

      {!solo && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {session.players.map((p) => (
            <div key={p} className={`card flex items-center gap-3 p-3 ${p === actor ? 'ring-2 ring-blush-300' : ''}`}>
              <Avatar player={p} size={32} active={p === actor} />
              <div className="text-xs">
                <p className="font-bold text-wine-700">{PLAYER_NAMES[p]}</p>
                <p className="text-ink/60">
                  {state.pairsFound[p] ?? 0} paires · {state.attempts[p] ?? 0} essais
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {levelUp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-cream/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 1.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="text-center">
              <p className="font-script text-4xl text-blush-500">Bravo !</p>
              <p className="font-display text-5xl font-bold text-wine-700">Niveau {state.level + 1}</p>
              <p className="mt-2 font-semibold text-wine-500">Plus de cartes, plus de souvenirs</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
