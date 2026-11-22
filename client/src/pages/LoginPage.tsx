import { useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowLeft, Delete, Heart } from 'lucide-react';
import { PLAYER_NAMES, type Player } from '@shared/types';
import { useAuth } from '@/lib/auth';
import { FloatingHearts } from '@/components/FloatingHearts';

const TITLE = 'One Year, One Love';

export function LoginPage() {
  const { login } = useAuth();
  const [who, setWho] = useState<Player | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shake = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!who || busy || pin.length < 4) return;
    setBusy(true);
    try {
      await login(who, pin);
    } catch (e) {
      setError((e as Error).message);
      setPin('');
      inputRef.current?.focus();
      shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
    } finally {
      setBusy(false);
    }
  };

  const setDigits = (v: string) => {
    setError(null);
    setPin(v.replace(/\D/g, '').slice(0, 8));
  };

  const back = () => {
    setWho(null);
    setPin('');
    setError(null);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <FloatingHearts count={22} />
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
        <Heart className="h-16 w-16 animate-heartbeat fill-blush-400 text-blush-400 drop-shadow-lg" aria-hidden />
      </motion.div>
      <h1 className="mt-4 text-center font-display text-4xl sm:text-5xl" aria-label={TITLE}>
        {TITLE.split('').map((c, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block text-gradient animate-shimmer"
            initial={{ opacity: 0, y: 30, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.2 + i * 0.035, type: 'spring', stiffness: 300, damping: 20 }}
          >
            {c === ' ' ? ' ' : c}
          </motion.span>
        ))}
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-3 font-script text-2xl text-wine-600">
        22 novembre 2025 · 22 novembre 2026
      </motion.p>

      <div className="mt-10 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {!who ? (
            <motion.div key="who" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ delay: 0.4 }}>
              <h2 className="mb-4 text-center font-sans text-base font-semibold text-wine-800">Qui es-tu ?</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {(['adele', 'miguel'] as Player[]).map((p, i) => (
                  <motion.button
                    key={p}
                    initial={{ opacity: 0, y: 30, rotate: i ? 4 : -4 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                    whileHover={{ y: -6, rotate: i ? 2 : -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { setWho(p); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="card flex flex-col items-center gap-3 p-5 sm:p-6"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wine-gradient font-display text-2xl text-white shadow-glow sm:h-16 sm:w-16">{PLAYER_NAMES[p][0]}</span>
                    <span className="font-display text-xl text-wine-800">{PLAYER_NAMES[p]}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="pin"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="card p-5 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <button type="button" onClick={back} className="mb-2 flex items-center gap-1 text-sm font-semibold text-wine-700">
                <ArrowLeft className="h-4 w-4" /> Changer de prénom
              </button>
              <p className="text-center font-display text-2xl text-wine-800">Bonjour {PLAYER_NAMES[who]}</p>

              <label className="mt-5 block">
                <span className="label">Ton code (4 à 8 chiffres)</span>
                <motion.div animate={shake}>
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => setDigits(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'pin-error' : undefined}
                    className="input text-center text-2xl tracking-[0.5em]"
                  />
                </motion.div>
              </label>
              <p id="pin-error" role="alert" className="mt-2 min-h-[1.25rem] text-center text-sm font-semibold text-wine-700">
                {error}
              </p>

              {/* Pavé tactile : remplit le même champ. */}
              <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
                  k === '' ? (
                    <span key="empty" />
                  ) : (
                    <button
                      key={k}
                      type="button"
                      disabled={busy}
                      onClick={() => setDigits(k === 'del' ? pin.slice(0, -1) : pin + k)}
                      className="flex h-14 items-center justify-center rounded-2xl border border-blush-100 bg-white text-2xl font-semibold text-wine-800 active:bg-blush-100 sm:h-16"
                      aria-label={k === 'del' ? 'Effacer un chiffre' : k}
                    >
                      {k === 'del' ? <Delete className="h-6 w-6" /> : k}
                    </button>
                  ),
                )}
              </div>
              <button type="submit" disabled={busy || pin.length < 4} className="btn-primary mt-4 w-full">
                {busy ? 'Connexion…' : 'Se connecter'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
