import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowLeft, Delete, Heart, Lock } from 'lucide-react';
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

  const submit = async (code: string) => {
    if (!who || busy) return;
    setBusy(true);
    try {
      await login(who, code);
    } catch (e) {
      setError((e as Error).message);
      setPin('');
      shake.start({ x: [0, -14, 14, -10, 10, -4, 0], transition: { duration: 0.5 } });
    } finally {
      setBusy(false);
    }
  };

  const press = (d: string) => {
    setError(null);
    setPin((p) => (p.length < 8 ? p + d : p));
  };

  // Validation automatique dès 4 chiffres saisis.
  useEffect(() => {
    if (pin.length >= 4) {
      const t = setTimeout(() => submit(pin), 250);
      return () => clearTimeout(t);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!who) return;
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [who]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <FloatingHearts count={22} />
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
        <Heart className="h-16 w-16 animate-heartbeat fill-blush-400 text-blush-400 drop-shadow-lg" />
      </motion.div>
      <h1 className="mt-4 text-center font-display text-4xl font-bold sm:text-5xl" aria-label={TITLE}>
        {TITLE.split('').map((c, i) => (
          <motion.span
            key={i}
            className="inline-block text-gradient animate-shimmer"
            initial={{ opacity: 0, y: 30, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
          >
            {c === ' ' ? ' ' : c}
          </motion.span>
        ))}
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-2 font-script text-3xl text-blush-500">
        22 novembre 2025 · 22 novembre 2026
      </motion.p>

      <div className="mt-10 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {!who ? (
            <motion.div key="who" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ delay: 1.3 }}>
              <p className="mb-4 text-center font-semibold text-wine-700">Qui es-tu ?</p>
              <div className="grid grid-cols-2 gap-4">
                {(['adele', 'miguel'] as Player[]).map((p, i) => (
                  <motion.button
                    key={p}
                    initial={{ opacity: 0, y: 30, rotate: i ? 4 : -4 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: 1.4 + i * 0.1, type: 'spring' }}
                    whileHover={{ y: -6, rotate: i ? 2 : -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setWho(p)}
                    className="card flex flex-col items-center gap-3 p-6"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-wine-gradient font-display text-2xl font-bold text-white shadow-glow">
                      {PLAYER_NAMES[p][0]}
                    </span>
                    <span className="font-display text-xl font-bold text-wine-700">{PLAYER_NAMES[p]}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="pin" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="card p-6">
              <button onClick={() => { setWho(null); setPin(''); setError(null); }} className="mb-2 flex items-center gap-1 text-sm font-semibold text-wine-600">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <p className="text-center font-display text-2xl font-bold text-wine-700">Bonjour {PLAYER_NAMES[who]}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm text-ink/60">
                <Lock className="h-3.5 w-3.5" /> Ton code secret
              </p>
              <motion.div animate={shake} className="my-6 flex justify-center gap-3">
                {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
                  <motion.span
                    key={i}
                    animate={{ scale: i < pin.length ? 1.15 : 1 }}
                    className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'border-wine-500 bg-wine-500' : 'border-blush-300'}`}
                  />
                ))}
              </motion.div>
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 text-center text-sm font-semibold text-wine-600">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
                  k === '' ? (
                    <span key="empty" />
                  ) : (
                    <motion.button
                      key={k}
                      whileTap={{ scale: 0.88, backgroundColor: '#FDE2E7' }}
                      disabled={busy}
                      onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
                      className="flex h-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-wine-700 shadow-sm"
                      aria-label={k === 'del' ? 'Effacer' : k}
                    >
                      {k === 'del' ? <Delete className="h-6 w-6" /> : k}
                    </motion.button>
                  ),
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
