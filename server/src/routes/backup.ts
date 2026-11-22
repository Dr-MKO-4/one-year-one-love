import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/http.js';

/** Export / import manuel (risque « effacement / perte de l'historique », section 14.1). */
export const backupRouter = Router();

backupRouter.get(
  '/export',
  ah(async (req, res) => {
    const withPhotos = req.query.photos === '1';
    const [content, timeline, settings, sessions, tracks, photos] = await Promise.all([
      prisma.contentItem.findMany(),
      prisma.timelineEvent.findMany(),
      prisma.setting.findMany(),
      prisma.gameSession.findMany(),
      prisma.track.findMany({ select: { id: true, fileName: true, title: true, artist: true, sortOrder: true } }),
      withPhotos ? prisma.photo.findMany() : Promise.resolve([]),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="one-year-one-love_sauvegarde_${stamp}.json"`);
    res.json({
      format: 'one-year-one-love-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      content,
      timeline,
      settings,
      sessions,
      tracks,
      photos: photos.map((p) => ({ ...p, data: Buffer.from(p.data).toString('base64') })),
    });
  }),
);

const backupSchema = z.object({
  format: z.literal('one-year-one-love-backup'),
  version: z.literal(1),
  content: z.array(z.any()).default([]),
  timeline: z.array(z.any()).default([]),
  settings: z.array(z.any()).default([]),
  sessions: z.array(z.any()).default([]),
  tracks: z.array(z.any()).default([]),
  photos: z.array(z.any()).default([]),
});

backupRouter.post(
  '/import',
  express.json({ limit: '200mb' }),
  ah(async (req, res) => {
    const b = backupSchema.parse(req.body);
    const dates = <T extends Record<string, unknown>>(o: T, keys: string[]) => {
      const c: Record<string, unknown> = { ...o };
      for (const k of keys) if (typeof c[k] === 'string') c[k] = new Date(c[k] as string);
      return c;
    };
    await prisma.$transaction(
      async (tx) => {
        for (const c of b.content) {
          const d = dates(c, ['createdAt', 'updatedAt']);
          await tx.contentItem.upsert({ where: { id: c.id }, update: d, create: d as never });
        }
        for (const t of b.timeline) {
          const d = dates(t, ['createdAt', 'updatedAt']);
          await tx.timelineEvent.upsert({ where: { id: t.id }, update: d, create: d as never });
        }
        for (const s of b.settings) {
          await tx.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: { key: s.key, value: s.value } });
        }
        for (const s of b.sessions) {
          const d = dates(s, ['startedAt', 'endedAt', 'updatedAt']);
          await tx.gameSession.upsert({ where: { id: s.id }, update: d, create: d as never });
        }
        // Playlist : seuls titres, artistes et ordre sont restaurés (les fichiers restent dans le dossier musique).
        for (const t of b.tracks) {
          if (typeof t.fileName !== 'string') continue;
          await tx.track.updateMany({ where: { fileName: t.fileName }, data: { title: t.title, artist: t.artist, sortOrder: t.sortOrder } });
        }
        for (const p of b.photos) {
          const d = { ...dates(p, ['createdAt']), data: Buffer.from(p.data, 'base64') };
          await tx.photo.upsert({ where: { id: p.id }, update: d, create: d as never });
        }
      },
      { timeout: 120_000 },
    );
    res.json({
      ok: true,
      imported: {
        content: b.content.length,
        timeline: b.timeline.length,
        settings: b.settings.length,
        sessions: b.sessions.length,
        tracks: b.tracks.length,
        photos: b.photos.length,
      },
    });
  }),
);
