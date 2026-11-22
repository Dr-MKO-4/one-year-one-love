import type { GameId, Player } from '../../../shared/types.js';
import { GAME_IDS } from '../../../shared/types.js';
import { mean } from '../../../shared/scoring.js';
import { prisma } from './prisma.js';
import { toSummary } from './sessions.js';

/** Tableau de bord (section 7.2). Seules les parties terminées entrent dans les moyennes. */
export async function dashboard() {
  const [all, completed] = await Promise.all([
    prisma.gameSession.groupBy({ by: ['status'], _count: true }),
    prisma.gameSession.findMany({ where: { status: 'completed' }, orderBy: { endedAt: 'asc' } }),
  ]);
  const count = (s: string) => all.find((a) => a.status === s)?._count ?? 0;

  let best: { player: Player; score: number; gameId: string; sessionId: string; date: string } | null = null;
  for (const s of completed) {
    for (const [player, score] of [['miguel', s.scoreMiguel], ['adele', s.scoreAdele]] as const) {
      if (score !== null && (!best || score > best.score)) {
        best = { player, score, gameId: s.gameId, sessionId: s.id, date: (s.endedAt ?? s.startedAt).toISOString() };
      }
    }
  }

  const perGame = GAME_IDS.map((gameId: GameId) => {
    const list = completed.filter((s) => s.gameId === gameId);
    return {
      gameId,
      played: list.length,
      miguel: mean(list.map((s) => s.scoreMiguel)),
      adele: mean(list.map((s) => s.scoreAdele)),
      couple: mean(list.map((s) => s.coupleScore)),
      compatibility: mean(list.map((s) => s.compatibility)),
      best: list.reduce<number | null>((m, s) => {
        const v = Math.max(s.scoreMiguel ?? -1, s.scoreAdele ?? -1, s.coupleScore ?? -1);
        return v >= 0 && (m === null || v > m) ? v : m;
      }, null),
      progression: list.slice(-12).map((s) => ({
        date: (s.endedAt ?? s.startedAt).toISOString(),
        miguel: s.scoreMiguel,
        adele: s.scoreAdele,
        couple: s.coupleScore,
      })),
    };
  });

  return {
    sessionsTotal: all.reduce((a, b) => a + b._count, 0),
    sessionsCompleted: count('completed'),
    sessionsInterrupted: count('interrupted'),
    sessionsInProgress: count('in_progress'),
    gamesFinished: perGame.filter((g) => g.played > 0).length,
    miguel: mean(completed.map((s) => s.scoreMiguel)),
    adele: mean(completed.map((s) => s.scoreAdele)),
    couple: mean(completed.map((s) => s.coupleScore)),
    compatibility: mean(completed.map((s) => s.compatibility)),
    best,
    perGame,
    recent: completed.slice(-8).reverse().map(toSummary),
  };
}
