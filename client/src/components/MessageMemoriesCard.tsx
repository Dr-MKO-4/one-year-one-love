import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MessageCircleHeart } from 'lucide-react';
import { api, type MessageMemories } from '@/services/api';

/** Carte d'accueil : un extrait qui change tout seul, et l'accès aux conversations. */
export function MessageMemoriesCard() {
  const [messages, setMessages] = useState<MessageMemories | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    api.messages().then(setMessages).catch(() => undefined);
  }, []);

  const excerpts = messages?.published ? messages.excerpts : [];
  useEffect(() => {
    if (excerpts.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % excerpts.length), 6000);
    return () => clearInterval(t);
  }, [excerpts.length]);

  if (!messages?.published || (!excerpts.length && !messages.chats?.length)) return null;

  return (
    <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} className="mt-6">
      <Link to="/messages" className="group relative block overflow-hidden rounded-3xl bg-wine-900 p-6 text-white shadow-soft">
        <motion.div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blush-400 opacity-30 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
        <div className="relative flex items-center gap-2 text-sm font-semibold text-white/80">
          <MessageCircleHeart className="h-5 w-5" /> Nos messages
        </div>
        <div className="relative mt-3 min-h-[4.5rem]">
          <AnimatePresence mode="wait">
            {excerpts.length > 0 && (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.5 }}
                className="ml-auto max-w-[90%] rounded-3xl rounded-br-lg bg-white px-4 py-3 text-ink text-[15px] leading-snug"
              >
                {excerpts[i]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-bold">
          Lire les 30 raisons et nos conversations <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.section>
  );
}
