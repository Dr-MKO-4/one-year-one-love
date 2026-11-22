import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/http.js';
import { contentInput, contentSchemas, difficulty, gameId } from '../lib/schemas.js';
import { toContentItem } from '../lib/sessions.js';
import type { GameId } from '../../../shared/types.js';

export const contentRouter = Router();

contentRouter.get(
  '/',
  ah(async (req, res) => {
    const g = req.query.gameId ? gameId.parse(req.query.gameId) : undefined;
    const rows = await prisma.contentItem.findMany({
      where: g ? { gameId: g } : undefined,
      orderBy: [{ gameId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(rows.map(toContentItem));
  }),
);

contentRouter.get(
  '/counts',
  ah(async (_req, res) => {
    const rows = await prisma.contentItem.groupBy({ by: ['gameId'], where: { active: true }, _count: true });
    res.json(Object.fromEntries(rows.map((r) => [r.gameId, r._count])));
  }),
);

contentRouter.post(
  '/',
  ah(async (req, res) => {
    const input = contentInput.parse(req.body);
    const data = contentSchemas[input.gameId as GameId].parse(input.data);
    const row = await prisma.contentItem.create({ data: { ...input, data } });
    res.status(201).json(toContentItem(row));
  }),
);

contentRouter.put(
  '/:id',
  ah(async (req, res) => {
    const existing = await prisma.contentItem.findUniqueOrThrow({ where: { id: req.params.id } });
    const input = z
      .object({
        difficulty: difficulty.optional(),
        data: z.unknown().optional(),
        active: z.boolean().optional(),
        toConfirm: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const data = input.data !== undefined ? contentSchemas[existing.gameId as GameId].parse(input.data) : undefined;
    const row = await prisma.contentItem.update({
      where: { id: existing.id },
      data: { ...input, data: data ?? undefined },
    });
    res.json(toContentItem(row));
  }),
);

contentRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.contentItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
