import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Headphones, ListMusic, Pause, Play, Radio, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import { useMusic } from '@/lib/music';

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-blush-400"
          animate={active ? { height: ['30%', '100%', '45%', '85%', '30%'] } : { height: '25%' }}
          transition={active ? { duration: 1 + i * 0.15, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
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
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [1, 1.06, 1], opacity: 1 }}
      transition={{ scale: { repeat: Infinity, duration: 1.6 } }}
      onClick={m.unblock}
      className={`flex items-center gap-1.5 rounded-full bg-wine-gradient font-bold text-white shadow-glow ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
    >
      <Headphones className="h-4 w-4" /> Rejoindre l’écoute
    </motion.button>
  );
}

/** Lecteur flottant : la musique est partagée, chaque commande s'applique aux deux téléphones. */
export function MusicPlayer({ hidePill = false }: { hidePill?: boolean }) {
  const m = useMusic();
  const open = m.sheetOpen;
  const setOpen = m.setSheetOpen;
  if (!m.tracks.length) return null;
  const audible = m.playing && !m.blocked;

  return (
    <>
      {!hidePill && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 22 }}
          className="fixed bottom-[84px] right-3 z-40 flex items-center gap-1 rounded-full border border-white/70 bg-white/85 p-1.5 pr-2 shadow-soft backdrop-blur-md sm:bottom-6 sm:right-6"
        >
          {m.blocked ? (
            <JoinListening />
          ) : (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full pl-1 pr-2" aria-label="Ouvrir la playlist">
              <motion.div
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-wine-gradient"
                animate={{ rotate: audible ? 360 : 0 }}
                transition={audible ? { duration: 6, repeat: Infinity, ease: 'linear' } : { duration: 0.6 }}
              >
                <div className="absolute inset-[6px] rounded-full border border-white/30" />
                <div className="h-2 w-2 rounded-full bg-cream" />
              </motion.div>
              <div className="hidden max-w-[140px] text-left sm:block">
                <p className="truncate text-xs font-bold text-wine-700">{m.current?.title ?? 'Notre playlist'}</p>
                <p className="truncate text-[11px] text-ink/60">{m.current?.artist ?? 'Appuie pour lancer'}</p>
              </div>
              <Equalizer active={audible} />
            </button>
          )}
          <motion.button whileTap={{ scale: 0.85 }} onClick={m.toggle} className="rounded-full p-2 text-wine-600 hover:bg-blush-50" aria-label={m.playing ? 'Pause pour nous deux' : 'Lecture pour nous deux'}>
            {m.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.85, x: 4 }} onClick={m.next} className="rounded-full p-2 text-wine-600 hover:bg-blush-50" aria-label="Chanson suivante pour nous deux">
            <SkipForward className="h-5 w-5" />
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-wine-900/40 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-t-[2rem] bg-cream shadow-soft sm:rounded-[2rem]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-wine-gradient px-6 pb-6 pt-4 text-white">
                <button onClick={() => setOpen(false)} className="mx-auto mb-3 flex rounded-full p-1 text-white/80" aria-label="Fermer">
                  <ChevronDown className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                  <motion.div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_0deg,#3D0F1E,#6E1D36,#3D0F1E,#55162A,#3D0F1E)] shadow-lg"
                    animate={{ rotate: audible ? 360 : 0 }}
                    transition={audible ? { duration: 5, repeat: Infinity, ease: 'linear' } : { duration: 0.8 }}
                  >
                    {[10, 16, 22].map((i) => (
                      <div key={i} className="absolute rounded-full border border-white/10" style={{ inset: i / 2 }} />
                    ))}
                    <div className="h-6 w-6 rounded-full bg-blush-300" />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-script text-2xl text-blush-200">
                      <Radio className="h-4 w-4" /> On écoute ensemble
                    </p>
                    <p className="truncate font-display text-lg font-bold">{m.current?.title ?? 'Rien pour le moment'}</p>
                    <p className="truncate text-sm text-white/70">{m.current?.artist ?? 'Lance un titre : il démarre chez vous deux'}</p>
                    {m.updatedBy && <p className="mt-0.5 text-[11px] text-white/60">Dernière action : {PLAYER_NAMES[m.updatedBy]}</p>}
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <JoinListening compact />
                </div>
                <input
                  type="range"
                  min={0}
                  max={m.duration || 0}
                  step={1}
                  value={Math.min(m.progress, m.duration || 0)}
                  onChange={(e) => m.seek(Number(e.target.value))}
                  className="mt-3 w-full accent-blush-300"
                  aria-label="Position dans la chanson (pour nous deux)"
                />
                <div className="flex justify-between text-[11px] text-white/70">
                  <span>{fmt(m.progress)}</span>
                  <span>{fmt(m.duration)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button onClick={m.toggleShuffle} className={`rounded-full p-2 ${m.shuffle ? 'bg-white/20' : 'text-white/60'}`} aria-label="Lecture aléatoire" aria-pressed={m.shuffle}>
                    <Shuffle className="h-5 w-5" />
                  </button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={m.prev} className="rounded-full p-2" aria-label="Précédente">
                    <SkipBack className="h-7 w-7" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={m.toggle} className="rounded-full bg-white p-4 text-wine-700 shadow-lg" aria-label={m.playing ? 'Pause' : 'Lecture'}>
                    {m.playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={m.next} className="rounded-full p-2" aria-label="Suivante">
                    <SkipForward className="h-7 w-7" />
                  </motion.button>
                  <button onClick={m.toggleMute} className="rounded-full p-2" aria-label={m.muted ? 'Activer le son sur ce téléphone' : 'Couper le son sur ce téléphone'}>
                    {m.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={m.muted ? 0 : m.volume}
                  onChange={(e) => m.setVolume(Number(e.target.value))}
                  className="mt-2 w-full accent-blush-300"
                  aria-label="Volume de ce téléphone"
                />
                <p className="text-center text-[10px] text-white/50">Le volume et la sourdine ne concernent que ce téléphone.</p>
              </div>
              <ul className="max-h-[40dvh] overflow-y-auto p-3">
                {m.tracks.map((t, i) => {
                  const active = t.id === m.current?.id;
                  return (
                    <motion.li key={t.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-blush-50 ${active ? 'bg-blush-100' : ''}`}
                        onClick={() => m.select(t.id)}
                      >
                        <span className="flex w-6 justify-center text-xs font-bold text-wine-500">{active && audible ? <Equalizer active /> : i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-wine-700">{t.title}</p>
                          <p className="truncate text-xs text-ink/60">{t.artist}</p>
                        </div>
                        {t.durationSec ? <span className="text-xs tabular-nums text-ink/40">{fmt(t.durationSec)}</span> : null}
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Bouton compact (en-tête des parties) : ouvre la playlist sans masquer le jeu. */
export function MusicButton() {
  const m = useMusic();
  if (!m.tracks.length) return null;
  if (m.blocked) return <JoinListening compact />;
  return (
    <div className="flex items-center rounded-full bg-white/80">
      <button onClick={() => m.setSheetOpen(true)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5" aria-label="Ouvrir la playlist">
        <ListMusic className="h-4 w-4 text-wine-500" />
        <Equalizer active={m.playing} />
      </button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={m.next} className="rounded-full py-1.5 pr-2.5 text-wine-600" aria-label="Chanson suivante pour nous deux">
        <SkipForward className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
