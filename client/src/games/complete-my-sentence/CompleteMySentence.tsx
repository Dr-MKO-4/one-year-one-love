import { motion } from 'framer-motion';
import { ArrowRight, Check, PenLine } from 'lucide-react';
import { PLAYERS, PLAYER_NAMES, otherPlayer, type Player, type SentenceRound } from '@shared/types';
import {
  AnswerInput,
  Avatar,
  Countdown,
  HandOff,
  QuestionCard,
  RoundProgress,
  SkipButton,
  VerdictButtons,
  WaitingFor,
  type GameProps,
} from '@/components/games/common';
import { HeartBurst } from '@/components/FloatingHearts';
import { Btn } from '@/components/ui';

function Prompt({ round, k }: { round: SentenceRound; k: string | number }) {
  return (
    <QuestionCard k={k} kicker={<PenLine className="h-6 w-6 text-blush-400" />}>
      <p className="font-display text-2xl font-bold italic leading-snug text-wine-700">« {round.prompt} »</p>
    </QuestionCard>
  );
}

export function CompleteMySentence({ session, me, act, busy, clockOffset }: GameProps<'complete-my-sentence'>) {
  const { state } = session;
  const round = state.rounds[state.index];
  if (!round) return null;
  const shared = session.sharedDevice;

  const timer =
    round.deadline && state.timePerSentenceSec && !round.revealed ? (
      <Countdown key={state.index} deadline={round.deadline} totalSec={state.timePerSentenceSec} offset={clockOffset} onExpire={() => act('timeout')} />
    ) : null;

  const writer = (p: Player) => (
    <>
      <Prompt round={round} k={`${state.index}-${p}`} />
      <AnswerInput multiline busy={busy} resetKey={`${state.index}-${p}`} placeholder="Complète la phrase…" onSubmit={(v) => act('submit', { answer: v }, p)} />
      <SkipButton busy={busy} label="Passer cette phrase" onClick={() => act('skipMine', {}, p)} />
    </>
  );

  if (!round.revealed) {
    if (shared) {
      const next = PLAYERS.find((p) => !round.submitted[p])!;
      return (
        <div>
          <RoundProgress index={state.index} total={state.rounds.length} />
          {timer}
          <HandOff to={next} id={`${state.index}-${next}`}>
            {writer(next)}
          </HandOff>
        </div>
      );
    }
    const other = otherPlayer(me);
    return (
      <div>
        <RoundProgress index={state.index} total={state.rounds.length} />
        {timer}
        {!round.submitted[me] ? (
          writer(me)
        ) : (
          <>
            <Prompt round={round} k={state.index} />
            <div className="card p-5 text-center">
              <Check className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
              <p className="font-semibold text-wine-700">{round.skipped[me] ? 'Phrase passée.' : `Ta réponse : « ${round.answers[me]} »`}</p>
              {round.submitted[other] ? (
                <p className="mt-2 text-sm text-ink/60">{PLAYER_NAMES[other]} a répondu aussi.</p>
              ) : (
                <WaitingFor player={other} text={`${PLAYER_NAMES[other]} écrit`} />
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const similarity = Math.round((round.similarity ?? 0) * 100);
  return (
    <div>
      <RoundProgress index={state.index} total={state.rounds.length} />
      <Prompt round={round} k={`${state.index}-r`} />
      <div className="relative mb-5 grid gap-3">
        <HeartBurst show={round.suggestion === 'exact'} />
        {PLAYERS.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, x: i ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.3, type: 'spring', stiffness: 150 }}
            className={`card flex gap-3 p-4 ${i ? 'flex-row-reverse text-right' : ''}`}
          >
            <Avatar player={p} size={34} />
            <div>
              <p className="text-xs font-bold text-wine-500">{PLAYER_NAMES[p]}</p>
              <p className="font-display text-lg font-bold text-wine-700">{round.skipped[p] ? '(a passé)' : `…${round.answers[p]}`}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {round.result === 'skipped' ? (
        <Btn className="btn-primary w-full" disabled={busy} onClick={() => act('settle')}>
          Phrase suivante <ArrowRight className="h-5 w-5" />
        </Btn>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs font-semibold text-wine-500">
              <span>Concordance suggérée (mots-clés)</span>
              <span>{similarity} %</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-blush-100">
              <motion.div className="h-full rounded-full bg-wine-gradient" initial={{ width: 0 }} animate={{ width: `${Math.max(similarity, 4)}%` }} transition={{ delay: 0.8, duration: 1 }} />
            </div>
            <p className="mt-2 text-xs text-ink/50">Le jeu ne comprend pas toutes les nuances : à vous de trancher.</p>
          </div>
          <VerdictButtons
            busy={busy}
            suggestion={round.suggestion}
            options={[
              { value: 'exact', label: 'Identique', tone: 'good' },
              { value: 'close', label: 'Proche', tone: 'mid' },
              { value: 'different', label: 'Différent', tone: 'bad' },
            ]}
            onPick={(v) => act('settle', { result: v })}
          />
        </>
      )}
    </div>
  );
}
