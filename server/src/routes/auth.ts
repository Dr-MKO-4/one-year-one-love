import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { COOKIE_NAME, checkPin, requireAuth, setSessionCookie } from '../lib/auth.js';
import { config } from '../lib/config.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
});

authRouter.post('/login', loginLimiter, (req, res) => {
  const body = z.object({ player: z.enum(['miguel', 'adele']), pin: z.string().min(1).max(12) }).parse(req.body);
  if (!checkPin(body.player, body.pin)) return res.status(401).json({ error: 'Code incorrect.' });
  setSessionCookie(res, body.player);
  res.json({ player: body.player });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax', secure: config.isProd });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ player: req.player });
});
