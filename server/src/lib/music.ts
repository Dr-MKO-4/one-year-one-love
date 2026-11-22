import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFile } from 'music-metadata';
import type { Server, Socket } from 'socket.io';
import type { Player } from '../../../shared/types.js';
import type { MusicCommand, MusicState } from '../../../shared/music.js';
import { prisma } from './prisma.js';

/* ------------------------------------------------------------------ */
/* Bibliothèque : le dossier MUSIC_DIR fait foi                         */
/* ------------------------------------------------------------------ */

/** Racine du monorepo (dossier qui contient server/ et client/), quel que soit l'emplacement du fichier compilé. */
function projectRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, 'server')) && existsSync(path.join(dir, 'client'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** En local : dossier music/ à la racine du projet. Sur Railway : volume monté (MUSIC_DIR=/music). */
export const MUSIC_DIR = path.resolve(process.env.MUSIC_DIR || path.join(projectRoot(), 'music'));

export const AUDIO_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
};

/** Titres connus du dossier fourni : noms propres et ordre de la playlist. */
const KNOWN: Array<{ match: RegExp; title: string; artist: string }> = [
  { match: /se.?orita/i, title: 'Señorita', artist: 'Shawn Mendes & Camila Cabello' },
  { match: /ordinary.*wedding/i, title: 'Ordinary (Wedding Version)', artist: 'Alex Warren' },
  { match: /7_years/i, title: '7 Years', artist: 'Lukas Graham' },
  { match: /la_nocturne/i, title: 'La Nocturne', artist: 'Tiakola & Theodora' },
  { match: /all_of_me/i, title: 'All of Me', artist: 'John Legend' },
  { match: /perfect/i, title: 'Perfect', artist: 'Ed Sheeran' },
  { match: /picasso/i, title: 'Picasso', artist: 'Bigflo & Oli' },
  { match: /talking_to_the_moon/i, title: 'Talking to the Moon', artist: 'Bruno Mars' },
  { match: /until_i_found_you/i, title: 'Until I Found You', artist: 'Stephen Sanchez' },
  { match: /when_i_was_your_man/i, title: 'When I Was Your Man', artist: 'Bruno Mars' },
  { match: /bad_liar/i, title: 'Bad Liar', artist: 'Imagine Dragons' },
  { match: /say_you_won_t_let_go/i, title: 'Say You Won’t Let Go', artist: 'James Arthur' },
  { match: /someone_you_loved/i, title: 'Someone You Loved', artist: 'Lewis Capaldi' },
  { match: /story_of_my_life/i, title: 'Story of My Life', artist: 'One Direction' },
];

/** Déduit titre et artiste d'un nom de fichier du type "Artiste_-_Titre__(Official_Video)(256k).mp3". */
export function guessMeta(fileName: string): { title: string; artist: string; order: number } {
  const known = KNOWN.findIndex((k) => k.match.test(fileName));
  if (known >= 0) return { title: KNOWN[known].title, artist: KNOWN[known].artist, order: known };
  const base = path.parse(fileName).name;
  const clean = (s: string) =>
    s
      .replace(/\(\d+k\)/gi, '')
      .replace(/[[(]?(official|lyrics?|paroles|audio|video|clip|music|track\d*)[^\])]*[\])]?/gi, '')
      .replace(/___/g, ' & ')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const [artist, ...rest] = base.split(/_-_| - /);
  return rest.length
    ? { artist: clean(artist) || 'Artiste inconnu', title: clean(rest.join(' ')) || base, order: 1000 }
    : { artist: 'Artiste inconnu', title: clean(base) || base, order: 1000 };
}

let scanning: Promise<unknown> | null = null;

/** Synchronise la table Track avec le contenu du dossier (ajouts, retraits, durées). */
export function scanLibrary() {
  scanning ??= (async () => {
    try {
      await fs.mkdir(MUSIC_DIR, { recursive: true });
      const entries = await fs.readdir(MUSIC_DIR, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && AUDIO_EXT[path.extname(e.name).toLowerCase()]).map((e) => e.name);
      const existing = await prisma.track.findMany();
      const byFile = new Map(existing.map((t) => [t.fileName, t]));

      // Fichiers disparus : retirés de la playlist.
      const gone = existing.filter((t) => !files.includes(t.fileName));
      if (gone.length) await prisma.track.deleteMany({ where: { id: { in: gone.map((t) => t.id) } } });

      let nextOrder = Math.max(0, ...existing.filter((t) => files.includes(t.fileName)).map((t) => t.sortOrder + 1));
      for (const fileName of files) {
        const full = path.join(MUSIC_DIR, fileName);
        const stat = await fs.stat(full);
        const known = byFile.get(fileName);
        if (known && known.sizeBytes === stat.size && known.durationSec) continue;
        let durationSec: number | null = null;
        try {
          durationSec = (await parseFile(full, { duration: true })).format.duration ?? null;
        } catch {
          /* fichier illisible : gardé sans durée */
        }
        const mime = AUDIO_EXT[path.extname(fileName).toLowerCase()];
        if (known) {
          await prisma.track.update({ where: { id: known.id }, data: { durationSec, sizeBytes: stat.size, mime } });
        } else {
          const meta = guessMeta(fileName);
          await prisma.track.create({
            data: {
              fileName,
              title: meta.title,
              artist: meta.artist,
              sortOrder: meta.order < 1000 ? meta.order : nextOrder++ + 1000,
              durationSec,
              sizeBytes: stat.size,
              mime,
            },
          });
        }
      }
      const count = await prisma.track.count();
      console.log(`Musique : ${count} titre(s) dans ${MUSIC_DIR}`);
      await sync.onLibraryChanged();
    } catch (e) {
      console.error('Lecture du dossier musique impossible :', (e as Error).message);
    } finally {
      scanning = null;
    }
  })();
  return scanning;
}

/** Nom de fichier sûr (pas de chemin, pas de caractères réservés). */
export function safeFileName(name: string): string | null {
  const base = path.basename(name).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim();
  if (!base || base.startsWith('.') || !AUDIO_EXT[path.extname(base).toLowerCase()]) return null;
  return base.slice(0, 180);
}

/* ------------------------------------------------------------------ */
/* Lecture partagée : un seul état pour le couple, piloté par le serveur */
/* ------------------------------------------------------------------ */

const SETTING_KEY = 'music';

class MusicSync {
  private io: Server | null = null;
  private state: MusicState = {
    trackId: null,
    playing: false,
    position: 0,
    anchorAt: Date.now(),
    shuffle: false,
    updatedBy: null,
    version: 0,
  };
  private endTimer: NodeJS.Timeout | null = null;
  private history: string[] = [];

  async init(io: Server) {
    this.io = io;
    const saved = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (saved) this.state = { ...this.state, ...(saved.value as Partial<MusicState>), playing: false, anchorAt: Date.now() };
  }

  /** Position actuelle (secondes) en tenant compte du temps écoulé. */
  private positionNow(now = Date.now()) {
    const s = this.state;
    return s.playing ? s.position + (now - s.anchorAt) / 1000 : s.position;
  }

  snapshot() {
    return { ...this.state, serverNow: Date.now() };
  }

  private async tracks() {
    return prisma.track.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, durationSec: true } });
  }

  private async commit(patch: Partial<MusicState>, by: Player | null) {
    this.state = { ...this.state, ...patch, updatedBy: by, version: this.state.version + 1 };
    this.io?.to('couple').emit('music:state', this.snapshot());
    this.scheduleEnd();
    const { playing: _p, ...persist } = this.state;
    await prisma.setting
      .upsert({ where: { key: SETTING_KEY }, update: { value: persist as never }, create: { key: SETTING_KEY, value: persist as never } })
      .catch(() => undefined);
  }

  /** Enchaîne automatiquement au titre suivant à la fin du titre en cours. */
  private async scheduleEnd() {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    if (!this.state.playing || !this.state.trackId) return;
    const track = await prisma.track.findUnique({ where: { id: this.state.trackId }, select: { durationSec: true } });
    if (!track?.durationSec) return;
    const left = (track.durationSec - this.positionNow()) * 1000;
    const version = this.state.version;
    this.endTimer = setTimeout(() => {
      if (this.state.version === version) this.step(1, null, true);
    }, Math.max(0, left) + 250);
  }

  private async step(dir: 1 | -1, by: Player | null, auto = false) {
    const list = await this.tracks();
    if (!list.length) return this.commit({ trackId: null, playing: false, position: 0, anchorAt: Date.now() }, by);
    const idx = list.findIndex((t) => t.id === this.state.trackId);
    let next: string;
    if (dir === -1 && this.history.length) {
      next = this.history.pop()!;
    } else if (this.state.shuffle && list.length > 1) {
      const others = list.filter((t) => t.id !== this.state.trackId);
      next = others[Math.floor(Math.random() * others.length)].id;
    } else {
      next = list[(idx + dir + list.length) % list.length].id;
    }
    if (dir === 1 && this.state.trackId) this.history = [...this.history.slice(-30), this.state.trackId];
    await this.commit({ trackId: next, position: 0, anchorAt: Date.now(), playing: auto ? true : this.state.playing || dir === 1 }, by);
  }

  async command(cmd: MusicCommand, by: Player) {
    const now = Date.now();
    switch (cmd.type) {
      case 'play': {
        if (!this.state.trackId) {
          const first = (await this.tracks())[0];
          if (!first) return;
          return this.commit({ trackId: first.id, playing: true, position: 0, anchorAt: now }, by);
        }
        return this.commit({ playing: true, position: this.positionNow(now), anchorAt: now }, by);
      }
      case 'pause':
        return this.commit({ playing: false, position: this.positionNow(now), anchorAt: now }, by);
      case 'next':
        return this.step(1, by);
      case 'prev':
        if (this.positionNow(now) > 4) return this.commit({ position: 0, anchorAt: now }, by);
        return this.step(-1, by);
      case 'seek':
        return this.commit({ position: Math.max(0, Number(cmd.position) || 0), anchorAt: now }, by);
      case 'select': {
        const t = await prisma.track.findUnique({ where: { id: String(cmd.trackId) } });
        if (!t) return;
        if (this.state.trackId && this.state.trackId !== t.id) this.history = [...this.history.slice(-30), this.state.trackId];
        return this.commit({ trackId: t.id, playing: true, position: 0, anchorAt: now }, by);
      }
      case 'shuffle':
        return this.commit({ shuffle: !this.state.shuffle, position: this.positionNow(now), anchorAt: now }, by);
      case 'ended': {
        // Filet de sécurité si la durée lue côté serveur est imprécise.
        if (cmd.trackId === this.state.trackId && this.state.playing) return this.step(1, null, true);
        return;
      }
    }
  }

  /** Pause automatique quand plus personne n'est connecté. */
  async pauseIfAlone() {
    if (!this.io || !this.state.playing) return;
    const sockets = await this.io.in('couple').fetchSockets();
    if (sockets.length === 0) await this.commit({ playing: false, position: this.positionNow(), anchorAt: Date.now() }, null);
  }

  async onLibraryChanged() {
    const list = await this.tracks();
    if (this.state.trackId && !list.some((t) => t.id === this.state.trackId)) {
      await this.commit({ trackId: list[0]?.id ?? null, playing: false, position: 0, anchorAt: Date.now() }, null);
    }
    this.io?.to('couple').emit('music:library');
  }

  attach(socket: Socket, player: Player) {
    socket.emit('music:state', this.snapshot());
    socket.on('music:cmd', (cmd: MusicCommand) => {
      if (!cmd || typeof cmd.type !== 'string') return;
      this.command(cmd, player).catch((e) => console.error('music:cmd', e));
    });
    socket.on('music:sync', (ack?: (s: unknown) => void) => ack?.(this.snapshot()));
  }
}

export const sync = new MusicSync();
