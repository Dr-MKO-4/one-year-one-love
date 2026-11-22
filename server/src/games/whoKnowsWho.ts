import type { ContentItem, Difficulty, Player, WkwData, WkwRound, WkwState } from '../../../shared/types.js';
import { otherPlayer } from '../../../shared/types.js';
import { suggestVerdict } from '../../../shared/text.js';
import { mean, pct } from '../../../shared/scoring.js';
import { GameError, oneOf, optStr, pickProgressive, requireActor, shuffle, str, type Effect, type GameEngine } from './engine.js';

const COUNT: Record<Difficulty, number> = { easy: 6, medium: 10, hard: 14 };
const ALLOWED: Record<Difficulty, Difficulty[]> = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['easy', 'medium', 'hard'],
};

function phaseFor(round: WkwRound | undefined): WkwState['phase'] {
  if (!round) return 'done';
  return round.reference ? 'guess' : 'reference';
}

function advance(state: WkwState): WkwState {
  const index = state.index + 1;
  return { ...state, index, phase: phaseFor(state.rounds[index]) };
}

export const whoKnowsWho: GameEngine<WkwState> = {
  id: 'who-knows-who',
  minItems: 2,

  init({ items, difficulty }) {
    const total = COUNT[difficulty];
    const perPlayer = Math.ceil(total / 2);
    const first: Player = Math.random() < 0.5 ? 'miguel' : 'adele';
    const usable = (subject: Player) =>
      items.filter((i) => {
        const d = i.data as WkwData;
        return d.about === 'both' || d.about === subject;
      });

    // Questions sur Adèle (devinées par Miguel) et sur Miguel (devinées par Adèle).
    const aboutAdele = pickProgressive(usable('adele'), ALLOWED[difficulty], perPlayer);
    const aboutMiguel = pickProgressive(
      usable('miguel').filter((i) => (i.data as WkwData).about !== 'both' || !aboutAdele.includes(i)) as ContentItem[],
      ALLOWED[difficulty],
      perPlayer,
    );
    const queues: Record<Player, ContentItem[]> = { adele: aboutAdele, miguel: aboutMiguel };

    const rounds: WkwRound[] = [];
    let guesser = first;
    while (rounds.length < total && (queues.adele.length || queues.miguel.length)) {
      const subject = otherPlayer(guesser);
      const item = queues[subject].shift();
      if (item) {
        const d = item.data as WkwData;
        const ref = d.answers?.[subject]?.trim() || null;
        rounds.push({ itemId: item.id, text: d.text, subject, guesser, reference: ref, hadReference: !!ref });
      }
      guesser = otherPlayer(guesser);
    }
    if (rounds.length < 2) throw new GameError('Pas assez de questions actives pour ce jeu. Ajoutez-en dans la configuration.');
    return { rounds, index: 0, phase: phaseFor(rounds[0]) };
  },

  apply(state, action, actor, meta) {
    if (state.phase === 'done') throw new GameError('La partie est terminée.');
    const round = { ...state.rounds[state.index] };
    const rounds = [...state.rounds];
    const effects: Effect[] = [];
    const p = action.payload;

    switch (action.type) {
      case 'reference': {
        if (state.phase !== 'reference') throw new GameError('Ce n’est pas le moment de donner la réponse de référence.');
        requireActor(actor, round.subject, meta, 'C’est à la personne concernée d’écrire sa réponse.');
        const answer = str(p, 'answer', 200);
        if (!answer) throw new GameError('La réponse ne peut pas être vide.');
        round.reference = answer;
        effects.push({ type: 'saveWkwAnswer', itemId: round.itemId, player: round.subject, value: answer });
        rounds[state.index] = round;
        return { state: { ...state, rounds, phase: 'guess' }, effects };
      }
      case 'guess': {
        if (state.phase !== 'guess') throw new GameError('Ce n’est pas le moment de deviner.');
        requireActor(actor, round.guesser, meta, 'C’est à l’autre joueur de deviner.');
        const guess = str(p, 'answer', 200);
        if (!guess) throw new GameError('La réponse ne peut pas être vide.');
        round.guess = guess;
        round.suggestion = suggestVerdict(guess, round.reference) === 'correct' ? 'correct' : 'incorrect';
        rounds[state.index] = round;
        return { state: { ...state, rounds, phase: 'validate' } };
      }
      case 'validate': {
        if (state.phase !== 'validate') throw new GameError('Rien à valider pour le moment.');
        requireActor(actor, round.subject, meta, 'C’est à la personne concernée de valider.');
        round.result = oneOf(p, 'result', ['correct', 'incorrect'] as const);
        const updated = optStr(p, 'newReference', 200);
        if (updated && updated !== round.reference) {
          round.reference = updated;
          effects.push({ type: 'saveWkwAnswer', itemId: round.itemId, player: round.subject, value: updated });
        }
        rounds[state.index] = round;
        return { state: advance({ ...state, rounds }), effects };
      }
      case 'skip': {
        requireActor(actor, [round.subject, round.guesser], meta, 'Action non autorisée.');
        round.result = 'skipped';
        rounds[state.index] = round;
        return { state: advance({ ...state, rounds }) };
      }
      default:
        throw new GameError('Action inconnue.');
    }
  },

  isFinished: (s) => s.phase === 'done',

  score(state) {
    const per = (p: Player) => {
      const played = state.rounds.filter((r) => r.guesser === p && r.result && r.result !== 'skipped');
      const correct = played.filter((r) => r.result === 'correct').length;
      return pct(correct * 10, played.length * 10);
    };
    const miguel = per('miguel');
    const adele = per('adele');
    return { miguel, adele, couple: mean([miguel, adele]), compatibility: null };
  },

  view(state, viewer, meta) {
    const rounds = state.rounds.map((r, i) => {
      const revealed = i < state.index || (i === state.index && state.phase === 'validate') || state.phase === 'done';
      const canSee = revealed || (!meta.sharedDevice && viewer === r.subject && i === state.index);
      return canSee ? r : { ...r, reference: r.reference ? '•••' : null };
    });
    return { ...state, rounds };
  },
};
