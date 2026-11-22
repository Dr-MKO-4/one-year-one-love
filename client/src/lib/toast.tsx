import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Info, TriangleAlert } from 'lucide-react';

type Kind = 'info' | 'love' | 'error';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
  action?: { label: string; onClick: () => void };
}

const Ctx = createContext<(text: string, kind?: Kind, action?: Toast['action']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'info', action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 8000 : 3800);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-soft backdrop-blur-md ${
                t.kind === 'error' ? 'bg-wine-700/95 text-white' : 'bg-white/95 text-ink'
              }`}
            >
              {t.kind === 'love' && <Heart className="h-5 w-5 shrink-0 fill-blush-400 text-blush-400" />}
              {t.kind === 'info' && <Info className="h-5 w-5 shrink-0 text-wine-500" />}
              {t.kind === 'error' && <TriangleAlert className="h-5 w-5 shrink-0" />}
              <span className="flex-1 text-sm font-medium">{t.text}</span>
              {t.action && (
                <button
                  className="rounded-full bg-wine-500 px-3 py-1 text-xs font-bold text-white"
                  onClick={() => {
                    t.action!.onClick();
                    setToasts((all) => all.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
