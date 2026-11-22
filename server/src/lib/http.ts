import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { GameError } from '../games/engine.js';

export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => i.message).join(' · '), issues: err.issues });
  }
  if (err instanceof GameError) return res.status(err.status).json({ error: err.message });
  const e = err as { type?: string; status?: number; message?: string; code?: string };
  if (e?.type === 'entity.too.large') return res.status(413).json({ error: 'Fichier trop volumineux.' });
  if (e?.code === 'P2025') return res.status(404).json({ error: 'Élément introuvable.' });
  console.error(err);
  res.status(500).json({ error: 'Une erreur inattendue est survenue.' });
}
