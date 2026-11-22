import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CROSSFADE_SEC, MANUAL_FADE_SEC, PAUSE_FADE_SEC, type MusicCommand, type MusicSnapshot, type TrackDTO } from '@shared/music';
import { PLAYER_NAMES, type Player } from '@shared/types';
import { api, audioUrl } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useToast } from './toast';

/**
 * Lecteur partagé : le serveur détient l'état (titre, lecture, position).
 * Chaque appareil suit cet état avec deux « platines » pour enchaîner les titres en fondu.
 * Seuls le volume et la sourdine sont locaux.
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

/** Une platine : un élément audio et son gain (fondu). */
interface Deck {
  el: HTMLAudioElement;
  gain: GainNode | null;
  /** Gain logiciel 0..1 (utilisé tant que Web Audio n'est pas disponible). */
  soft: number;
  /** Valeur visée par le fondu en cours. */
  target: number;
  trackId: string | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
  rampTimer: ReturnType<typeof setInterval> | null;
}

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
  const decksRef = useRef<Deck[]>([]);
  const activeRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
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
  const levelRef = useRef(muted ? 0 : volume);
  levelRef.current = muted ? 0 : volume;
  const tracksRef = useRef<TrackDTO[]>([]);
  tracksRef.current = tracks;

  const reload = useCallback(async () => {
    setTracks(await api.tracks().catch(() => []));
  }, []);

  /* ----------------------------- Moteur audio ----------------------------- */

  const applyLevel = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(levelRef.current, ctx.currentTime, 0.05);
    } else {
      for (const d of decksRef.current) d.el.volume = Math.max(0, Math.min(1, levelRef.current * d.soft));
    }
  }, []);

  /**
   * Branche les platines sur Web Audio (au premier toucher : exigence des navigateurs).
   * Indispensable sur iPhone, où le volume d'un élément audio ne peut pas être modifié.
   */
  const ensureGraph = useCallback(() => {
    let ctx = audioCtxRef.current;
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = levelRef.current;
        master.connect(ctx.destination);
        for (const d of decksRef.current) {
          // Un fondu logiciel en cours se termine à sa valeur cible avant le passage à Web Audio.
          if (d.rampTimer) clearInterval(d.rampTimer);
          d.rampTimer = null;
          d.soft = d.target;
          const g = ctx.createGain();
          g.gain.value = d.target;
          ctx.createMediaElementSource(d.el).connect(g).connect(master);
          d.gain = g;
          d.el.volume = 1;
        }
        audioCtxRef.current = ctx;
        masterRef.current = master;
      } catch {
        return;
      }
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => undefined);
  }, []);

  /** Fondu du gain d'une platine vers `to` en `sec` secondes. */
  const ramp = useCallback((d: Deck, to: number, sec: number) => {
    if (d.rampTimer) clearInterval(d.rampTimer);
    d.rampTimer = null;
    d.target = to;
    const ctx = audioCtxRef.current;
    if (ctx && d.gain) {
      const t = ctx.currentTime;
      d.gain.gain.cancelScheduledValues(t);
      d.gain.gain.setValueAtTime(d.gain.gain.value, t);
      d.gain.gain.linearRampToValueAtTime(to, t + Math.max(sec, 0.01));
      d.soft = to;
      return;
    }
    const from = d.soft;
    if (sec <= 0) {
      d.soft = to;
      d.el.volume = Math.max(0, Math.min(1, levelRef.current * to));
      return;
    }
    const t0 = performance.now();
    d.rampTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      d.soft = from + (to - from) * k;
      d.el.volume = Math.max(0, Math.min(1, levelRef.current * d.soft));
      if (k >= 1 && d.rampTimer) {
        clearInterval(d.rampTimer);
        d.rampTimer = null;
      }
    }, 40);
  }, []);

  const stopLater = useCallback((d: Deck, sec: number) => {
    if (d.stopTimer) clearTimeout(d.stopTimer);
    d.stopTimer = setTimeout(() => {
      d.el.pause();
      d.stopTimer = null;
    }, sec * 1000 + 60);
  }, []);

  const cancelStop = (d: Deck) => {
    if (d.stopTimer) clearTimeout(d.stopTimer);
    d.stopTimer = null;
  };

  const playDeck = useCallback((d: Deck) => {
    d.el
      .play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  }, []);

  /** Position cible selon l'état partagé et l'horloge du serveur. */
  const targetPosition = (s: MusicSnapshot) => (s.playing ? s.position + (Date.now() + offsetRef.current - s.anchorAt) / 1000 : s.position);

  /** Aligne les platines sur l'état partagé. */
  const apply = useCallback(
    (s: MusicSnapshot) => {
      const decks = decksRef.current;
      if (decks.length < 2) return;
      const active = decks[activeRef.current];

      if (!s.trackId) {
        ramp(active, 0, PAUSE_FADE_SEC);
        stopLater(active, PAUSE_FADE_SEC);
        return;
      }

      // Nouveau titre : fondu enchaîné entre les deux platines.
      if (active.trackId !== s.trackId) {
        const wasPlaying = !!active.trackId && !active.el.paused;
        const fade = wasPlaying ? (s.updatedBy ? MANUAL_FADE_SEC : CROSSFADE_SEC) : 0;
        const next = decks[1 - activeRef.current];
        cancelStop(next);
        next.el.pause();
        next.trackId = s.trackId;
        ramp(next, 0, 0);
        const trackId = s.trackId;
        const start = () => {
          const latest = sharedRef.current;
          if (!latest || latest.trackId !== trackId) return;
          try {
            next.el.currentTime = Math.max(0, targetPosition(latest));
          } catch {
            /* position appliquée au prochain recalage */
          }
          if (latest.playing) {
            playDeck(next);
            ramp(next, 1, fade || 0.05);
          }
        };
        next.el.src = audioUrl(trackId);
        next.el.addEventListener('loadedmetadata', start, { once: true });
        next.el.load();
        if (fade > 0) {
          ramp(active, 0, fade);
          stopLater(active, fade);
        } else {
          active.el.pause();
        }
        activeRef.current = 1 - activeRef.current;
        setProgress(0);
        return;
      }

      // Même titre : recalage, lecture ou pause en douceur.
      const target = targetPosition(s);
      if (active.el.readyState >= 1 && Math.abs(active.el.currentTime - target) > DRIFT_TOLERANCE) {
        try {
          active.el.currentTime = Math.max(0, target);
        } catch {
          /* métadonnées pas encore chargées */
        }
      }
      if (s.playing) {
        if (active.el.paused) {
          cancelStop(active);
          ramp(active, 0, 0);
          playDeck(active);
          ramp(active, 1, PAUSE_FADE_SEC);
        } else if (active.stopTimer || active.soft < 1) {
          // Reprise pendant un fondu de pause : on remonte le son.
          cancelStop(active);
          ramp(active, 1, PAUSE_FADE_SEC);
        }
      } else if (!active.el.paused && !active.stopTimer) {
        ramp(active, 0, PAUSE_FADE_SEC);
        stopLater(active, PAUSE_FADE_SEC);
      }
    },
    [ramp, stopLater, playDeck],
  );

  // Deux platines pour toute l'application.
  useEffect(() => {
    const make = (): Deck => {
      const el = new Audio();
      el.preload = 'auto';
      return { el, gain: null, soft: 0, target: 0, trackId: null, stopTimer: null, rampTimer: null };
    };
    const decks = [make(), make()];
    decksRef.current = decks;
    const isActive = (d: Deck) => decksRef.current[activeRef.current] === d;
    const cleanups = decks.map((d) => {
      const onTime = () => isActive(d) && setProgress(d.el.currentTime);
      const onMeta = () => isActive(d) && setDuration(d.el.duration || 0);
      const onEnded = () => {
        const s = sharedRef.current;
        if (isActive(d) && s?.trackId) getSocket().emit('music:cmd', { type: 'ended', trackId: s.trackId } satisfies MusicCommand);
      };
      d.el.addEventListener('timeupdate', onTime);
      d.el.addEventListener('loadedmetadata', onMeta);
      d.el.addEventListener('ended', onEnded);
      return () => {
        d.el.pause();
        d.el.removeAttribute('src');
        d.el.removeEventListener('timeupdate', onTime);
        d.el.removeEventListener('loadedmetadata', onMeta);
        d.el.removeEventListener('ended', onEnded);
        if (d.stopTimer) clearTimeout(d.stopTimer);
        if (d.rampTimer) clearInterval(d.rampTimer);
      };
    });
    // Chaque toucher sur la page (connexion comprise) autorise ou réveille le son.
    const onGesture = () => ensureGraph();
    window.addEventListener('pointerdown', onGesture, true);
    return () => {
      cleanups.forEach((c) => c());
      window.removeEventListener('pointerdown', onGesture, true);
      audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
      masterRef.current = null;
    };
  }, [ensureGraph]);

  useEffect(() => {
    applyLevel();
    store.set('volume', volume);
    store.set('muted', muted);
  }, [volume, muted, applyLevel]);

  /* --------------------------- Synchronisation --------------------------- */

  useEffect(() => {
    if (!enabled) {
      decksRef.current.forEach((d) => d.el.pause());
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

  // Retour au premier plan : on réveille le son et on se recale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      audioCtxRef.current?.resume().catch(() => undefined);
      if (sharedRef.current) apply(sharedRef.current);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [apply]);

  // Toucher suivant un blocage : on retente la lecture.
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
      ensureGraph();
      send({ type: shared?.playing ? 'pause' : 'play' });
    },
    next: () => {
      ensureGraph();
      send({ type: 'next' });
    },
    prev: () => {
      ensureGraph();
      send({ type: 'prev' });
    },
    seek: (t) => send({ type: 'seek', position: t }),
    select: (trackId) => {
      ensureGraph();
      send({ type: 'select', trackId });
    },
    toggleShuffle: () => send({ type: 'shuffle' }),
    unblock: () => {
      ensureGraph();
      if (sharedRef.current) apply(sharedRef.current);
    },
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
