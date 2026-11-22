import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Gamepad2, Mail, Milestone } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import { useMe } from '@/lib/auth';
import { api, type Letter } from '@/services/api';
import { AnimatedNumber, Page } from '@/components/ui';

const COUPLE_START = new Date('2025-11-22T00:00:00');
const FIRST_MEETING = new Date('2025-03-22T00:00:00');

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function diff(from: Date, to: Date) {
  const ms = Math.max(0, to.getTime() - from.getTime());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function HomePage() {
  const me = useMe();
  const now = useNow();
  const together = diff(COUPLE_START, now);
  const sinceMeeting = diff(FIRST_MEETING, now).days;
  const [letter, setLetter] = useState<Letter | null>(null);
  const [openLetter, setOpenLetter] = useState(false);
  const letterId = useId();

  useEffect(() => {
    api
      .letter()
      .then((l) => setLetter(l?.published ? l : null))
      .catch(() => undefined);
  }, []);

  const isAnniversary = useMemo(() => now.getDate() === 22 && now.getMonth() === 10, [now]);

  return (
    <Page>
      <section className="pt-4 text-center">
        <p className="font-script text-3xl text-wine-500">Bonjour {PLAYER_NAMES[me]}</p>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight sm:text-5xl">
          {isAnniversary ? 'Un an aujourd’hui' : 'Miguel & Adèle'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink/75">Ensemble depuis le 22 novembre 2025.</p>
      </section>

      {/* Compteur : les jours portent le sens, le reste reste discret. */}
      <section className="mt-8 text-center" aria-label="Temps passé ensemble">
        <p className="font-display text-6xl font-bold leading-none text-wine-700 sm:text-7xl">
          <AnimatedNumber value={together.days} duration={1.6} />
        </p>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-wine-600">jours ensemble</p>
        <p className="mt-3 font-semibold tabular-nums text-ink/70" aria-live="off">
          et {together.hours} h {pad(together.minutes)} min {pad(together.seconds)} s
        </p>
        <p className="mt-1 text-sm text-ink/65">{sinceMeeting} jours depuis notre rencontre, le 22 mars 2025</p>
      </section>

      {letter && (
        <section className="mt-10">
          <div className="overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-soft">
            <div className="flex items-center gap-3 p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush-100 text-wine-600">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-wine-600">Une lettre</p>
                <h2 className="truncate text-2xl font-bold">{letter.title}</h2>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {openLetter && (
                <motion.div
                  id={letterId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-blush-100 px-5 pb-6 pt-5 sm:px-8">
                    <p className="whitespace-pre-line font-display text-lg leading-relaxed text-ink/90">{letter.body}</p>
                    {letter.signature && <p className="mt-5 text-right font-script text-3xl text-wine-600">{letter.signature}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setOpenLetter((o) => !o)}
              aria-expanded={openLetter}
              aria-controls={letterId}
              className="flex w-full items-center justify-center gap-2 border-t border-blush-100 px-5 py-3.5 text-sm font-bold text-wine-700 hover:bg-blush-50"
            >
              {openLetter ? 'Refermer la lettre' : 'Ouvrir la lettre'}
              <ChevronDown className={`h-4 w-4 transition-transform ${openLetter ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/jeux" className="group block rounded-3xl bg-wine-gradient p-6 text-white shadow-soft">
          <Gamepad2 className="h-7 w-7" />
          <h2 className="mt-3 font-display text-2xl font-bold text-white">Our Love Games</h2>
          <p className="mt-1 text-sm text-white/85">Six jeux à deux : questions, souvenirs, défis et paires à retrouver.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
            Choisir un jeu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
        <Link to="/frise" className="group block rounded-3xl border border-blush-100 bg-white p-6 shadow-soft">
          <Milestone className="h-7 w-7 text-wine-600" />
          <h2 className="mt-3 text-2xl font-bold">Notre frise</h2>
          <p className="mt-1 text-sm text-ink/75">Nos dates, de la rencontre au premier anniversaire.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-wine-700">
            Voir la frise <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </section>
    </Page>
  );
}
