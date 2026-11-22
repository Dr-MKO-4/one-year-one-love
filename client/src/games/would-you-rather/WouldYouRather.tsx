import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Heart, MessageCircleHeart } from 'lucide-react';
import { PLAYERS, PLAYER_NAMES, otherPlayer, type Player, type WyrRound } from '@shared/types';
import { Avatar, HandOff, RoundProgress, SkipButton, WaitingFor, type GameProps } from '@/components/games/common';
import { HeartBurst } from '@/components/FloatingHearts';
import { Btn } from '@/components/ui';

function Options({ round, onPick, busy }: { round: WyrRound; onPick: (c: 'a' | 'b' | 'skip') => void; busy: boolean }) {
  return (
    <div>
      <p className="mb-4 text-center font-display text-xl font-bold text-wine-700">Tu préfères…</p>
      <div className="relative grid gap-4">
        {(['a', 'b'] as const).map((c, i) => (
          <motion.button
            key={c}
            disabled={busy}
            initial={{ opacity: 0, x: i ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPick(c)}
            className={`min-h-[110px] rounded-3xl p-6 text-left font-display text-xl font-bold shadow-soft ${
              c === 'a' ? 'bg-wine-gradient text-white' : 'bg-white text-wine-700'
            }`}
          >
            {c === 'a' ? round.a : round.b}
          </motion.button>
        ))}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
          transition={{ delay: 0.3, rotate: { repeat: Infinity, duration: 2.5 } }}
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream font-script text-2xl text-wine-600 shadow-glow"
        >
          ou
        </motion.span>
      </div>
      <SkipButton busy={busy} label="Je préfère ne pas répondre" onClick={() => onPick('skip')} />
    </div>
  );
}

export function WouldYouRather({ session, me, act, busy }: GameProps<'would-you-rather'>) {
  const { state } = session;
  const round = state.rounds[state.index];
  const [reason, setReason] = useState('');
  if (!round) return null;
  const shared = session.sharedDevice;

  if (!round.revealed) {
    if (shared) {
      const next = PLAYERS.find((p) => !round.choices[p])!;
      return (
        <div>
          <RoundProgress index={state.index} total={state.rounds.length} />
          <HandOff to={next} id={`${state.index}-${next}`}>
            <Options round={round} busy={busy} onPick={(c) => act('choose', { choice: c }, next)} />
          </HandOff>
        </div>
      );
    }
    const mine = round.choices[me];
    const other = otherPlayer(me);
    return (
      <div>
        <RoundProgress index={state.index} total={state.rounds.length} />
        {!mine ? (
          <Options round={round} busy={busy} onPick={(c) => act('choose', { choice: c })} />
        ) : (
          <div className="card p-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </motion.div>
            <p className="font-semibold text-wine-700">Ton choix est gardé secret.</p>
            {round.choices[other] ? (
              <p className="mt-2 text-sm text-ink/70">{PLAYER_NAMES[other]} a aussi choisi : révélation…</p>
            ) : (
              <WaitingFor player={other} text={`${PLAYER_NAMES[other]} choisit`} />
            )}
          </div>
        )}
      </div>
    );
  }

  const same = round.choices.miguel === round.choices.adele && round.choices.miguel !== 'skip';
  const label = (c?: string) => (c === 'a' ? round.a : c === 'b' ? round.b : 'A préféré passer');
  const reasonFor: Player | null = shared ? null : me;

  return (
    <div>
      <RoundProgress index={state.index} total={state.rounds.length} />
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-5 text-center">
        <HeartBurst show={same} />
        <p className="font-display text-3xl font-bold text-wine-700">{same ? 'Même choix !' : 'Choix différents'}</p>
        <p className="text-sm text-ink/70">{same ? '+10 points communs' : 'C’est aussi ça, la richesse d’un couple.'}</p>
      </motion.div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        {PLAYERS.map((p, i) => (
          <motion.div
            key={p}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 140 }}
            className={`card p-4 ${same ? 'ring-2 ring-blush-300' : ''}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar player={p} size={26} />
              <span className="text-xs font-bold text-wine-500">{PLAYER_NAMES[p]}</span>
            </div>
            <p className="font-display text-lg font-bold text-wine-700">{label(round.choices[p])}</p>
            {round.reasons[p] && (
              <p className="mt-2 flex gap-1 text-sm italic text-ink/70">
                <MessageCircleHeart className="h-4 w-4 shrink-0 text-wine-600" /> {round.reasons[p]}
              </p>
            )}
          </motion.div>
        ))}
      </div>
      {reasonFor && !round.reasons[reasonFor] && (
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim()) act('reason', { reason: reason.trim() }).then(() => setReason(''));
          }}
        >
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={280} className="input" placeholder="Pourquoi ce choix ? (facultatif)" />
          <Btn type="submit" className="btn-soft shrink-0 px-4" disabled={!reason.trim() || busy} aria-label="Envoyer">
            <Heart className="h-5 w-5" />
          </Btn>
        </form>
      )}
      <Btn className="btn-primary w-full" disabled={busy} onClick={() => act('next')}>
        {state.index + 1 >= state.rounds.length ? 'Voir les résultats' : 'Question suivante'} <ArrowRight className="h-5 w-5" />
      </Btn>
    </div>
  );
}
