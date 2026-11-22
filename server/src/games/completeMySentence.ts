import type { Difficulty, Player, SentenceData, SentenceRound, SentenceState } from '../../../shared/types.js';
import { PLAYERS } from '../../../shared/types.js';
import { concordance } from '../../../shared/text.js';
import { pct } from '../../../shared/scoring.js';
import { GameError, oneOf, requireActor, shuffle, str, type GameEngine } from './engine.js';

const COUNT: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 10 };
const TIME_LIMIT: Record<Difficulty, number | null> = { easy: null, medium: null, hard: 75 };
const GRACE_MS = 2000;
const POINTS = { exact: 10, close: 5, different: 0 } as const;

type Internal = SentenceState & { _kw?: Record<string, string[][]> };

function deadline(state: SentenceState, now: number) {
  return state.timePerSentenceSec ? now + state.timePerSentenceSec * 1000 : null;
}

/** Révèle la manche quand les deux joueurs ont répondu (ou passé) et calcule la suggestion. */
function maybeReveal(state: Internal, round: SentenceRound): SentenceRound {
  if (!PLAYERS.every((p) => round.submitted[p])) return round;
  const r = { ...round, revealed: true };
  if (PLAYERS.some((p) => r.skipped[p])) return { ...r, result: 'skipped' };
  const c = concordance(r.answers.miguel ?? '', r.answers.adele ?? '', state._kw?.[r.itemId] ?? []);
  return { ...r, suggestion: c.level, similarity: Math.round(c.score * 100) / 100 };
}

function advance(state: Internal, rounds: SentenceRound[], now: number): Internal {
  const index = state.index + 1;
  if (index >= rounds.length) return { ...state, rounds, index, done: true };
  const next = [...rounds];
  next[index] = { ...next[index], deadline: deadline(state, now) };
  return { ...state, rounds: next, index };
}

export const completeMySentence: GameEngine<SentenceState> = {
  id: 'complete-my-sentence',
  minItems: 2,

  init({ items, difficulty, now }) {
    const chosen = shuffle(items).slice(0, COUNT[difficulty]);
    if (chosen.length < 2) throw new GameError('Pas assez de phrases actives.');
    const limit = TIME_LIMIT[difficulty];
    const rounds: SentenceRound[] = chosen.map((item, i) => ({
      itemId: item.id,
      prompt: (item.data as SentenceData).prompt,
      answers: {},
      submitted: {},
      skipped: {},
      revealed: false,
      deadline: i === 0 && limit ? now + limit * 1000 : null,
    }));
    const kw = Object.fromEntries(chosen.map((i) => [i.id, (i.data as SentenceData).keywordGroups ?? []]));
    const state: Internal = { rounds, index: 0, done: false, timePerSentenceSec: limit, _kw: kw };
    return state;
  },

  apply(raw, action, actor, meta, now) {
    const state = raw as Internal;
    if (state.done) throw new GameError('La partie est terminée.');
    const rounds = [...state.rounds];
    const cur = rounds[state.index];
    let round: SentenceRound = { ...cur, answers: { ...cur.answers }, submitted: { ...cur.submitted }, skipped: { ...cur.skipped } };
    const expired = round.deadline !== null && now > round.deadline + GRACE_MS;

    switch (action.type) {
      case 'submit':
      case 'skipMine': {
        if (round.revealed) throw new GameError('Les réponses sont déjà révélées.');
        requireActor(actor, PLAYERS, meta, 'Action non autorisée.');
        if (round.submitted[actor]) throw new GameError('Tu as déjà répondu.');
        if (action.type === 'skipMine' || expired) {
          round.skipped[actor] = true;
        } else {
          const answer = str(action.payload, 'answer', 300);
          if (!answer) throw new GameError('Complète la phrase ou passe-la.');
          round.answers[actor] = answer;
        }
        round.submitted[actor] = true;
        round = maybeReveal(state, round);
        rounds[state.index] = round;
        return { state: { ...state, rounds } };
      }
      case 'timeout': {
        if (round.revealed || round.deadline === null) throw new GameError('Pas de minuteur actif.');
        if (now < round.deadline - 1500) throw new GameError('Le temps n’est pas encore écoulé.');
        for (const p of PLAYERS) {
          if (!round.submitted[p]) {
            round.skipped[p] = true;
            round.submitted[p] = true;
          }
        }
        round = maybeReveal(state, round);
        rounds[state.index] = round;
        return { state: { ...state, rounds } };
      }
      case 'settle': {
        if (!round.revealed) throw new GameError('Attendez que les deux réponses soient données.');
        if (round.result !== 'skipped') round.result = oneOf(action.payload, 'result', ['exact', 'close', 'different'] as const);
        rounds[state.index] = round;
        return { state: advance(state, rounds, now) };
      }
      default:
        throw new GameError('Action inconnue.');
    }
  },

  isFinished: (s) => s.done,

  score(state) {
    const total = state.rounds.length;
    const participation = (p: Player) => pct(state.rounds.filter((r) => r.submitted[p] && !r.skipped[p]).length, total);
    const scored = state.rounds.filter((r) => r.result && r.result !== 'skipped');
    const points = scored.reduce((s, r) => s + POINTS[r.result as keyof typeof POINTS], 0);
    const couple = pct(points, scored.length * 10);
    return { miguel: participation('miguel'), adele: participation('adele'), couple, compatibility: couple };
  },

  view(raw, viewer, meta) {
    const { _kw, ...state } = raw as Internal;
    return {
      ...state,
      rounds: state.rounds.map((r) => {
        if (r.revealed) return r;
        const answers: SentenceRound['answers'] = {};
        for (const p of PLAYERS) {
          if (r.answers[p] !== undefined) answers[p] = !meta.sharedDevice && p === viewer ? r.answers[p] : '•••';
        }
        return { ...r, answers };
      }),
    };
  },
};
