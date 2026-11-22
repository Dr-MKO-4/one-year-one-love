import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';

/** Fond animé : cœurs et étincelles qui s'élèvent doucement. */
export function FloatingHearts({ count = 14 }: { count?: number }) {
  const reduce = useReducedMotion();
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 10 + Math.random() * 22,
        duration: 14 + Math.random() * 16,
        delay: -Math.random() * 30,
        drift: (Math.random() - 0.5) * 80,
        sparkle: i % 4 === 0,
        opacity: 0.15 + Math.random() * 0.3,
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {items.map((h) => (
        <motion.div
          key={h.id}
          className="absolute bottom-[-40px]"
          style={{ left: `${h.left}%`, opacity: h.opacity }}
          animate={{ y: ['0vh', '-115vh'], x: [0, h.drift, 0], rotate: [0, h.drift / 4, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: 'linear' }}
        >
          {h.sparkle ? (
            <Sparkles style={{ width: h.size, height: h.size }} className="text-gold-400" />
          ) : (
            <Heart style={{ width: h.size, height: h.size }} className="fill-blush-300 text-blush-300" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Explosion de petits cœurs autour d'un point (retour visuel d'une bonne réponse). */
export function HeartBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(angle) * 90, y: Math.sin(angle) * 90, scale: [0, 1.2, 0.6], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <Heart className="h-5 w-5 fill-blush-400 text-blush-400" />
          </motion.span>
        );
      })}
    </div>
  );
}
