import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Pencil } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import {
  AnswerInput,
  Avatar,
  HandOff,
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

export function WhoKnowsWho({ session, me, act, busy }: GameProps<'who-knows-who'>) {
  const { state } = session;
  const round = state.rounds[state.index];
  const prev = state.rounds[state.index - 1];
  const [edit, setEdit] = useState(false);
  const [newRef, setNewRef] = useState('');
  if (!round) return null;
  const shared = session.sharedDevice;
  const subject = PLAYER_NAMES[round.subject];

  const question = (
    <QuestionCard
      k={`${state.index}-${state.phase === 'validate' ? 'v' : 'q'}`}
      kicker={
        <span className="flex items-center gap-2 text-sm font-semibold text-wine-500">
          <Avatar player={round.subject} size={26} /> {subject} demande :
        </span>
      }
    >
      <p className="font-display text-2xl font-bold leading-snug text-wine-700">« {round.text} »</p>
    </QuestionCard>
  );

  return (
    <div>
      <RoundProgress index={state.index} total={state.rounds.length} />
      <AnimatePresence>
        {prev?.result && prev.result !== 'skipped' && (
          <motion.div key={state.index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative mb-3 flex justify-center">
            <ResultBadge result={prev.result} />
            <HeartBurst show={prev.result === 'correct'} />
          </motion.div>
        )}
      </AnimatePresence>

      {state.phase === 'reference' && (
        <>
          <TurnBanner player={round.subject} me={me} shared={shared} text={`${subject} écrit sa vraie réponse en secret`} />
          {canActFor(session, me, round.subject) ? (
            <HandOff to={round.subject} id={`ref-${state.index}`}>
              {question}
              <p className="mb-3 flex items-center gap-2 text-sm text-ink/70">
                <Lock className="h-4 w-4 text-wine-500" /> Ta réponse sera enregistrée comme référence pour les prochaines parties.
              </p>
              <AnswerInput secret busy={busy} resetKey={`ref-${state.index}`} placeholder="Ta vraie réponse…" onSubmit={(v) => act('reference', { answer: v }, round.subject)} />
            </HandOff>
          ) : (
            <>
              {question}
              <WaitingFor player={round.subject} text={`${subject} écrit sa réponse en secret`} />
            </>
          )}
        </>
      )}

      {state.phase === 'guess' && (
        <>
          <TurnBanner player={round.guesser} me={me} shared={shared} />
          {canActFor(session, me, round.guesser) ? (
            <HandOff to={round.guesser} id={`guess-${state.index}`}>
              {question}
              <AnswerInput busy={busy} resetKey={`guess-${state.index}`} placeholder={`Que répondrait ${subject} ?`} onSubmit={(v) => act('guess', { answer: v }, round.guesser)} />
            </HandOff>
          ) : (
            <>
              {question}
              <WaitingFor player={round.guesser} text={`${PLAYER_NAMES[round.guesser]} devine ta réponse`} />
            </>
          )}
        </>
      )}

      {state.phase === 'validate' && (
        <>
          {question}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { who: round.guesser, label: `${PLAYER_NAMES[round.guesser]} a répondu`, value: round.guess },
              { who: round.subject, label: `Réponse de ${subject}`, value: round.reference },
            ].map((x, i) => (
              <motion.div
                key={x.label}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.35, type: 'spring', stiffness: 160 }}
                className="card p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Avatar player={x.who} size={24} />
                  <span className="text-xs font-semibold text-wine-500">{x.label}</span>
                </div>
                <p className="font-display text-lg font-bold text-wine-700">{x.value}</p>
              </motion.div>
            ))}
          </div>
          {canActFor(session, me, round.subject) ? (
            <>
              <p className="mb-3 text-center text-sm font-semibold text-wine-700">{shared ? `${subject}, ` : ''}est-ce la bonne réponse ?</p>
              <VerdictButtons
                busy={busy}
                suggestion={round.suggestion}
                options={[
                  { value: 'correct', label: 'Oui', tone: 'good' },
                  { value: 'incorrect', label: 'Non', tone: 'bad' },
                ]}
                onPick={(v) => {
                  act('validate', { result: v, ...(edit && newRef.trim() ? { newReference: newRef.trim() } : {}) }, round.subject);
                  setEdit(false);
                  setNewRef('');
                }}
              />
              {!edit ? (
                <button onClick={() => setEdit(true)} className="mx-auto mt-4 flex items-center gap-1 text-sm font-semibold text-wine-500">
                  <Pencil className="h-4 w-4" /> Ma réponse a changé
                </button>
              ) : (
                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} value={newRef} onChange={(e) => setNewRef(e.target.value)} placeholder="Nouvelle réponse de référence" className="input mt-4" />
              )}
            </>
          ) : (
            <WaitingFor player={round.subject} text={`${subject} valide ta réponse`} />
          )}
        </>
      )}

      {state.phase !== 'validate' && (canActFor(session, me, round.subject) || canActFor(session, me, round.guesser)) && (
        <SkipButton busy={busy} onClick={() => act('skip', {}, round.subject)} />
      )}
    </div>
  );
}
