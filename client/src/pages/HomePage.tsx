import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Gamepad2, Heart, Milestone, Sparkles } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import { useMe } from '@/lib/auth';
import { api, type Letter } from '@/services/api';
import { AnimatedNumber, Page, rise, stagger } from '@/components/ui';
import { MessageMemoriesCard } from '@/components/MessageMemoriesCard';

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

/** La lettre : toute la carte s'ouvre et se referme d'un toucher. */
function LetterCard({ letter }: { letter: Letter }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  return (
    <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-10">
      <div className="perspective">
        <motion.div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={open ? 'Refermer la lettre' : 'Ouvrir la lettre'}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          whileHover={{ rotate: open ? 0 : -1.2, y: -4 }}
          whileTap={{ scale: 0.99 }}
          className="relative w-full cursor-pointer overflow-hidden rounded-3xl bg-white p-6 text-left shadow-soft sm:p-8"
        >
          <motion.div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blush-100" animate={{ scale: open ? 1.6 : [1, 1.1, 1] }} transition={open ? { duration: 0.6 } : { repeat: Infinity, duration: 4 }} />
          <div className="relative flex items-center gap-3">
            <motion.div animate={open ? { rotate: 0, scale: 1 } : { rotate: [0, -10, 10, 0] }} transition={open ? {} : { repeat: Infinity, repeatDelay: 2.5, duration: 0.6 }}>
              <Heart className="h-8 w-8 fill-wine-500 text-wine-500" />
            </motion.div>
            <div>
              <p className="font-script text-2xl text-wine-600">Une lettre</p>
              <h2 className="text-2xl sm:text-3xl">{letter.title}</h2>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden"
              >
                <motion.p initial={{ y: 20 }} animate={{ y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-6 whitespace-pre-line font-letter text-lg leading-relaxed text-ink/90">
                  {letter.body}
                </motion.p>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex justify-end">
                  {letter.signatureImage ? (
                    <img src={letter.signatureImage} alt={`Signature de ${letter.signature}`} className="h-20 w-auto sm:h-24" />
                  ) : (
                    <span className="font-script text-3xl text-wine-600">{letter.signature}</span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="relative mt-4 text-sm font-semibold text-wine-600">{open ? 'Toucher pour refermer' : 'Toucher pour ouvrir'}</p>
        </motion.div>
      </div>
    </motion.section>
  );
}

export function HomePage() {
  const me = useMe();
  const now = useNow();
  const together = diff(COUPLE_START, now);
  const sinceMeeting = diff(FIRST_MEETING, now).days;
  const [letter, setLetter] = useState<Letter | null>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, 110]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.25]);

  useEffect(() => {
    api
      .letter()
      .then((l) => setLetter(l?.published ? l : null))
      .catch(() => undefined);
  }, []);

  const isAnniversary = useMemo(() => now.getDate() === 22 && now.getMonth() === 10, [now]);

  return (
    <Page>
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="pt-4 text-center">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-script text-3xl text-wine-600">
          Bonjour {PLAYER_NAMES[me]}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 120 }} className="mt-2 font-display text-5xl leading-tight sm:text-6xl">
          <span className="text-gradient animate-shimmer">One Year,</span>
          <br />
          <span className="text-wine-800">One Love</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mx-auto mt-4 max-w-md text-ink/80">
          {isAnniversary ? 'Joyeux anniversaire à nous deux. ' : ''}Miguel & Adèle, ensemble depuis le 22 novembre 2025.
        </motion.p>
      </motion.section>

      {letter && <LetterCard letter={letter} />}

      {/* Compteur */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="mt-10 grid grid-cols-4 gap-2 sm:gap-4" aria-label="Temps passé ensemble">
        {[
          { v: together.days, l: 'jours' },
          { v: together.hours, l: 'heures' },
          { v: together.minutes, l: 'minutes' },
          { v: together.seconds, l: 'secondes' },
        ].map((x, i) => (
          <motion.div key={x.l} variants={rise} whileHover={{ y: -4 }} className={`card flex flex-col items-center py-4 ${i === 0 ? 'ring-2 ring-blush-200' : ''}`}>
            <span className="font-display text-3xl text-wine-800 sm:text-4xl">{i === 0 ? <AnimatedNumber value={x.v} duration={2} /> : String(x.v).padStart(2, '0')}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-wine-700">{x.l}</span>
          </motion.div>
        ))}
      </motion.section>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-center text-sm text-ink/70">
        et {sinceMeeting} jours depuis notre rencontre, le 22 mars 2025
      </motion.p>

      <MessageMemoriesCard />

      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-6 grid gap-4 sm:grid-cols-2">
        <motion.div variants={rise} whileHover={{ y: -6, rotate: -0.6 }}>
          <Link to="/jeux" className="group relative block overflow-hidden rounded-3xl bg-wine-gradient p-6 text-white shadow-glow">
            <motion.div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
            <Gamepad2 className="h-8 w-8" />
            <h2 className="mt-3 font-display text-2xl text-white">Our Love Games</h2>
            <p className="mt-1 text-sm text-white/85">Six jeux à deux : questions, souvenirs, défis et paires à retrouver.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
              Choisir un jeu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
        <motion.div variants={rise} whileHover={{ y: -6, rotate: 0.6 }}>
          <Link to="/frise" className="group card relative block overflow-hidden p-6">
            <Milestone className="h-8 w-8 text-wine-600" />
            <h2 className="mt-3 text-2xl">Notre frise</h2>
            <p className="mt-1 text-sm text-ink/80">Nos dates, de la rencontre au premier anniversaire.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-wine-700">
              Revivre <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      </motion.section>

      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 flex items-center justify-center gap-2 text-center font-script text-2xl text-wine-600">
        <Sparkles className="h-5 w-5" /> Et tout le reste à écrire <Sparkles className="h-5 w-5" />
      </motion.p>
    </Page>
  );
}
