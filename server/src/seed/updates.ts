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
  if (version >= 3) return;
  const done: string[] = [];
  if (version < 2) {

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
  }

  // Version 3 : jeux alignés sur la lettre et la frise (Kribi, 4 décembre, Caliste, Ursule).
  const items = await prisma.contentItem.findMany({ where: { gameId: { in: ['memory-of-us', 'do-you-remember'] } } });
  let fixed = 0;
  for (const it of items) {
    const d = it.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    let next: Record<string, unknown> | null = null;
    let toConfirm = it.toConfirm;
    if (it.gameId === 'memory-of-us') {
      if (d.left?.value === 'Zanzibar') next = { ...d, left: { kind: 'place', value: 'Kribi' }, right: { kind: 'memory', value: 'Le week-end dont on rêve' } };
      else if (d.left?.value === 'Début décembre') next = { ...d, left: { kind: 'date', value: '4 décembre' } };
      if (next || ['Ursule', '22 mars 2025', '22 novembre 2025', '16 avril', '14 février 2026', '22 novembre 2026'].includes(d.left?.value)) toConfirm = false;
    } else {
      if (d.text === 'Quelle destination de voyage avons-nous évoquée en février 2026 ?' && d.answer === 'Zanzibar') {
        next = { ...d, text: 'Où rêvons-nous de partir en week-end à deux ?', choices: ['Kribi', 'Limbé', 'Zanzibar', 'Dakar'], answer: 'Kribi' };
      }
      if (d.text === 'Quand tombe l’anniversaire de Miguel ?' || d.text === 'Quel surnom Miguel donne-t-il le plus souvent à Adèle ?' || d.text?.startsWith('Quel jour nous sommes-nous') || d.text?.startsWith('Quelle date célébrons') || d.text?.startsWith('Quel jour est l’anniversaire')) toConfirm = false;
    }
    if (next || toConfirm !== it.toConfirm) {
      await prisma.contentItem.update({ where: { id: it.id }, data: { ...(next ? { data: next as never } : {}), toConfirm } });
      fixed++;
    }
  }
  const hasCaliste = items.some((i) => (i.data as { text?: string }).text === 'Qui nous a présentés ?');
  if (!hasCaliste && items.some((i) => i.gameId === 'do-you-remember')) {
    await prisma.contentItem.create({
      data: { gameId: 'do-you-remember', difficulty: 'easy', data: { text: 'Qui nous a présentés ?', kind: 'free', answer: 'Caliste', keywords: ['Caliste'] }, sortOrder: 99 },
    });
    fixed++;
  }
  if (fixed) done.push(`jeux (${fixed} éléments)`);

  await prisma.setting.upsert({ where: { key: VERSION_KEY }, update: { value: 3 }, create: { key: VERSION_KEY, value: 3 } });
  if (done.length) console.log(`Contenus mis à jour : ${done.join(', ')}`);
}

/**
 * En local uniquement : charge les fichiers personnels du dossier private/ (exclu de git),
 * si la base ne les contient pas encore. En ligne, on passe par Configuration > Sauvegarde.
 */
export async function importPrivateFiles() {
  const { existsSync, readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6 && !existsSync(path.join(dir, 'private')); i++) dir = path.dirname(dir);
  const priv = path.join(dir, 'private');
  if (!existsSync(priv)) return;

  const done: string[] = [];
  const msgFile = path.join(priv, 'messages.json');
  if (existsSync(msgFile) && !(await prisma.setting.findUnique({ where: { key: 'messages' } }))) {
    await prisma.setting.create({ data: { key: 'messages', value: JSON.parse(readFileSync(msgFile, 'utf8')) } });
    done.push('messages');
  }
  const sigFile = path.join(priv, 'signature.png');
  const letter = await prisma.setting.findUnique({ where: { key: 'letter' } });
  const value = (letter?.value ?? {}) as Record<string, unknown>;
  if (existsSync(sigFile) && letter && !value.signatureImage) {
    const signatureImage = `data:image/png;base64,${readFileSync(sigFile).toString('base64')}`;
    await prisma.setting.update({ where: { key: 'letter' }, data: { value: { ...value, signatureImage } as never } });
    done.push('signature');
  }
  if (done.length) console.log(`Fichiers privés chargés : ${done.join(', ')}`);
}
