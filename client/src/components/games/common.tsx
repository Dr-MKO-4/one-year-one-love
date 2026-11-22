import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Eye, EyeOff, Hand, SkipForward, X } from 'lucide-react';
import { PLAYER_NAMES, type GameId, type Player, type SessionDTO } from '@shared/types';
import { Btn } from '../ui';

export interface GameProps<G extends GameId> {
  session: SessionDTO<G>;
  me: Player;
  /** Envoie une action au serveur. `as` : joueur concerné en mode un seul appareil. */
  act: (type: string, payload?: Record<string, unknown>, as?: Player) => Promise<boolean>;
  busy: boolean;
  clockOffset: number;
}

/** Le joueur connecté peut-il agir pour `player` ? (toujours vrai sur un seul appareil) */
export const canActFor = (s: SessionDTO, me: Player, player: Player) => s.sharedDevice || me === player;

export function Avatar({ player, size = 40, active = false }: { player: Player; size?: number; active?: boolean }) {
  return (
    <motion.span
      animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={active ? { repeat: Infinity, duration: 1.6 } : {}}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${
        player === 'adele' ? 'bg-gradient-to-br from-blush-400 to-wine-500' : 'bg-gradient-to-br from-wine-500 to-wine-800'
      } ${active ? 'ring-4 ring-blush-200' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {PLAYER_NAMES[player][0]}
    </motion.span>
  );
}

/** Bandeau indiquant à qui c'est le tour. */
export function TurnBanner({ player, me, shared, text }: { player: Player; me: Player; shared: boolean; text?: string }) {
  const mine = shared || player === me;
  return (
    <motion.div
      key={`${player}-${text}`}
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 ${mine ? 'bg-wine-600 text-white' : 'border border-blush-100 bg-white text-wine-800'}`}
    >
      <Avatar player={player} size={34} active={mine} />
      <span className="text-sm font-bold">
        {text ?? (shared ? `Au tour de ${PLAYER_NAMES[player]}` : mine ? 'À toi de jouer' : `Au tour de ${PLAYER_NAMES[player]}`)}
      </span>
    </motion.div>
  );
}

/** Attente de l'autre joueur (temps réel). */
export function WaitingFor({ player, text }: { player: Player; text?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="relative">
        <Avatar player={player} size={64} />
        <motion.span className="absolute inset-0 rounded-full border-4 border-blush-300" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
      </div>
      <p className="font-semibold text-wine-700">
        {text ?? `${PLAYER_NAMES[player]} réfléchit`}
        <span className="inline-flex w-6">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}>
              .
            </motion.span>
          ))}
        </span>
      </p>
    </motion.div>
  );
}

/** Mode un seul appareil : écran de passage du téléphone, pour garder les réponses secrètes. */
export function HandOff({ to, children, id }: { to: Player; children: ReactNode; id: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(false), [id]);
  return (
    <AnimatePresence mode="wait">
      {!ready ? (
        <motion.div key="hand" initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 90 }} className="card flex flex-col items-center gap-4 p-8 text-center">
          <motion.div animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <Hand className="h-10 w-10 text-wine-500" />
          </motion.div>
          <p className="font-display text-2xl font-bold text-wine-700">Passe le téléphone à {PLAYER_NAMES[to]}</p>
          <p className="text-sm text-ink/60">Les réponses restent secrètes jusqu’à la révélation.</p>
          <Btn onClick={() => setReady(true)}>
            <Eye className="h-5 w-5" /> C’est moi, {PLAYER_NAMES[to]}
          </Btn>
        </motion.div>
      ) : (
        <motion.div key="content" initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Carte de question animée. */
export function QuestionCard({ children, k, kicker }: { children: ReactNode; k: string | number; kicker?: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={k}
        initial={{ opacity: 0, x: 80, rotate: 4, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, x: -80, rotate: -4, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="card relative mb-5 overflow-hidden p-6"
      >
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blush-100/70" />
        {kicker && <div className="relative mb-2">{kicker}</div>}
        <div className="relative">{children}</div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Champ de réponse libre + bouton d'envoi. */
export function AnswerInput({
  onSubmit,
  placeholder = 'Ta réponse…',
  busy,
  secret = false,
  resetKey,
  multiline = false,
}: {
  onSubmit: (v: string) => void;
  placeholder?: string;
  busy?: boolean;
  secret?: boolean;
  resetKey?: string | number;
  multiline?: boolean;
}) {
  const [v, setV] = useState('');
  const [show, setShow] = useState(!secret);
  useEffect(() => setV(''), [resetKey]);
  const send = () => v.trim() && onSubmit(v.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="space-y-3"
    >
      <div className="relative">
        {multiline ? (
          <textarea value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} rows={3} maxLength={300} className="input resize-none" autoFocus />
        ) : (
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            className="input pr-12"
            type={show ? 'text' : 'password'}
            autoComplete="off"
            autoFocus
          />
        )}
        {secret && !multiline && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/40" aria-label={show ? 'Masquer' : 'Afficher'}>
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      <Btn type="submit" disabled={busy || !v.trim()} className="btn-primary w-full">
        Valider
      </Btn>
    </form>
  );
}

export function SkipButton({ onClick, label = 'Passer cette question', busy }: { onClick: () => void; label?: string; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className="mx-auto mt-4 flex items-center gap-1 text-sm font-semibold text-ink/50 hover:text-wine-600">
      <SkipForward className="h-4 w-4" /> {label}
    </button>
  );
}

/** Choix de verdict (validation manuelle). */
export function VerdictButtons({
  options,
  suggestion,
  onPick,
  busy,
}: {
  options: Array<{ value: string; label: string; tone: 'good' | 'mid' | 'bad' }>;
  suggestion?: string;
  onPick: (v: string) => void;
  busy?: boolean;
}) {
  const tones = {
    good: 'bg-emerald-600 text-white',
    mid: 'bg-gold-300 text-wine-900',
    bad: 'bg-white text-wine-700 border border-blush-200',
  };
  return (
    <div className={`grid gap-3 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => (
        <motion.button
          key={o.value}
          whileTap={{ scale: 0.93 }}
          whileHover={{ y: -2 }}
          disabled={busy}
          onClick={() => onPick(o.value)}
          className={`relative flex min-h-[56px] flex-col items-center justify-center rounded-2xl px-2 py-3 text-sm font-bold shadow-sm ${tones[o.tone]}`}
        >
          {o.tone === 'good' ? <Check className="h-5 w-5" /> : o.tone === 'bad' ? <X className="h-5 w-5" /> : <span className="text-lg leading-none">½</span>}
          {o.label}
          {suggestion === o.value && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 right-2 rounded-full bg-wine-700 px-2 py-0.5 text-[10px] font-bold text-white">
              suggéré
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

/** Compte à rebours synchronisé sur l'horloge du serveur. */
export function Countdown({ deadline, totalSec, offset, onExpire }: { deadline: number; totalSec: number; offset: number; onExpire?: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, deadline - (Date.now() + offset)));
  useEffect(() => {
    let fired = false;
    const t = setInterval(() => {
      const l = Math.max(0, deadline - (Date.now() + offset));
      setLeft(l);
      if (l <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(t);
  }, [deadline, offset, onExpire]);
  const ratio = Math.min(1, left / (totalSec * 1000));
  const urgent = left < 10_000;
  return (
    <div className="mb-4 flex items-center gap-3">
      <motion.span animate={urgent ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }}>
        <Clock className={`h-5 w-5 ${urgent ? 'text-wine-600' : 'text-wine-400'}`} />
      </motion.span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blush-100">
        <motion.div className={`h-full rounded-full ${urgent ? 'bg-wine-600' : 'bg-wine-gradient'}`} animate={{ width: `${ratio * 100}%` }} transition={{ ease: 'linear', duration: 0.25 }} />
      </div>
      <span className={`w-10 text-right text-sm font-bold tabular-nums ${urgent ? 'text-wine-600' : 'text-wine-500'}`}>{Math.ceil(left / 1000)}s</span>
    </div>
  );
}

/** Petite barre de progression des manches. */
export function RoundProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex justify-between text-xs font-semibold text-wine-500">
        <span>
          Manche {Math.min(index + 1, total)} / {total}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < index ? '#9E2F4F' : i === index ? '#E77C96' : '#FDE2E7', scaleY: i === index ? 1.6 : 1 }}
          />
        ))}
      </div>
    </div>
  );
}

export function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  const map: Record<string, [string, string]> = {
    correct: ['Bonne réponse', 'bg-emerald-100 text-emerald-700'],
    done: ['Défi réussi', 'bg-emerald-100 text-emerald-700'],
    exact: ['Identique', 'bg-emerald-100 text-emerald-700'],
    partial: ['Presque', 'bg-gold-300/50 text-gold-700'],
    close: ['Proche', 'bg-gold-300/50 text-gold-700'],
    incorrect: ['Pas cette fois', 'bg-blush-100 text-wine-600'],
    failed: ['Pas cette fois', 'bg-blush-100 text-wine-600'],
    different: ['Différent', 'bg-blush-100 text-wine-600'],
    skipped: ['Passée', 'bg-ink/5 text-ink/50'],
  };
  const [label, cls] = map[result] ?? [result, 'bg-ink/5'];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}
