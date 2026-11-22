import fs from 'node:fs/promises';
import path from 'node:path';
import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/http.js';
import { MUSIC_DIR, safeFileName, scanLibrary, sync } from '../lib/music.js';

export const tracksRouter = Router();

const select = { id: true, fileName: true, title: true, artist: true, sortOrder: true, durationSec: true, sizeBytes: true } as const;

tracksRouter.get(
  '/',
  ah(async (_req, res) => {
    res.json(await prisma.track.findMany({ select, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
  }),
);

/** État de lecture partagé (utile au premier chargement, avant le socket). */
tracksRouter.get('/state', (_req, res) => {
  res.json(sync.snapshot());
});

/** Relit le dossier (après avoir déposé des fichiers directement sur le volume). */
tracksRouter.post(
  '/rescan',
  ah(async (_req, res) => {
    await scanLibrary();
    res.json(await prisma.track.findMany({ select, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
  }),
);

tracksRouter.put(
  '/:id',
  ah(async (req, res) => {
    const body = z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        artist: z.string().trim().min(1).max(120).optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const row = await prisma.track.update({ where: { id: req.params.id }, data: body, select });
    await sync.onLibraryChanged();
    res.json(row);
  }),
);

/** Ajoute un fichier audio dans le dossier musique (corps = octets bruts, ?name=nom-du-fichier.mp3). */
tracksRouter.post(
  '/upload',
  express.raw({ type: () => true, limit: '40mb' }),
  ah(async (req, res) => {
    const name = safeFileName(String(req.query.name ?? ''));
    if (!name) return res.status(400).json({ error: 'Format non pris en charge (mp3, m4a, aac, ogg, opus, wav ou flac).' });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Fichier vide.' });
    await fs.mkdir(MUSIC_DIR, { recursive: true });
    await fs.writeFile(path.join(MUSIC_DIR, name), req.body);
    await scanLibrary();
    const row = await prisma.track.findUnique({ where: { fileName: name }, select });
    res.status(201).json(row);
  }),
);

/** Retire un titre : supprime le fichier du dossier musique. */
tracksRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const t = await prisma.track.findUniqueOrThrow({ where: { id: req.params.id } });
    await fs.rm(path.join(MUSIC_DIR, path.basename(t.fileName)), { force: true });
    await scanLibrary();
    res.json({ ok: true });
  }),
);

/** Lecture en streaming (Express gère les requêtes Range pour l'avance rapide et iOS). */
tracksRouter.get(
  '/:id/audio',
  ah(async (req, res) => {
    const t = await prisma.track.findUnique({ where: { id: req.params.id }, select: { fileName: true, mime: true } });
    if (!t) return res.status(404).end();
    res.sendFile(path.basename(t.fileName), {
      root: MUSIC_DIR,
      headers: { 'Content-Type': t.mime ?? 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' },
      dotfiles: 'deny',
    });
  }),
);
