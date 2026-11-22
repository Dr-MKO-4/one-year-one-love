import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './lib/config.js';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './lib/auth.js';
import { errorHandler } from './lib/http.js';
import { initRealtime } from './lib/realtime.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { photosRouter, settingsRouter, timelineRouter } from './routes/media.js';
import { tracksRouter } from './routes/tracks.js';
import { scanLibrary, sync } from './lib/music.js';
import { sessionsRouter, statsRouter } from './routes/sessions.js';
import { backupRouter } from './routes/backup.js';
import { seedIfEmpty } from './seed/seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

const app = express();
app.set('trust proxy', 1); // Railway place l'application derrière un proxy HTTPS.
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
// Site privé : jamais indexé par les moteurs de recherche.
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex');
  next();
});
app.use(compression({ filter: (req, res) => !req.path.endsWith('/audio') && !req.path.endsWith('/upload') && compression.filter(req, res) }));
app.use(cookieParser());
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));

app.use('/api/auth', authRouter);
app.use('/api/content', requireAuth, contentRouter);
app.use('/api/photos', requireAuth, photosRouter);
app.use('/api/timeline', requireAuth, timelineRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/tracks', requireAuth, tracksRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/backup', requireAuth, backupRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));

// Front React compilé (production / image Docker).
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, file) => {
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

const server = http.createServer(app);
const io = initRealtime(server);

async function main() {
  await prisma.$connect();
  await seedIfEmpty();
  await sync.init(io);
  await scanLibrary();
  server.listen(config.port, () => {
    console.log(`One Year, One Love : serveur prêt sur http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error('Échec du démarrage :', e);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
