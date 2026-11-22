import { prisma } from '../lib/prisma.js';
import { LETTER, TIMELINE } from './data.js';

/**
 * Mises à jour de contenu appliquées une seule fois sur une base déjà remplie.
 * Elles ne remplacent que les éléments encore dans leur version d'origine,
 * pour ne jamais écraser une modification faite depuis la configuration.
 */
const VERSION_KEY = 'content-version';

/** Titres de la frise d'origine, dans l'ordre de TIMELINE. */
const OLD_TIMELINE_TITLES = ["La rencontre", "Les premiers messages", "L’anniversaire d’Adèle", "Le début de nous", "L’anniversaire de Miguel", "Notre première Saint-Valentin", "Le rêve de Zanzibar", "Un an depuis la rencontre", "One Year, One Love"];
const OLD_LETTER_START = 'Ce texte est un brouillon';

export async function applyContentUpdates() {
  const current = await prisma.setting.findUnique({ where: { key: VERSION_KEY } });
  const version = typeof current?.value === 'number' ? current.value : 1;
  if (version >= 2) return;

  const done: string[] = [];

  // Version 2 : lettre et frise rédigées par Miguel.
  const letter = await prisma.setting.findUnique({ where: { key: 'letter' } });
  const body = (letter?.value as { body?: string } | null)?.body ?? '';
  if (!letter || body.startsWith(OLD_LETTER_START)) {
    await prisma.setting.upsert({ where: { key: 'letter' }, update: { value: LETTER }, create: { key: 'letter', value: LETTER } });
    done.push('lettre');
  }

  const events = await prisma.timelineEvent.findMany();
  let updated = 0;
  for (const [i, oldTitle] of OLD_TIMELINE_TITLES.entries()) {
    const row = events.find((e) => e.title === oldTitle);
    if (!row) continue;
    const next = TIMELINE[i];
    await prisma.timelineEvent.update({
      where: { id: row.id },
      data: { date: next.date, title: next.title, description: next.description, toConfirm: false },
    });
    updated++;
  }
  if (updated) done.push(`frise (${updated} moments)`);

  await prisma.setting.upsert({ where: { key: VERSION_KEY }, update: { value: 2 }, create: { key: VERSION_KEY, value: 2 } });
  if (done.length) console.log(`Contenus mis à jour : ${done.join(', ')}`);
}
