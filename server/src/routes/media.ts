import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/http.js';
import { photoInput, timelineInput } from '../lib/schemas.js';

/* ---------------------------- Photos ---------------------------- */

export const photosRouter = Router();

photosRouter.get(
  '/',
  ah(async (_req, res) => {
    const rows = await prisma.photo.findMany({
      select: { id: true, width: true, height: true, caption: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  }),
);

photosRouter.post(
  '/',
  ah(async (req, res) => {
    const input = photoInput.parse(req.body);
    const [head, b64] = input.dataUrl.split(',');
    const mime = head.slice(5, head.indexOf(';'));
    const data = Buffer.from(b64, 'base64');
    if (data.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'Photo trop volumineuse (6 Mo max).' });
    const row = await prisma.photo.create({
      data: { mime, data, width: input.width, height: input.height, caption: input.caption },
      select: { id: true, width: true, height: true, caption: true, createdAt: true },
    });
    res.status(201).json(row);
  }),
);

photosRouter.get(
  '/:id',
  ah(async (req, res) => {
    const row = await prisma.photo.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).end();
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(row.data);
  }),
);

photosRouter.patch(
  '/:id',
  ah(async (req, res) => {
    const { caption } = z.object({ caption: z.string().max(200).nullable() }).parse(req.body);
    await prisma.photo.update({ where: { id: req.params.id }, data: { caption } });
    res.json({ ok: true });
  }),
);

photosRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.photo.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

/* ---------------------------- Frise ----------------------------- */

export const timelineRouter = Router();

timelineRouter.get(
  '/',
  ah(async (_req, res) => {
    res.json(await prisma.timelineEvent.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
  }),
);
timelineRouter.post(
  '/',
  ah(async (req, res) => {
    res.status(201).json(await prisma.timelineEvent.create({ data: timelineInput.parse(req.body) }));
  }),
);
timelineRouter.put(
  '/:id',
  ah(async (req, res) => {
    res.json(await prisma.timelineEvent.update({ where: { id: req.params.id }, data: timelineInput.partial().parse(req.body) }));
  }),
);
timelineRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.timelineEvent.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

/* --------------------------- Réglages --------------------------- */

export const settingsRouter = Router();
const SETTING_KEYS = z.enum(['letter', 'home']);

settingsRouter.get(
  '/:key',
  ah(async (req, res) => {
    const key = SETTING_KEYS.parse(req.params.key);
    const row = await prisma.setting.findUnique({ where: { key } });
    res.json(row?.value ?? null);
  }),
);
settingsRouter.put(
  '/:key',
  ah(async (req, res) => {
    const key = SETTING_KEYS.parse(req.params.key);
    const value = z.record(z.unknown()).parse(req.body);
    const row = await prisma.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });
    res.json(row.value);
  }),
);
