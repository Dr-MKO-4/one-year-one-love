import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Headphones, ListMusic, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import { useMusic } from '@/lib/music';

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** Petit égaliseur : seule animation du lecteur, et seulement quand le son joue. */
function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-wine-500"
          animate={active ? { height: ['35%', '100%', '50%', '35%'] } : { height: '30%' }}
          transition={active ? { duration: 1.1 + i * 0.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}

/** Invitation à activer le son sur cet appareil (règle des navigateurs mobiles). */
function JoinListening({ compact = false }: { compact?: boolean }) {
  const m = useMusic();
  if (!m.blocked) return null;
  return (
    <button
      onClick={m.unblock}
      className={`flex shrink-0 items-center gap-1.5 rounded-full bg-wine-600 font-bold text-white ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
    >
      <Headphones className="h-4 w-4" /> Rejoindre l’écoute
    </button>
  );
}

function PlayPause({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const m = useMusic();
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <button onClick={m.toggle} className="rounded-full p-2 text-wine-700 hover:bg-blush-50" aria-label={m.playing ? 'Mettre en pause pour nous deux' : 'Lancer pour nous deux'}>
      {m.playing ? <Pause className={cls} /> : <Play className={cls} />}
    </button>
  );
}

function NextButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const m = useMusic();
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <button onClick={m.next} className="rounded-full p-2 text-wine-700 hover:bg-blush-50" aria-label="Chanson suivante pour nous deux">
      <SkipForward className={cls} />
    </button>
  );
}

/** Barre de lecture mobile : intégrée au bloc de navigation, dans une zone réservée. */
export function MobileMusicBar() {
  const m = useMusic();
  if (!m.tracks.length) return null;
  const audible = m.playing && !m.blocked;
  return (
    <div className="flex h-14 items-center gap-2 border-b border-blush-100 px-3">
      <button onClick={() => m.setSheetOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Ouvrir la playlist">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush-100">
          {audible ? <Equalizer active /> : <ListMusic className="h-4 w-4 text-wine-600" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-wine-800">{m.current?.title ?? 'Notre playlist'}</span>
          <span className="block truncate text-xs text-ink/70">{m.current ? m.current.artist : 'Appuie sur lecture : elle démarre chez vous deux'}</span>
        </span>
      </button>
      {m.blocked ? (
        <JoinListening compact />
      ) : (
        <>
          <PlayPause />
          <NextButton />
        </>
      )}
    </div>
  );
}

/** Commandes compactes dans l'en-tête (ordinateur). */
export function HeaderMusic() {
  const m = useMusic();
  if (!m.tracks.length) return null;
  if (m.blocked) return <JoinListening compact />;
  return (
    <div className="flex items-center rounded-full border border-blush-100 bg-white">
      <button onClick={() => m.setSheetOpen(true)} className="flex max-w-[200px] items-center gap-2 rounded-full py-1.5 pl-3 pr-1 text-left" title={m.current ? `${m.current.title} · ${m.current.artist}` : undefined} aria-label="Ouvrir la playlist">
        {m.playing ? <Equalizer active /> : <ListMusic className="h-4 w-4 text-wine-600" />}
        <span className="hidden truncate text-xs font-bold text-wine-800 xl:inline">{m.current?.title ?? 'Notre playlist'}</span>
      </button>
      <PlayPause size="sm" />
      <NextButton size="sm" />
    </div>
  );
}

/** Bouton compact (en-tête des parties). */
export function MusicButton() {
  const m = useMusic();
  if (!m.tracks.length) return null;
  if (m.blocked) return <JoinListening compact />;
  return (
    <div className="flex items-center rounded-full border border-blush-100 bg-white">
      <button onClick={() => m.setSheetOpen(true)} className="flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-1" aria-label="Ouvrir la playlist">
        {m.playing ? <Equalizer active /> : <ListMusic className="h-4 w-4 text-wine-600" />}
      </button>
      <NextButton size="sm" />
    </div>
  );
}

/** Panneau de la playlist partagée (dialogue). */
export function MusicSheet() {
  const m = useMusic();
  const open = m.sheetOpen;
  const close = () => m.setSheetOpen(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const setOpenRef = useRef(m.setSheetOpen);
  setOpenRef.current = m.setSheetOpen;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenRef.current(false);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open]);

  if (!m.tracks.length) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center bg-wine-900/45 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Playlist partagée"
            className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-cream shadow-soft sm:rounded-3xl"
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-wine-gradient px-5 pb-5 pt-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/75">On écoute ensemble</p>
                  <p className="mt-1 truncate font-display text-xl font-bold">{m.current?.title ?? 'Rien pour le moment'}</p>
                  <p className="truncate text-sm text-white/80">{m.current?.artist ?? 'Lance un titre : il démarre chez vous deux'}</p>
                  {m.updatedBy && <p className="mt-1 text-xs text-white/70">Dernière action : {PLAYER_NAMES[m.updatedBy]}</p>}
                </div>
                <button ref={closeRef} onClick={close} className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25">
                  <X className="h-4 w-4" /> Fermer
                </button>
              </div>
              <div className="mt-3 flex justify-center">
                <JoinListening compact />
              </div>

              <label className="mt-3 block">
                <span className="flex justify-between text-xs text-white/80">
                  <span>Position (pour vous deux)</span>
                  <span className="tabular-nums">
                    {fmt(m.progress)} / {fmt(m.duration)}
                  </span>
                </span>
                <input type="range" min={0} max={m.duration || 0} step={1} value={Math.min(m.progress, m.duration || 0)} onChange={(e) => m.seek(Number(e.target.value))} className="mt-1 w-full accent-blush-200" />
              </label>

              <div className="mt-2 flex items-center justify-between">
                <button onClick={m.toggleShuffle} className={`rounded-full p-2 ${m.shuffle ? 'bg-white/25' : 'text-white/70'}`} aria-label="Lecture aléatoire" aria-pressed={m.shuffle}>
                  <Shuffle className="h-5 w-5" />
                </button>
                <button onClick={m.prev} className="rounded-full p-2" aria-label="Précédente pour nous deux">
                  <SkipBack className="h-7 w-7" />
                </button>
                <button onClick={m.toggle} className="rounded-full bg-white p-4 text-wine-700" aria-label={m.playing ? 'Mettre en pause pour nous deux' : 'Lancer pour nous deux'}>
                  {m.playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />}
                </button>
                <button onClick={m.next} className="rounded-full p-2" aria-label="Suivante pour nous deux">
                  <SkipForward className="h-7 w-7" />
                </button>
                <span className="w-9" aria-hidden />
              </div>
              <p className="mt-1 text-center text-xs text-white/75">Lecture, pause, position et changement de titre s’appliquent à vos deux téléphones.</p>

              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
                <button onClick={m.toggleMute} className="rounded-full p-1" aria-label={m.muted ? 'Activer le son sur ce téléphone' : 'Couper le son sur ce téléphone'}>
                  {m.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <label className="flex flex-1 items-center gap-2">
                  <span className="shrink-0 text-xs text-white/80">Volume de ce téléphone</span>
                  <input type="range" min={0} max={1} step={0.05} value={m.muted ? 0 : m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} className="w-full accent-blush-200" />
                </label>
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Titres">
              {m.tracks.map((t, i) => {
                const active = t.id === m.current?.id;
                return (
                  <li key={t.id}>
                    <button
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-blush-50 ${active ? 'bg-blush-100' : ''}`}
                      onClick={() => m.select(t.id)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="flex w-6 justify-center text-xs font-bold text-wine-600">{active && m.playing && !m.blocked ? <Equalizer active /> : i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-wine-800">{t.title}</span>
                        <span className="block truncate text-xs text-ink/70">{t.artist}</span>
                      </span>
                      {t.durationSec ? <span className="text-xs tabular-nums text-ink/70">{fmt(t.durationSec)}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
