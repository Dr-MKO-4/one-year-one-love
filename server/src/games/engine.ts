import type { ContentItem, Difficulty, GameAction, GameId, PlayMode, Player } from '../../../shared/types.js';
import type { ScoreResult } from '../../../shared/scoring.js';

export class GameError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface SessionMeta {
  mode: PlayMode;
  difficulty: Difficulty;
  players: Player[];
  sharedDevice: boolean;
}

export interface InitContext extends SessionMeta {
  items: ContentItem[];
  now: number;
}

/** Effets de bord demandés par un moteur (ex. enregistrer une réponse de référence). */
export type Effect =
  | { type: 'saveWkwAnswer'; itemId: string; player: Player; value: string }
  | { type: 'saveRememberAnswer'; itemId: string; value: string };

export interface ApplyResult<S> {
  state: S;
  effects?: Effect[];
}

export interface GameEngine<S> {
  id: GameId;
  /** Nombre minimal d'éléments de contenu actifs pour lancer une partie. */
  minItems: number;
  init(ctx: InitContext): S;
  apply(state: S, action: GameAction, actor: Player, meta: SessionMeta, now: number): ApplyResult<S>;
  isFinished(state: S): boolean;
  score(state: S, meta: SessionMeta): ScoreResult;
  /** Vue envoyée à un joueur : masque ce qu'il ne doit pas encore voir. */
  view(state: S, viewer: Player, meta: SessionMeta, now: number): S;
}

/* Utilitaires communs aux moteurs */

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Sélection progressive : filtre les éléments autorisés pour la difficulté,
 * mélange à l'intérieur de chaque niveau puis trie du plus simple au plus exigeant.
 */
export function pickProgressive(
  items: ContentItem[],
  allowed: Difficulty[],
  count: number,
): ContentItem[] {
  const pool = items.filter((i) => allowed.includes(i.difficulty));
  const source = pool.length >= Math.min(count, items.length) ? pool : items;
  const byLevel = (['easy', 'medium', 'hard'] as Difficulty[]).map((d) =>
    shuffle(source.filter((i) => i.difficulty === d)),
  );
  // Prend en priorité dans le niveau le plus élevé autorisé pour garder un vrai défi,
  // puis complète avec les autres niveaux.
  const quota = Math.min(count, source.length);
  const chosen: ContentItem[] = [];
  const levels = [...allowed].sort((a, b) => RANK[b] - RANK[a]);
  const perLevel = Math.ceil(quota / Math.max(levels.length, 1));
  for (const lvl of levels) chosen.push(...byLevel[RANK[lvl]].slice(0, perLevel));
  for (const list of byLevel) for (const it of list) if (chosen.length < quota && !chosen.includes(it)) chosen.push(it);
  return chosen.slice(0, quota).sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty]);
}

export function requireActor(actor: Player, expected: Player | Player[], meta: SessionMeta, what: string) {
  if (meta.sharedDevice) return;
  const list = Array.isArray(expected) ? expected : [expected];
  if (!list.includes(actor)) throw new GameError(what, 403);
}

export function str(payload: Record<string, unknown> | undefined, key: string, max = 500): string {
  const v = payload?.[key];
  if (typeof v !== 'string') throw new GameError(`Champ « ${key} » manquant.`);
  return v.trim().slice(0, max);
}

export function optStr(payload: Record<string, unknown> | undefined, key: string, max = 500): string | undefined {
  const v = payload?.[key];
  return typeof v === 'string' ? v.trim().slice(0, max) : undefined;
}

export function oneOf<T extends string>(payload: Record<string, unknown> | undefined, key: string, values: readonly T[]): T {
  const v = payload?.[key];
  if (typeof v !== 'string' || !values.includes(v as T)) throw new GameError(`Valeur invalide pour « ${key} ».`);
  return v as T;
}
