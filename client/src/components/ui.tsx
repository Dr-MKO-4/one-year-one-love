import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Transition de page commune : un simple fondu.
 * Pas de filtre ni de transformation durable : ils créeraient un repère de positionnement
 * pour les éléments fixes (dialogues, superpositions) rendus dans la page.
 * Le bas de page réserve la place de la barre mobile (navigation + lecteur).
 */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`mx-auto w-full max-w-3xl px-4 pb-44 pt-6 sm:px-6 md:pb-16 ${className}`}
    >
      {children}
    </motion.main>
  );
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
export const rise = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Bouton avec micro-interactions (rebond au toucher). */
export function Btn({ children, className = 'btn-primary', ...props }: HTMLMotionProps<'button'> & { children: ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.03 }}
      whileTap={{ scale: props.disabled ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/** Nombre qui s'anime jusqu'à sa valeur. */
export function AnimatedNumber({ value, duration = 1.2 }: { value: number | null; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(mv, value ?? 0, { duration, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [value, duration, mv]);
  if (value === null) return <span>–</span>;
  return <motion.span>{rounded}</motion.span>;
}

/** Anneau de score animé sur 100. */
export function ScoreRing({
  value,
  label,
  size = 120,
  stroke = 10,
  tone = 'wine',
  delay = 0,
}: {
  value: number | null;
  label?: string;
  size?: number;
  stroke?: number;
  tone?: 'wine' | 'blush' | 'gold';
  delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors = { wine: ['#D85A7B', '#6E1D36'], blush: ['#F2A2B4', '#D85A7B'], gold: ['#EBCB97', '#C9974F'] }[tone];
  const id = `ring-${tone}-${size}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={colors[0]} />
              <stop offset="1" stopColor={colors[1]} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#FDE2E7" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * (value ?? 0)) / 100 }}
            transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-wine-700" style={{ fontSize: size / 4 }}>
            <AnimatedNumber value={value} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-wine-500/70">/ 100</span>
        </div>
      </div>
      {label && <span className="text-sm font-semibold text-wine-700">{label}</span>}
    </div>
  );
}

/** Dialogue modal accessible, rendu au niveau de la fenêtre (portail). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Actions principales, toujours visibles en bas du panneau. */
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    // Focus sur le premier champ (ou le panneau) à l'ouverture.
    const t = setTimeout(() => {
      const first = focusables().find((el) => el.tagName !== 'BUTTON') ?? focusables()[0];
      (first ?? panelRef.current)?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-wine-900/45 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft outline-none sm:max-h-[88dvh] sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-blush-100 px-6 py-4">
              {title && (
                <h2 id={titleId} className="text-xl font-bold">
                  {title}
                </h2>
              )}
              <button onClick={onClose} className="ml-auto rounded-full p-2 hover:bg-blush-50" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="safe-bottom shrink-0 border-t border-blush-100 bg-white px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Loader({ label = 'Un instant…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-wine-600">
      <Heart className="h-12 w-12 animate-heartbeat fill-blush-400 text-blush-400" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {kicker && <p className="text-xs font-bold uppercase tracking-[0.18em] text-wine-600">{kicker}</p>}
      <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
      {children && <div className="mt-2 text-ink/80">{children}</div>}
    </div>
  );
}

/** Pluie de confettis en forme de cœurs pour les fins de partie. */
export function celebrate(intensity: 'soft' | 'big' = 'big') {
  const heart = confetti.shapeFromPath({ path: 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z' });
  const colors = ['#E77C96', '#D85A7B', '#9E2F4F', '#EBCB97', '#F9C5D0'];
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({ origin: { y: 0.7 }, colors, shapes: [heart, 'circle'], scalar: 1.2, ...opts, particleCount: Math.floor(220 * ratio) });
  if (intensity === 'soft') {
    fire(0.3, { spread: 70, startVelocity: 35 });
    return;
  }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 1 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.4 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className="rounded-full bg-blush-100 p-4 text-wine-500">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="text-sm text-ink/70">{children}</div>}
    </motion.div>
  );
}
