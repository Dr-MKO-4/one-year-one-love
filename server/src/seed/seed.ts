import type { GameId } from '../../../shared/types.js';
import { prisma } from '../lib/prisma.js';
import {
  COMPLETE_MY_SENTENCE,
  DO_YOU_REMEMBER,
  LETTER,
  LOVE_CHALLENGES,
  MEMORY_OF_US,
  TIMELINE,
  WHO_KNOWS_WHO,
  WOULD_YOU_RATHER,
} from './data.js';

const BANKS: Record<GameId, Array<{ difficulty: string; data: unknown; toConfirm?: boolean }>> = {
  'who-knows-who': WHO_KNOWS_WHO,
  'would-you-rather': WOULD_YOU_RATHER,
  'memory-of-us': MEMORY_OF_US,
  'do-you-remember': DO_YOU_REMEMBER,
  'love-challenges': LOVE_CHALLENGES,
  'complete-my-sentence': COMPLETE_MY_SENTENCE,
};

/**
 * Remplit chaque catégorie vide (jeux, frise, lettre). La playlist vient du dossier musique.
 * Idempotent : ne touche jamais à une catégorie qui contient déjà des données.
 */
export async function seedIfEmpty(log = false) {
  const done: string[] = [];
  for (const [gameId, items] of Object.entries(BANKS)) {
    if ((await prisma.contentItem.count({ where: { gameId } })) > 0) continue;
    await prisma.contentItem.createMany({
      data: items.map((it, i) => ({
        gameId,
        difficulty: it.difficulty,
        data: it.data as never,
        toConfirm: !!it.toConfirm,
        sortOrder: i,
      })),
    });
    done.push(`${gameId} (${items.length})`);
  }
  if ((await prisma.timelineEvent.count()) === 0) {
    await prisma.timelineEvent.createMany({ data: TIMELINE.map((t, i) => ({ ...t, sortOrder: i })) });
    done.push(`frise (${TIMELINE.length})`);
  }
  if (!(await prisma.setting.findUnique({ where: { key: 'letter' } }))) {
    await prisma.setting.create({ data: { key: 'letter', value: LETTER } });
    done.push('lettre');
  }
  if (done.length) console.log(`Contenus initiaux ajoutés : ${done.join(', ')}`);
  else if (log) console.log('Base déjà remplie : aucun contenu initial ajouté.');
}
