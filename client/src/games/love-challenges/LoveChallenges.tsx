import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Brain, Heart, Laugh, Palette, Play, Users } from 'lucide-react';
import { CHALLENGE_CATEGORY_LABELS, PLAYERS, PLAYER_NAMES, otherPlayer, type ChallengeCategory } from '@shared/types';
import {
  Avatar,
  Countdown,
  QuestionCard,
  ResultBadge,
  RoundProgress,
  SkipButton,
  VerdictButtons,
  WaitingFor,
  canActFor,
  type GameProps,
} from '@/components/games/common';
import { Btn } from '@/components/ui';

const CAT: Record<ChallengeCategory, { icon: typeof Heart; cls: string }> = {
  romantic: { icon: Heart, cls: 'from-blush-400 to-wine-500' },
  fun: { icon: Laugh, cls: 'from-gold-300 to-gold-500' },
  memory: { icon: Brain, cls: 'from-wine-500 to-wine-800' },
  creative: { icon: Palette, cls: 'from-blush-300 to-blush-500' },
  together: { icon: Users, cls: 'from-wine-600 to-blush-400' },
};

export function LoveChallenges({ session, me, act, busy, clockOffset }: GameProps<'love-challenges'>) {
  const { state } = session;
  const round = state.rounds[state.index];
  const prev = state.rounds[state.index - 1];
  if (!round) return null;
  const cat = CAT[round.category];
  const Icon = cat.icon;
  const validators = round.player ? [otherPlayer(round.player)] : PLAYERS;
  const iCanValidate = session.sharedDevice || validators.includes(me);
  const validatorAs = round.player ? otherPlayer(round.player) : me;

  return (
    <div>
      <RoundProgress index={state.index} total={state.rounds.length} />
      <AnimatePresence>
        {prev?.result && (
          <motion.div key={state.index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 flex justify-center">
            <ResultBadge result={prev.result} />
          </motion.div>
        )}
      </AnimatePresence>

      <QuestionCard
        k={state.index}
        kicker={
          <div className="flex flex-wrap items-center gap-2">
            <motion.span
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.cls} text-white shadow-soft`}
            >
              <Icon className="h-5 w-5" />
            </motion.span>
            <span className="chip">{CHALLENGE_CATEGORY_LABELS[round.category]}</span>
            <span className="chip bg-gold-300/40 text-gold-500">{round.points} pts</span>
          </div>
        }
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-wine-500">
          {round.player ? (
            <>
              <Avatar player={round.player} size={24} /> Défi pour {PLAYER_NAMES[round.player]}
            </>
          ) : (
            <>
              <Users className="h-5 w-5" /> Défi à deux
            </>
          )}
        </div>
        <p className="font-display text-2xl font-bold leading-snug text-wine-700">{round.text}</p>
        {round.forbiddenWords?.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Ban className="h-4 w-4 text-wine-500" />
            {round.forbiddenWords.map((w) => (
              <span key={w} className="rounded-full bg-wine-700 px-3 py-1 text-xs font-bold text-white line-through decoration-blush-300">
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </QuestionCard>

      {round.durationSec && (
        <div className="mb-5">
          {round.timerStartedAt ? (
            <Countdown key={round.timerStartedAt} deadline={round.timerStartedAt + round.durationSec * 1000} totalSec={round.durationSec} offset={clockOffset} />
          ) : (
            <Btn className="btn-soft w-full" disabled={busy} onClick={() => act('startTimer')}>
              <Play className="h-5 w-5" /> Lancer le chrono ({round.durationSec >= 60 ? `${Math.round(round.durationSec / 60)} min` : `${round.durationSec} s`})
            </Btn>
          )}
        </div>
      )}

      {iCanValidate ? (
        <>
          <p className="mb-3 text-center text-sm font-semibold text-wine-700">
            {round.player ? `${PLAYER_NAMES[otherPlayer(round.player)]}, le défi est-il relevé ?` : 'Défi relevé ?'}
          </p>
          <VerdictButtons
            busy={busy}
            options={[
              { value: 'done', label: 'Réussi', tone: 'good' },
              ...(round.allowPartial ? [{ value: 'partial', label: 'En partie', tone: 'mid' as const }] : []),
              { value: 'failed', label: 'Pas cette fois', tone: 'bad' },
            ]}
            onPick={(v) => act('validate', { result: v }, validatorAs)}
          />
        </>
      ) : (
        <WaitingFor player={validators[0]} text={`À toi de jouer ! ${PLAYER_NAMES[validators[0]]} validera ton défi`} />
      )}
      <SkipButton busy={busy} label="Passer ce défi" onClick={() => act('skip')} />
    </div>
  );
}
