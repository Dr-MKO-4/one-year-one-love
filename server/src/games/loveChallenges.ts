import type { ChallengeData, ChallengeRound, ChallengeState, Difficulty, Player } from '../../../shared/types.js';
import { PLAYERS, otherPlayer } from '../../../shared/types.js';
import { mean, pct } from '../../../shared/scoring.js';
import { GameError, oneOf, pickProgressive, requireActor, type GameEngine } from './engine.js';

const COUNT: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };
const ALLOWED: Record<Difficulty, Difficulty[]> = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['easy', 'medium', 'hard'],
};

function earned(r: ChallengeRound): number {
  if (r.result === 'done') return r.points;
  if (r.result === 'partial') return r.points / 2;
  return 0;
}

export const loveChallenges: GameEngine<ChallengeState> = {
  id: 'love-challenges',
  minItems: 2,

  init({ items, difficulty }) {
    const chosen = pickProgressive(items, ALLOWED[difficulty], COUNT[difficulty]);
    if (chosen.length < 2) throw new GameError('Pas assez de défis actifs.');
    let next: Player = Math.random() < 0.5 ? 'miguel' : 'adele';
    const rounds: ChallengeRound[] = chosen.map((item) => {
      const d = item.data as ChallengeData;
      let player: Player | null = null;
      if (d.target === 'individual') {
        player = next;
        next = otherPlayer(next);
      }
      return {
        itemId: item.id,
        text: d.text,
        category: d.category,
        target: d.target,
        points: d.points,
        allowPartial: d.allowPartial,
        durationSec: d.durationSec,
        forbiddenWords: d.forbiddenWords,
        player,
        timerStartedAt: null,
      };
    });
    return { rounds, index: 0, done: false };
  },

  apply(state, action, actor, meta, now) {
    if (state.done) throw new GameError('La partie est terminée.');
    const rounds = [...state.rounds];
    const round = { ...rounds[state.index] };
    const advance = () => {
      rounds[state.index] = round;
      const index = state.index + 1;
      return { state: { ...state, rounds, index, done: index >= rounds.length } };
    };

    switch (action.type) {
      case 'startTimer': {
        if (!round.durationSec) throw new GameError('Ce défi n’a pas de minuteur.');
        round.timerStartedAt = now;
        rounds[state.index] = round;
        return { state: { ...state, rounds } };
      }
      case 'validate': {
        const validators = round.player ? [otherPlayer(round.player)] : PLAYERS;
        requireActor(actor, validators, meta, 'C’est à ton partenaire de valider ce défi.');
        const allowed = round.allowPartial ? (['done', 'partial', 'failed'] as const) : (['done', 'failed'] as const);
        round.result = oneOf(action.payload, 'result', allowed);
        return advance();
      }
      case 'skip': {
        round.result = 'skipped';
        return advance();
      }
      default:
        throw new GameError('Action inconnue.');
    }
  },

  isFinished: (s) => s.done,

  score(state) {
    const scored = state.rounds.filter((r) => r.result && r.result !== 'skipped');
    const per = (p: Player) => {
      const mine = scored.filter((r) => r.player === p);
      return pct(mine.reduce((s, r) => s + earned(r), 0), mine.reduce((s, r) => s + r.points, 0));
    };
    const miguel = per('miguel');
    const adele = per('adele');
    const together = scored.filter((r) => r.target === 'couple');
    const couple = together.length
      ? pct(together.reduce((s, r) => s + earned(r), 0), together.reduce((s, r) => s + r.points, 0))
      : mean([miguel, adele]);
    return { miguel, adele, couple, compatibility: null };
  },

  view: (s) => s,
};
