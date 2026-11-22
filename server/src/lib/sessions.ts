import type { GameSession, ContentItem as ContentRow, Prisma } from '@prisma/client';
import type {
  ContentItem,
  CreateSessionInput,
  Difficulty,
  GameAction,
  GameId,
  PlayMode,
  Player,
  SessionDTO,
  SessionStatus,
  WkwData,
  RememberData,
} from '../../../shared/types.js';
import { GAMES, PLAYER_NAMES, otherPlayer } from '../../../shared/types.js';
import { ENGINES, GameError } from '../games/index.js';
import type { Effect, SessionMeta } from '../games/engine.js';
import { prisma } from './prisma.js';
import { broadcastSession, emitToCouple, emitToPlayer, setJoinHandler } from './realtime.js';

export function toContentItem(row: ContentRow): ContentItem {
  return {
    id: row.id,
    gameId: row.gameId as GameId,
    difficulty: row.difficulty as Difficulty,
    data: row.data as never,
    active: row.active,
    toConfirm: row.toConfirm,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function metaOf(row: GameSession): SessionMeta {
  return {
    mode: row.mode as PlayMode,
    difficulty: row.difficulty as Difficulty,
    players: row.players as Player[],
    sharedDevice: row.sharedDevice,
  };
}

export function toDTO(row: GameSession, viewer: Player): SessionDTO {
  const engine = ENGINES[row.gameId as GameId];
  const meta = metaOf(row);
  return {
    id: row.id,
    gameId: row.gameId as GameId,
    mode: meta.mode,
    difficulty: meta.difficulty,
    players: meta.players,
    sharedDevice: row.sharedDevice,
    state: engine.view(row.state, viewer, meta, Date.now()),
    status: row.status as SessionStatus,
    scores: { miguel: row.scoreMiguel, adele: row.scoreAdele },
    coupleScore: row.coupleScore,
    compatibility: row.compatibility,
    version: row.version,
    createdBy: row.createdBy as Player,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    serverNow: Date.now(),
  };
}

/** Résumé léger pour les listes (historique, parties en cours). */
export function toSummary(row: GameSession) {
  return {
    id: row.id,
    gameId: row.gameId,
    mode: row.mode,
    difficulty: row.difficulty,
    players: row.players,
    sharedDevice: row.sharedDevice,
    status: row.status,
    scores: { miguel: row.scoreMiguel, adele: row.scoreAdele },
    coupleScore: row.coupleScore,
    compatibility: row.compatibility,
    createdBy: row.createdBy,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSession(id: string): Promise<GameSession> {
  const row = await prisma.gameSession.findUnique({ where: { id } });
  if (!row) throw new GameError('Partie introuvable.', 404);
  return row;
}

export async function createSession(input: CreateSessionInput, creator: Player): Promise<GameSession> {
  const engine = ENGINES[input.gameId];
  const meta = GAMES[input.gameId];
  if (!meta.modes.includes(input.mode)) throw new GameError('Mode de jeu non disponible pour ce jeu.');
  const players = Array.from(new Set(input.players)) as Player[];
  if (input.mode === 'solo' && players.length !== 1) throw new GameError('Le mode solo se joue à un seul joueur.');
  if (input.mode !== 'solo' && players.length !== 2) throw new GameError('Ce mode se joue à deux.');
  if (!input.sharedDevice && !players.includes(creator)) throw new GameError('Tu dois faire partie des joueurs.');

  const rows = await prisma.contentItem.findMany({
    where: { gameId: input.gameId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (rows.length < engine.minItems) {
    throw new GameError(`Il faut au moins ${engine.minItems} éléments actifs pour ce jeu. Ajoutez-en dans la configuration.`);
  }
  const state = engine.init({
    items: rows.map(toContentItem),
    difficulty: input.difficulty,
    mode: input.mode,
    players,
    sharedDevice: input.sharedDevice,
    now: Date.now(),
  });

  const row = await prisma.gameSession.create({
    data: {
      gameId: input.gameId,
      mode: input.mode,
      difficulty: input.difficulty,
      players,
      sharedDevice: input.sharedDevice,
      state: state as Prisma.InputJsonValue,
      createdBy: creator,
    },
  });

  emitToCouple('sessions:changed', { id: row.id });
  if (!input.sharedDevice && players.includes(otherPlayer(creator))) {
    emitToPlayer(otherPlayer(creator), 'session:invite', {
      id: row.id,
      gameId: row.gameId,
      from: creator,
      message: `${PLAYER_NAMES[creator]} t’invite à jouer à ${meta.title}`,
    });
  }
  return row;
}

async function runEffects(effects: Effect[] | undefined) {
  if (!effects?.length) return;
  for (const e of effects) {
    const item = await prisma.contentItem.findUnique({ where: { id: e.itemId } });
    if (!item) continue;
    if (e.type === 'saveWkwAnswer') {
      const data = item.data as unknown as WkwData;
      const answers = { ...(data.answers ?? {}), [e.player]: e.value };
      await prisma.contentItem.update({ where: { id: item.id }, data: { data: { ...data, answers } as never } });
    } else if (e.type === 'saveRememberAnswer') {
      const data = item.data as unknown as RememberData;
      await prisma.contentItem.update({ where: { id: item.id }, data: { data: { ...data, answer: e.value } as never } });
    }
  }
}

export async function applyAction(id: string, action: GameAction, authPlayer: Player): Promise<GameSession> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await getSession(id);
    if (row.status !== 'in_progress') throw new GameError('Cette partie n’est plus en cours.', 409);
    const meta = metaOf(row);
    const actor: Player = row.sharedDevice ? (action.as ?? authPlayer) : authPlayer;
    if (!row.sharedDevice && !meta.players.includes(actor)) throw new GameError('Tu ne participes pas à cette partie.', 403);

    const engine = ENGINES[row.gameId as GameId];
    const now = Date.now();
    const { state, effects } = engine.apply(row.state, action, actor, meta, now);
    const finished = engine.isFinished(state);
    const scores = finished ? engine.score(state, meta) : null;

    const updated = await prisma.gameSession.updateMany({
      where: { id, version: row.version },
      data: {
        state: state as Prisma.InputJsonValue,
        version: { increment: 1 },
        ...(finished && scores
          ? {
              status: 'completed',
              endedAt: new Date(now),
              scoreMiguel: scores.miguel,
              scoreAdele: scores.adele,
              coupleScore: scores.couple,
              compatibility: scores.compatibility,
            }
          : {}),
      },
    });
    if (updated.count === 0) continue; // Action concurrente : on recommence avec l'état à jour.

    await runEffects(effects);
    const fresh = await getSession(id);
    await broadcastSession(id, (p) => toDTO(fresh, p));
    if (finished) emitToCouple('sessions:changed', { id });
    return fresh;
  }
  throw new GameError('Trop d’actions simultanées, réessaie.', 409);
}

export async function setStatus(id: string, status: 'interrupted' | 'in_progress'): Promise<GameSession> {
  const row = await getSession(id);
  if (row.status === 'completed') throw new GameError('Cette partie est déjà terminée.', 409);
  const fresh = await prisma.gameSession.update({
    where: { id },
    data: { status, version: { increment: 1 }, endedAt: status === 'interrupted' ? new Date() : null },
  });
  await broadcastSession(id, (p) => toDTO(fresh, p));
  emitToCouple('sessions:changed', { id });
  return fresh;
}

setJoinHandler(async (sessionId, player) => toDTO(await getSession(sessionId), player));
