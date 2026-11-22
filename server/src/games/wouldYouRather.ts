import type { Difficulty, Player, WyrData, WyrRound, WyrState } from '../../../shared/types.js';
import { PLAYERS } from '../../../shared/types.js';
import { pct } from '../../../shared/scoring.js';
import { GameError, oneOf, requireActor, shuffle, str, type GameEngine } from './engine.js';

const COUNT: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 16 };

export const wouldYouRather: GameEngine<WyrState> = {
  id: 'would-you-rather',
  minItems: 3,

  init({ items, difficulty }) {
    const chosen = shuffle(items).slice(0, COUNT[difficulty]);
    if (chosen.length < 3) throw new GameError('Pas assez de questions actives pour ce jeu.');
    const rounds: WyrRound[] = chosen.map((i) => {
      const d = i.data as WyrData;
      return { itemId: i.id, a: d.a, b: d.b, choices: {}, reasons: {}, revealed: false };
    });
    return { rounds, index: 0, done: false };
  },

  apply(state, action, actor, meta) {
    if (state.done) throw new GameError('La partie est terminée.');
    const rounds = [...state.rounds];
    const round: WyrRound = { ...rounds[state.index], choices: { ...rounds[state.index].choices }, reasons: { ...rounds[state.index].reasons } };
    const p = action.payload;

    switch (action.type) {
      case 'choose': {
        if (round.revealed) throw new GameError('Les réponses sont déjà révélées.');
        requireActor(actor, PLAYERS, meta, 'Action non autorisée.');
        round.choices[actor] = oneOf(p, 'choice', ['a', 'b', 'skip'] as const);
        if (PLAYERS.every((pl) => round.choices[pl])) round.revealed = true;
        rounds[state.index] = round;
        return { state: { ...state, rounds } };
      }
      case 'reason': {
        if (!round.revealed) throw new GameError('Attendez la révélation pour expliquer votre choix.');
        round.reasons[actor] = str(p, 'reason', 280);
        rounds[state.index] = round;
        return { state: { ...state, rounds } };
      }
      case 'next': {
        if (!round.revealed) throw new GameError('Les deux réponses ne sont pas encore données.');
        const index = state.index + 1;
        return { state: { ...state, index, done: index >= rounds.length } };
      }
      default:
        throw new GameError('Action inconnue.');
    }
  },

  isFinished: (s) => s.done,

  score(state) {
    const total = state.rounds.length;
    const participation = (p: Player) =>
      pct(state.rounds.filter((r) => r.choices[p] && r.choices[p] !== 'skip').length, total);
    const both = state.rounds.filter(
      (r) => r.choices.miguel && r.choices.adele && r.choices.miguel !== 'skip' && r.choices.adele !== 'skip',
    );
    const same = both.filter((r) => r.choices.miguel === r.choices.adele).length;
    const compatibility = pct(same * 10, both.length * 10);
    return {
      miguel: participation('miguel'),
      adele: participation('adele'),
      couple: compatibility,
      compatibility,
    };
  },

  view(state, viewer, meta) {
    if (meta.sharedDevice) {
      // Un seul appareil : l'interface masque les choix, mais on ne transmet pas ceux de la manche en cours.
      return {
        ...state,
        rounds: state.rounds.map((r) =>
          r.revealed ? r : { ...r, choices: Object.fromEntries(Object.entries(r.choices).map(([k]) => [k, 'hidden'])) },
        ),
      };
    }
    return {
      ...state,
      rounds: state.rounds.map((r) => {
        if (r.revealed) return r;
        const choices: WyrRound['choices'] = {};
        for (const pl of PLAYERS) if (r.choices[pl]) choices[pl] = pl === viewer ? r.choices[pl] : 'hidden';
        return { ...r, choices };
      }),
    };
  },
};
