import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import type { Player } from '../../../shared/types.js';
import { COOKIE_NAME, verifyToken } from './auth.js';
import { sync } from './music.js';

let io: Server | null = null;

/** Hook branché par le service des parties pour envoyer l'état d'une partie à un socket qui la rejoint. */
let onJoin: ((sessionId: string, player: Player) => Promise<unknown>) | null = null;
export function setJoinHandler(fn: typeof onJoin) {
  onJoin = fn;
}

export function initRealtime(server: HttpServer) {
  io = new Server(server, { path: '/socket.io', serveClient: false, cors: { origin: false } });

  io.use((socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
    const player = verifyToken(cookies[COOKIE_NAME]);
    if (!player) return next(new Error('unauthorized'));
    socket.data.player = player;
    next();
  });

  io.on('connection', (socket) => {
    const player = socket.data.player as Player;
    socket.join('couple');
    socket.join(`player:${player}`);
    io!.to('couple').emit('presence', { player, online: true });
    sync.attach(socket, player);

    socket.on('session:join', async (sessionId: unknown, ack?: (res: unknown) => void) => {
      if (typeof sessionId !== 'string') return;
      socket.join(`session:${sessionId}`);
      try {
        const dto = onJoin ? await onJoin(sessionId, player) : null;
        ack?.({ ok: true, session: dto });
      } catch (e) {
        ack?.({ ok: false, error: (e as Error).message });
      }
      socket.to(`session:${sessionId}`).emit('session:presence', { player, here: true });
    });

    socket.on('session:leave', (sessionId: unknown) => {
      if (typeof sessionId !== 'string') return;
      socket.leave(`session:${sessionId}`);
      socket.to(`session:${sessionId}`).emit('session:presence', { player, here: false });
    });

    socket.on('presence:who', async (ack?: (res: unknown) => void) => {
      const sockets = await io!.in('couple').fetchSockets();
      ack?.({ online: Array.from(new Set(sockets.map((s) => s.data.player))) });
    });

    socket.on('disconnect', async () => {
      const sockets = await io!.in(`player:${player}`).fetchSockets();
      if (!sockets.length) io!.to('couple').emit('presence', { player, online: false });
      // Musique partagée : pause automatique quand plus personne n'écoute.
      await sync.pauseIfAlone();
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

/** Envoie à chaque socket d'une partie la vue qui lui correspond. */
export async function broadcastSession(sessionId: string, viewFor: (player: Player) => unknown) {
  if (!io) return;
  const sockets = await io.in(`session:${sessionId}`).fetchSockets();
  const cache = new Map<Player, unknown>();
  for (const s of sockets) {
    const p = s.data.player as Player;
    if (!cache.has(p)) cache.set(p, viewFor(p));
    s.emit('session:update', cache.get(p));
  }
}

export function emitToCouple(event: string, payload: unknown) {
  io?.to('couple').emit(event, payload);
}

export function emitToPlayer(player: Player, event: string, payload: unknown) {
  io?.to(`player:${player}`).emit(event, payload);
}
