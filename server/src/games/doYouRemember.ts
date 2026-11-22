import type { Difficulty, Player, RememberData, RememberRound, RememberState } from '../../../shared/types.js';
import { otherPlayer } from '../../../shared/types.js';
import { normalize, suggestVerdict } from '../../../shared/text.js';
import { mean, pct } from '../../../shared/scoring.js';
import { GameError, oneOf, optStr, pickProgressive, requireActor, str, type Effect, type GameEngine } from './engine.js';

const COUNT: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };
const ALLOWED: Record<Difficulty, Difficulty[]> = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['medium', 'hard'],
};
const DEFAULT_POINTS: Record<Difficulty, number> = { easy: 10, medium: 15, hard: 20 };
const TIME_LIMIT: Record<Difficulty, number | null> = { easy: null, medium: null, hard: 45 };
const GRACE_MS = 2000;

function advance(state: RememberState, now: number): RememberState {
  const index = state.index + 1;
  if (index >= state.rounds.length) return { ...state, index, phase: 'done' };
  const rounds = [...state.rounds];
  rounds[index] = { ...rounds[index], deadline: state.timePerQuestionSec ? now + state.timePerQuestionSec * 1000 : null };
  return { ...state, rounds, index, phase: 'answer' };
}

export const doYouRemember: GameEngine<RememberState> = {
  id: 'do-you-remember',
  minItems: 2,

  init({ items, difficulty, now }) {
    const chosen = pickProgressive(items, ALLOWED[difficulty], COUNT[difficulty]);
    if (chosen.length < 2) throw new GameError('Pas assez de questions actives pour ce jeu.');
    const limit = TIME_LIMIT[difficulty];
    let player: Player = Math.random() < 0.5 ? 'miguel' : 'adele';
    const rounds: RememberRound[] = chosen.map((item, i) => {
      const d = item.data as RememberData;
      const ref = d.answer?.trim() || null;
      const round: RememberRound = {
        itemId: item.id,
        text: d.text,
        kind: d.kind === 'mcq' && d.choices?.length ? 'mcq' : 'free',
        choices: d.kind === 'mcq' ? d.choices : undefined,
        reference: ref,
        hadReference: !!ref,
        allowPartial: !!d.allowPartial,
        points: d.points ?? DEFAULT_POINTS[item.difficulty],
        player,
        deadline: i === 0 && limit ? now + limit * 1000 : null,
      };
      player = otherPlayer(player);
      return round;
    });
    // Les mots-clés restent côté serveur : ils servent seulement à la suggestion.
    const keywords = Object.fromEntries(chosen.map((i) => [i.id, (i.data as RememberData).keywords ?? []]));
    return { rounds, index: 0, phase: 'answer', timePerQuestionSec: limit, _keywords: keywords } as RememberState;
  },

  apply(state, action, actor, meta, now) {
    if (state.phase === 'done') throw new GameError('La partie est terminée.');
    const rounds = [...state.rounds];
    const round = { ...rounds[state.index] };
    const p = action.payload;
    const effects: Effect[] = [];
    const keywords = ((state as RememberState & { _keywords?: Record<string, string[]> })._keywords ?? {})[round.itemId] ?? [];
    const expired = round.deadline !== null && now > round.deadline + GRACE_MS;

    switch (action.type) {
      case 'answer': {
        if (state.phase !== 'answer') throw new GameError('Ce n’est pas le moment de répondre.');
        requireActor(actor, round.player, meta, 'C’est à l’autre joueur de répondre.');
        const answer = expired ? '' : str(p, 'answer', 300);
        round.answer = answer;
        if (expired) {
          round.result = 'incorrect';
          rounds[state.index] = round;
          return { state: advance({ ...state, rounds }, now) };
        }
        if (round.kind === 'mcq' && round.reference) {
          round.result = normalize(answer) === normalize(round.reference) ? 'correct' : 'incorrect';
          round.suggestion = round.result;
          rounds[state.index] = round;
          return { state: { ...state, rounds, phase: 'validate' } };
        }
        round.suggestion = suggestVerdict(answer, round.reference, keywords, round.allowPartial);
        rounds[state.index] = round;
        return { state: { ...state, rounds, phase: 'validate' } };
      }
      case 'timeout': {
        if (state.phase !== 'answer' || round.deadline === null) throw new GameError('Pas de minuteur actif.');
        if (now < round.deadline - 1500) throw new GameError('Le temps n’est pas encore écoulé.');
        round.answer = '';
        round.result = 'incorrect';
        rounds[state.index] = round;
        return { state: advance({ ...state, rounds }, now) };
      }
      case 'validate': {
        if (state.phase !== 'validate') throw new GameError('Rien à valider pour le moment.');
        if (round.kind === 'mcq' && round.result) {
          // Choix multiple déjà corrigé : il suffit de passer à la suite.
          return { state: advance(state, now) };
        }
        requireActor(actor, otherPlayer(round.player), meta, 'C’est à l’autre joueur de valider la réponse.');
        const allowed = round.allowPartial ? (['correct', 'partial', 'incorrect'] as const) : (['correct', 'incorrect'] as const);
        round.result = oneOf(p, 'result', allowed);
        const reference = optStr(p, 'reference', 300);
        if (reference && !round.hadReference) {
          round.reference = reference;
          effects.push({ type: 'saveRememberAnswer', itemId: round.itemId, value: reference });
        }
        rounds[state.index] = round;
        return { state: advance({ ...state, rounds }, now), effects };
      }
      case 'skip': {
        round.result = 'skipped';
        rounds[state.index] = round;
        return { state: advance({ ...state, rounds }, now) };
      }
      default:
        throw new GameError('Action inconnue.');
    }
  },

  isFinished: (s) => s.phase === 'done',

  score(state) {
    const per = (pl: Player) => {
      const played = state.rounds.filter((r) => r.player === pl && r.result && r.result !== 'skipped');
      const earned = played.reduce(
        (sum, r) => sum + (r.result === 'correct' ? r.points : r.result === 'partial' ? r.points / 2 : 0),
        0,
      );
      return pct(earned, played.reduce((s, r) => s + r.points, 0));
    };
    const miguel = per('miguel');
    const adele = per('adele');
    return { miguel, adele, couple: mean([miguel, adele]), compatibility: null };
  },

  view(state) {
    const { _keywords, ...pub } = state as RememberState & { _keywords?: unknown };
    return {
      ...pub,
      rounds: state.rounds.map((r, i) => {
        const revealed = i < state.index || (i === state.index && state.phase !== 'answer') || state.phase === 'done';
        return revealed ? r : { ...r, reference: r.reference ? '•••' : null };
      }),
    };
  },
};
