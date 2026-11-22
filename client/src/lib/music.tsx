import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MusicCommand, MusicSnapshot, TrackDTO } from '@shared/music';
import { PLAYER_NAMES, type Player } from '@shared/types';
import { api, audioUrl } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useToast } from './toast';

/**
 * Lecteur partagé : le serveur détient l'état (titre, lecture, position).
 * Chaque appareil suit cet état ; seuls le volume et la sourdine sont locaux.
 */
interface MusicCtx {
  tracks: TrackDTO[];
  current: TrackDTO | null;
  /** Lecture en cours pour le couple (état partagé). */
  playing: boolean;
  /** Le navigateur attend un toucher pour lancer le son sur cet appareil. */
  blocked: boolean;
  shuffle: boolean;
  updatedBy: Player | null;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  select: (trackId: string) => void;
  toggleShuffle: () => void;
  unblock: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  reload: () => Promise<void>;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const Ctx = createContext<MusicCtx | null>(null);
const DRIFT_TOLERANCE = 0.75;

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`oyol:${key}`);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`oyol:${key}`, JSON.stringify(value));
    } catch {
      /* stockage indisponible : préférence non mémorisée */
    }
  },
};

export function MusicProvider({ children, enabled, me }: { children: ReactNode; enabled: boolean; me: Player | null }) {
  const toast = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<TrackDTO[]>([]);
  const [shared, setShared] = useState<MusicSnapshot | null>(null);
  const sharedRef = useRef<MusicSnapshot | null>(null);
  const offsetRef = useRef(0);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(() => store.get('volume', 0.7));
  const [muted, setMuted] = useState(() => store.get('muted', false));
  const [sheetOpen, setSheetOpen] = useState(false);
  const tracksRef = useRef<TrackDTO[]>([]);
  tracksRef.current = tracks;

  const reload = useCallback(async () => {
    setTracks(await api.tracks().catch(() => []));
  }, []);

  /** Position cible selon l'état partagé et l'horloge du serveur. */
  const targetPosition = (s: MusicSnapshot) => (s.playing ? s.position + (Date.now() + offsetRef.current - s.anchorAt) / 1000 : s.position);

  /** Aligne l'élément audio local sur l'état partagé. */
  const apply = useCallback((s: MusicSnapshot) => {
    const a = audioRef.current;
    if (!a) return;
    if (!s.trackId) {
      a.pause();
      return;
    }
    const src = audioUrl(s.trackId);
    const align = () => {
      const target = targetPosition(s);
      if (Number.isFinite(target) && Math.abs(a.currentTime - target) > DRIFT_TOLERANCE) {
        try {
          a.currentTime = Math.max(0, target);
        } catch {
          /* métadonnées pas encore chargées */
        }
      }
      if (s.playing && a.paused) {
        a.play()
          .then(() => setBlocked(false))
          .catch(() => setBlocked(true));
      } else if (!s.playing && !a.paused) {
        a.pause();
      }
    };
    if (!a.src.endsWith(src)) {
      a.src = src;
      a.addEventListener('loadedmetadata', align, { once: true });
      a.load();
      if (s.playing) a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      align();
    }
  }, []);

  // Élément audio unique pour toute l'application.
  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    audioRef.current = a;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnded = () => {
      const s = sharedRef.current;
      if (s?.trackId) getSocket().emit('music:cmd', { type: 'ended', trackId: s.trackId } satisfies MusicCommand);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnded);
    return () => {
      a.pause();
      a.removeAttribute('src');
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    store.set('volume', volume);
    store.set('muted', muted);
  }, [volume, muted]);

  // Abonnement à l'état partagé.
  useEffect(() => {
    if (!enabled) {
      audioRef.current?.pause();
      setTracks([]);
      setShared(null);
      return;
    }
    reload();
    const socket = getSocket();
    const onState = (s: MusicSnapshot) => {
      offsetRef.current = s.serverNow - Date.now();
      const prev = sharedRef.current;
      sharedRef.current = s;
      setShared(s);
      apply(s);
      if (prev && s.updatedBy && s.updatedBy !== me && prev.version !== s.version) {
        const t = tracksRef.current.find((x) => x.id === s.trackId);
        const who = PLAYER_NAMES[s.updatedBy];
        if (prev.trackId !== s.trackId && t) toast(`${who} a mis « ${t.title} »`, 'love');
        else if (prev.playing && !s.playing) toast(`${who} a mis la musique en pause`, 'info');
        else if (!prev.playing && s.playing) toast(`${who} a relancé la musique`, 'love');
      }
    };
    const onLibrary = () => reload();
    const resync = () => socket.emit('music:sync', (s: MusicSnapshot) => onState(s));
    socket.on('music:state', onState);
    socket.on('music:library', onLibrary);
    socket.on('connect', resync);
    if (socket.connected) resync();
    return () => {
      socket.off('music:state', onState);
      socket.off('music:library', onLibrary);
      socket.off('connect', resync);
    };
  }, [enabled, me, reload, apply, toast]);

  // Recalage régulier (dérive d'horloge, mise en veille, réseau lent).
  useEffect(() => {
    if (!shared?.playing) return;
    const t = setInterval(() => sharedRef.current && apply(sharedRef.current), 4000);
    return () => clearInterval(t);
  }, [shared?.playing, apply]);

  // Retour au premier plan : on se recale immédiatement.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && sharedRef.current && apply(sharedRef.current);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [apply]);

  // Premier toucher sur la page : débloque le son si la musique tourne déjà chez l'autre.
  useEffect(() => {
    if (!blocked) return;
    const unlock = () => sharedRef.current && apply(sharedRef.current);
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [blocked, apply]);

  const send = useCallback((cmd: MusicCommand) => getSocket().emit('music:cmd', cmd), []);
  const current = useMemo(() => tracks.find((t) => t.id === shared?.trackId) ?? null, [tracks, shared?.trackId]);

  const value: MusicCtx = {
    tracks,
    current,
    playing: !!shared?.playing,
    blocked: blocked && !!shared?.playing,
    shuffle: !!shared?.shuffle,
    updatedBy: shared?.updatedBy ?? null,
    progress,
    duration: duration || current?.durationSec || 0,
    volume,
    muted,
    toggle: () => {
      // Le geste de l'utilisateur sert aussi à autoriser le son sur cet appareil.
      if (!shared?.playing) audioRef.current?.play().catch(() => undefined);
      send({ type: shared?.playing ? 'pause' : 'play' });
    },
    next: () => send({ type: 'next' }),
    prev: () => send({ type: 'prev' }),
    seek: (t) => send({ type: 'seek', position: t }),
    select: (trackId) => {
      audioRef.current?.play().catch(() => undefined);
      send({ type: 'select', trackId });
    },
    toggleShuffle: () => send({ type: 'shuffle' }),
    unblock: () => sharedRef.current && apply(sharedRef.current),
    setVolume: (v) => setVol(Math.max(0, Math.min(1, v))),
    toggleMute: () => setMuted((m) => !m),
    reload,
    sheetOpen,
    setSheetOpen,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMusic hors MusicProvider');
  return c;
}
