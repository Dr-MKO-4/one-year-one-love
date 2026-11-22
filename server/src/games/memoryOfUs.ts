import type { ContentItem, Difficulty, MemoryCard, MemoryData, MemoryState, Player } from '../../../shared/types.js';
import { otherPlayer } from '../../../shared/types.js';
import { norm100 } from '../../../shared/scoring.js';
import { GameError, requireActor, shuffle, type GameEngine, type SessionMeta } from './engine.js';

/** Nombre de paires par niveau : la partie s'agrandit au fil des niveaux. */
const LEVELS: Record<Difficulty, number[]> = { easy: [3, 4], medium: [4, 6], hard: [6, 8] };
const TIME_LIMIT: Record<Difficulty, number | null> = { easy: null, medium: null, hard: 240 };
const MISS_LOCK_MS = 900;

function buildCards(pool: PoolItem[], pairs: number, startId: number): MemoryCard[] {
  const chosen = shuffle(pool).slice(0, pairs);
  const cards: MemoryCard[] = [];
  let id = startId;
  for (const item of chosen) {
    const d = item.data as MemoryData;
    cards.push({ id: id++, pairId: item.id, content: d.left, matched: false });
    cards.push({ id: id++, pairId: item.id, content: d.right, matched: false });
  }
  return shuffle(cards);
}

// Le pool de contenu est conservé hors de l'état public, dans une propriété technique.
type PoolItem = Pick<ContentItem, 'id' | 'data' | 'difficulty'>;
type InternalState = MemoryState & { _pool?: PoolItem[] };

function efficiencyPart(found: number, attempts: number): number {
  if (attempts <= 0) return 0;
  // Une efficacité de 62 % (soit environ 1,6 tentative par paire) donne la totalité des points.
  return Math.min(1, (found / attempts) * 1.6);
}

function finish(state: InternalState, now: number, timedOut = false): InternalState {
  return { ...state, done: true, finishedAt: now, timedOut, flipped: [] };
}

function checkTime(state: InternalState, now: number): InternalState | null {
  if (state.timeLimitSec && now >= state.startedAt + state.timeLimitSec * 1000) return finish(state, now, true);
  return null;
}

export const memoryOfUs: GameEngine<MemoryState> = {
    id: 'memory-of-us',
    minItems: 3,

    init({ items, difficulty, mode, players, now }) {
      if (items.length < 3) throw new GameError('Il faut au moins 3 associations actives pour jouer à Memory of Us.');
      const levels = LEVELS[difficulty].map((n) => Math.min(n, items.length));
      const turn: Player = mode === 'solo' ? players[0] : Math.random() < 0.5 ? 'miguel' : 'adele';
      const state: InternalState = {
        level: 0,
        levels,
        cards: buildCards(items, levels[0], 0),
        flipped: [],
        lastMiss: null,
        turn,
        attempts: Object.fromEntries(players.map((p) => [p, 0])),
        pairsFound: Object.fromEntries(players.map((p) => [p, 0])),
        totalPairs: levels.reduce((a, b) => a + b, 0),
        startedAt: now,
        finishedAt: null,
        timeLimitSec: TIME_LIMIT[difficulty],
        timedOut: false,
        done: false,
        _pool: items.map((i) => ({ id: i.id, data: i.data, difficulty: i.difficulty })),
      };
      return state;
    },

    apply(raw, action, actor, meta, now) {
      let state = raw as InternalState;
      if (state.done) throw new GameError('La partie est terminée.');
      const timed = checkTime(state, now);
      if (timed) return { state: timed };

      if (action.type === 'timeout') {
        if (state.timeLimitSec && now >= state.startedAt + state.timeLimitSec * 1000 - 1500) return { state: finish(state, now, true) };
        throw new GameError('Le temps n’est pas encore écoulé.');
      }
      if (action.type !== 'flip') throw new GameError('Action inconnue.');

      const actingPlayer = meta.mode === 'solo' ? meta.players[0] : state.turn;
      requireActor(actor, actingPlayer, meta, 'Ce n’est pas ton tour.');
      if (state.lastMiss) {
        if (now - state.lastMiss.at < MISS_LOCK_MS) throw new GameError('Un instant, les cartes se retournent.', 409);
        state = { ...state, lastMiss: null };
      }
      const cardId = Number(action.payload?.cardId);
      const card = state.cards.find((c) => c.id === cardId);
      if (!card || card.matched || state.flipped.includes(cardId)) throw new GameError('Carte non disponible.', 409);

      const flipped = [...state.flipped, cardId];
      if (flipped.length < 2) return { state: { ...state, flipped } };

      const [a, b] = flipped.map((id) => state.cards.find((c) => c.id === id)!);
      const attempts = { ...state.attempts, [actingPlayer]: (state.attempts[actingPlayer] ?? 0) + 1 };

      if (a.pairId === b.pairId) {
        const cards = state.cards.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true, matchedBy: actingPlayer } : c));
        const pairsFound = { ...state.pairsFound, [actingPlayer]: (state.pairsFound[actingPlayer] ?? 0) + 1 };
        let next: InternalState = { ...state, cards, attempts, pairsFound, flipped: [] };
        if (cards.every((c) => c.matched)) {
          if (state.level + 1 < state.levels.length) {
            const pool = state._pool ?? [];
            const startId = Math.max(...cards.map((c) => c.id)) + 1;
            const nextCards = pool.length >= 2 ? buildCards(pool, state.levels[state.level + 1], startId) : [];
            next = nextCards.length ? { ...next, level: state.level + 1, cards: nextCards } : finish(next, now);
          } else {
            next = finish(next, now);
          }
        }
        return { state: next };
      }

      const turn = meta.mode === 'solo' ? state.turn : otherPlayer(state.turn);
      return { state: { ...state, attempts, flipped: [], lastMiss: { cards: [a.id, b.id], at: now }, turn } };
    },

    isFinished: (s) => s.done,

    score(state, meta: SessionMeta) {
      const found = Object.values(state.pairsFound).reduce((a, b) => a + (b ?? 0), 0);
      const attempts = Object.values(state.attempts).reduce((a, b) => a + (b ?? 0), 0);
      const global = norm100(60 * (found / Math.max(1, state.totalPairs)) + 40 * efficiencyPart(found, attempts));
      if (meta.mode === 'solo') {
        const p = meta.players[0];
        return { miguel: p === 'miguel' ? global : null, adele: p === 'adele' ? global : null, couple: null, compatibility: null };
      }
      const half = state.totalPairs / 2;
      const per = (p: Player) => {
        const f = state.pairsFound[p] ?? 0;
        const t = state.attempts[p] ?? 0;
        return norm100(60 * Math.min(1, f / Math.max(1, half)) + 40 * efficiencyPart(f, t));
      };
      return { miguel: per('miguel'), adele: per('adele'), couple: global, compatibility: null };
    },

    view(raw) {
      const state = raw as InternalState;
      const visible = new Set<number>([...state.flipped, ...(state.lastMiss?.cards ?? [])]);
      const { _pool, ...pub } = state;
      return {
        ...pub,
        cards: state.cards.map((c) => (c.matched || visible.has(c.id) || state.done ? c : { ...c, content: null })),
      };
    },
};
