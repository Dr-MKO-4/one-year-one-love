import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah } from '../lib/http.js';
import { actionInput, createSessionInput, gameId } from '../lib/schemas.js';
import { applyAction, createSession, getSession, setStatus, toDTO, toSummary } from '../lib/sessions.js';
import { dashboard } from '../lib/stats.js';

export const sessionsRouter = Router();

sessionsRouter.get(
  '/',
  ah(async (req, res) => {
    const q = z
      .object({
        status: z.enum(['in_progress', 'completed', 'interrupted']).optional(),
        gameId: gameId.optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(req.query);
    const rows = await prisma.gameSession.findMany({
      where: { status: q.status, gameId: q.gameId },
      orderBy: { updatedAt: 'desc' },
      take: q.limit,
    });
    res.json(rows.map(toSummary));
  }),
);

sessionsRouter.post(
  '/',
  ah(async (req, res) => {
    const row = await createSession(createSessionInput.parse(req.body), req.player!);
    res.status(201).json(toDTO(row, req.player!));
  }),
);

sessionsRouter.get(
  '/:id',
  ah(async (req, res) => {
    res.json(toDTO(await getSession(req.params.id), req.player!));
  }),
);

sessionsRouter.post(
  '/:id/actions',
  ah(async (req, res) => {
    const row = await applyAction(req.params.id, actionInput.parse(req.body), req.player!);
    res.json(toDTO(row, req.player!));
  }),
);

sessionsRouter.post(
  '/:id/interrupt',
  ah(async (req, res) => {
    res.json(toDTO(await setStatus(req.params.id, 'interrupted'), req.player!));
  }),
);

sessionsRouter.post(
  '/:id/resume',
  ah(async (req, res) => {
    res.json(toDTO(await setStatus(req.params.id, 'in_progress'), req.player!));
  }),
);

sessionsRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.gameSession.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export const statsRouter = Router();
statsRouter.get(
  '/dashboard',
  ah(async (_req, res) => {
    res.json(await dashboard());
  }),
);
