import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Gamepad2, Heart, Milestone, Sparkles } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import { useMe } from '@/lib/auth';
import { api, type Letter } from '@/services/api';
import { AnimatedNumber, Page, rise, stagger } from '@/components/ui';

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

export function HomePage() {
  const me = useMe();
  const now = useNow();
  const together = diff(COUPLE_START, now);
  const sinceMeeting = diff(FIRST_MEETING, now).days;
  const [letter, setLetter] = useState<Letter | null>(null);
  const [openLetter, setOpenLetter] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.2]);

  useEffect(() => {
    api.letter().then(setLetter).catch(() => undefined);
  }, []);

  const isAnniversary = useMemo(() => now.getDate() === 22 && now.getMonth() === 10, [now]);

  return (
    <Page>
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="relative pt-6 text-center">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-script text-3xl text-blush-500">
          Bonjour {PLAYER_NAMES[me]}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
          className="mt-2 font-display text-5xl font-bold leading-tight sm:text-6xl"
        >
          <span className="text-gradient animate-shimmer">One Year,</span>
          <br />
          <span className="text-wine-700">One Love</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mx-auto mt-4 max-w-md text-ink/70">
          {isAnniversary ? 'Joyeux anniversaire à nous deux. ' : ''}Miguel & Adèle, ensemble depuis le 22 novembre 2025.
        </motion.p>
      </motion.section>

      <motion.section variants={stagger} initial="hidden" animate="show" className="mt-10 grid grid-cols-4 gap-2 sm:gap-4">
        {[
          { v: together.days, l: 'jours' },
          { v: together.hours, l: 'heures' },
          { v: together.minutes, l: 'minutes' },
          { v: together.seconds, l: 'secondes' },
        ].map((x, i) => (
          <motion.div key={x.l} variants={rise} className="card flex flex-col items-center py-4">
            <span className="font-display text-3xl font-bold text-wine-700 sm:text-4xl">
              {i === 0 ? <AnimatedNumber value={x.v} duration={2} /> : String(x.v).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-wine-500/70">{x.l}</span>
          </motion.div>
        ))}
      </motion.section>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-center text-sm text-ink/60">
        et {sinceMeeting} jours depuis notre rencontre, le 22 mars 2025
      </motion.p>

      {letter && (
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12">
          <div className="perspective">
            <motion.button
              onClick={() => setOpenLetter((o) => !o)}
              whileHover={{ rotate: openLetter ? 0 : -1.5, y: -4 }}
              className="relative w-full overflow-hidden rounded-3xl bg-white/90 p-6 text-left shadow-soft"
              aria-expanded={openLetter}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blush-100" />
              <div className="relative flex items-center gap-3">
                <motion.div animate={{ rotate: openLetter ? 0 : [0, -8, 8, 0] }} transition={{ repeat: openLetter ? 0 : Infinity, repeatDelay: 2.5, duration: 0.6 }}>
                  <Heart className="h-8 w-8 fill-wine-500 text-wine-500" />
                </motion.div>
                <div>
                  <p className="font-script text-2xl text-blush-500">Une lettre</p>
                  <h2 className="text-2xl font-bold">{letter.title}</h2>
                </div>
              </div>
              <motion.div initial={false} animate={{ height: openLetter ? 'auto' : 0, opacity: openLetter ? 1 : 0 }} className="relative overflow-hidden">
                <p className="mt-5 whitespace-pre-line font-display text-lg leading-relaxed text-ink/80">{letter.body}</p>
                <p className="mt-4 text-right font-script text-3xl text-wine-600">{letter.signature}</p>
              </motion.div>
              {!openLetter && <p className="relative mt-3 text-sm font-semibold text-wine-500">Toucher pour ouvrir</p>}
            </motion.button>
          </div>
        </motion.section>
      )}

      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid gap-4 sm:grid-cols-2">
        <motion.div variants={rise}>
          <Link to="/jeux" className="group relative block overflow-hidden rounded-3xl bg-wine-gradient p-6 text-white shadow-glow">
            <motion.div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
            <Gamepad2 className="h-8 w-8" />
            <h2 className="mt-3 font-display text-2xl font-bold text-white">Our Love Games</h2>
            <p className="mt-1 text-sm text-white/80">Six jeux pour rire, se souvenir et se découvrir encore.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
              Jouer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
        <motion.div variants={rise}>
          <Link to="/frise" className="group card relative block overflow-hidden p-6">
            <Milestone className="h-8 w-8 text-wine-500" />
            <h2 className="mt-3 text-2xl font-bold">Notre frise</h2>
            <p className="mt-1 text-sm text-ink/70">Les moments qui ont écrit notre première année.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-wine-600">
              Revivre <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      </motion.section>

      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 flex items-center justify-center gap-2 text-center font-script text-2xl text-blush-500">
        <Sparkles className="h-5 w-5" /> Et tout le reste à écrire <Sparkles className="h-5 w-5" />
      </motion.p>
    </Page>
  );
}
