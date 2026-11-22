import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookmarkPlus, Check, X } from 'lucide-react';
import { PLAYER_NAMES, otherPlayer } from '@shared/types';
import {
  AnswerInput,
  Avatar,
  Countdown,
  QuestionCard,
  ResultBadge,
  RoundProgress,
  SkipButton,
  TurnBanner,
  VerdictButtons,
  WaitingFor,
  canActFor,
  type GameProps,
} from '@/components/games/common';
import { HeartBurst } from '@/components/FloatingHearts';
import { Btn } from '@/components/ui';
import { normalizeLite } from '@/lib/text';

export function DoYouRemember({ session, me, act, busy, clockOffset }: GameProps<'do-you-remember'>) {
  const { state } = session;
  const round = state.rounds[state.index];
  const prev = state.rounds[state.index - 1];
  const [ref, setRef] = useState('');
  if (!round) return null;
  const validator = otherPlayer(round.player);
  const shared = session.sharedDevice;

  const card = (
    <QuestionCard
      k={state.index}
      kicker={
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-wine-500">
          {round.kind === 'mcq' ? 'Choix multiple' : 'Réponse libre'} · {round.points} pts
        </span>
      }
    >
      <p className="font-display text-2xl font-bold leading-snug text-wine-700">{round.text}</p>
    </QuestionCard>
  );

  return (
    <div>
      <RoundProgress index={state.index} total={state.rounds.length} />
      <AnimatePresence>
        {state.phase === 'answer' && prev?.result && prev.result !== 'skipped' && (
          <motion.div key={state.index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative mb-3 flex justify-center">
            <ResultBadge result={prev.result} />
            <HeartBurst show={prev.result === 'correct'} />
          </motion.div>
        )}
      </AnimatePresence>

      {state.phase === 'answer' && (
        <>
          <TurnBanner player={round.player} me={me} shared={shared} />
          {round.deadline && state.timePerQuestionSec && (
            <Countdown
              key={state.index}
              deadline={round.deadline}
              totalSec={state.timePerQuestionSec}
              offset={clockOffset}
              onExpire={() => canActFor(session, me, round.player) && act('timeout', {}, round.player)}
            />
          )}
          {card}
          {canActFor(session, me, round.player) ? (
            round.kind === 'mcq' && round.choices ? (
              <div className="grid gap-3">
                {round.choices.map((c, i) => (
                  <motion.button
                    key={c}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={busy}
                    onClick={() => act('answer', { answer: c }, round.player)}
                    className="card flex min-h-[56px] items-center gap-3 px-5 py-3 text-left font-semibold text-wine-700"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush-100 text-sm font-bold">{String.fromCharCode(65 + i)}</span>
                    {c}
                  </motion.button>
                ))}
              </div>
            ) : (
              <AnswerInput label={`${PLAYER_NAMES[round.player]}, ta réponse`} busy={busy} resetKey={state.index} onSubmit={(v) => act('answer', { answer: v }, round.player)} />
            )
          ) : (
            <WaitingFor player={round.player} text={`${PLAYER_NAMES[round.player]} cherche dans ses souvenirs`} />
          )}
          <SkipButton busy={busy} onClick={() => act('skip', {}, round.player)} />
        </>
      )}

      {state.phase === 'validate' && (
        <>
          {card}
          {round.kind === 'mcq' && round.choices ? (
            <>
              <div className="mb-5 grid gap-2">
                {round.choices.map((c) => {
                  const correct = normalizeLite(c) === normalizeLite(round.reference ?? '');
                  const picked = normalizeLite(c) === normalizeLite(round.answer ?? '');
                  return (
                    <motion.div
                      key={c}
                      animate={correct ? { scale: [1, 1.04, 1] } : picked ? { x: [0, -6, 6, 0] } : {}}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${
                        correct ? 'bg-emerald-500 text-white' : picked ? 'bg-blush-200 text-wine-700' : 'bg-white/60 text-ink/70'
                      }`}
                    >
                      {correct ? <Check className="h-5 w-5" /> : picked ? <X className="h-5 w-5" /> : <span className="w-5" />}
                      {c}
                    </motion.div>
                  );
                })}
              </div>
              <div className="relative mb-4 flex justify-center">
                <ResultBadge result={round.result} />
                <HeartBurst show={round.result === 'correct'} />
              </div>
              <Btn className="btn-primary w-full" disabled={busy} onClick={() => act('validate', {}, validator)}>
                Continuer <ArrowRight className="h-5 w-5" />
              </Btn>
            </>
          ) : (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar player={round.player} size={24} />
                    <span className="text-xs font-semibold text-wine-500">Réponse de {PLAYER_NAMES[round.player]}</span>
                  </div>
                  <p className="font-display text-lg font-bold text-wine-700">{round.answer || '(pas de réponse)'}</p>
                </motion.div>
                {round.reference && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-4">
                    <span className="text-xs font-semibold text-wine-500">Réponse enregistrée</span>
                    <p className="font-display text-lg font-bold text-wine-700">{round.reference}</p>
                  </motion.div>
                )}
              </div>
              {canActFor(session, me, validator) ? (
                <>
                  <p className="mb-3 text-center text-sm font-semibold text-wine-700">
                    {shared ? `${PLAYER_NAMES[validator]}, ` : ''}la réponse est-elle juste ?
                  </p>
                  <VerdictButtons
                    busy={busy}
                    suggestion={round.suggestion}
                    options={[
                      { value: 'correct', label: 'Juste', tone: 'good' },
                      ...(round.allowPartial ? [{ value: 'partial', label: 'En partie', tone: 'mid' as const }] : []),
                      { value: 'incorrect', label: 'Pas juste', tone: 'bad' },
                    ]}
                    onPick={(v) => {
                      act('validate', { result: v, ...(ref.trim() ? { reference: ref.trim() } : {}) }, validator);
                      setRef('');
                    }}
                  />
                  {!round.hadReference && (
                    <label className="mt-4 block">
                      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-wine-600">
                        <BookmarkPlus className="h-4 w-4" /> Enregistrer la bonne réponse pour la prochaine fois (facultatif)
                      </span>
                      <input value={ref} onChange={(e) => setRef(e.target.value)} className="input" placeholder="La bonne réponse" maxLength={300} />
                    </label>
                  )}
                </>
              ) : (
                <WaitingFor player={validator} text={`${PLAYER_NAMES[validator]} valide ta réponse`} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
