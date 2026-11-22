import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { Player } from '../../../shared/types.js';
import { config } from './config.js';

export const COOKIE_NAME = 'oyol_session';

export function checkPin(player: Player, pin: string): boolean {
  const expected = Buffer.from(config.pins[player]);
  const given = Buffer.from(pin);
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

export function signToken(player: Player): string {
  return jwt.sign({ player }, config.jwtSecret, { expiresIn: `${config.sessionDays}d` });
}

export function verifyToken(token: string | undefined): Player | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { player?: string };
    return payload.player === 'miguel' || payload.player === 'adele' ? payload.player : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, player: Player) {
  res.cookie(COOKIE_NAME, signToken(player), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionDays * 24 * 3600 * 1000,
    path: '/',
  });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      player?: Player;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const player = verifyToken(req.cookies?.[COOKIE_NAME]);
  if (!player) return res.status(401).json({ error: 'Connexion requise.' });
  req.player = player;
  next();
}
