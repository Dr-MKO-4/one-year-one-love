import { motion } from 'framer-motion';
import { CheckCheck } from 'lucide-react';
import { PLAYER_NAMES } from '@shared/types';
import type { ChatCapture } from '@/services/api';

/**
 * Conversation affichée en bulles, directement sur la page.
 * Messages de Miguel à droite (bordeaux), ceux d'Adèle à gauche (blanc).
 */
export function ChatShot({ chat }: { chat: ChatCapture; compact?: boolean }) {
  return (
    <section aria-label={`Conversation : ${chat.title}`} className="mx-auto w-full max-w-2xl">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        className="mb-4 text-center"
      >
        <h2 className="text-2xl">{chat.title}</h2>
        {chat.caption && <p className="mt-1 text-sm text-ink/70">{chat.caption}</p>}
      </motion.header>
      <ol className="space-y-2.5">
        {chat.messages.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <li key={i}>
              {m.day && (
                <p className="my-4 text-center">
                  <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-wine-800">{m.day}</span>
                </p>
              )}
              <motion.div
                initial={{ opacity: 0, x: mine ? 30 : -30, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 pb-2 pt-3 text-[15px] leading-relaxed shadow-soft sm:max-w-[75%] ${
                    mine ? 'rounded-br-lg bg-wine-gradient text-white' : 'rounded-bl-lg border border-blush-100 bg-white text-ink'
                  }`}
                >
                  {m.reply && (
                    <div className={`mb-2 rounded-xl border-l-[3px] px-2.5 py-1.5 ${mine ? 'border-white/80 bg-white/15' : 'border-wine-500 bg-blush-50'}`}>
                      <p className={`truncate text-xs font-semibold ${mine ? 'text-white' : 'text-wine-700'}`}>
                        {m.reply.name.startsWith('adi') ? PLAYER_NAMES.adele : PLAYER_NAMES.miguel}
                      </p>
                      <p className={`truncate text-xs ${mine ? 'text-white/85' : 'text-ink/75'}`}>{m.reply.text}</p>
                    </div>
                  )}
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? 'text-white/70' : 'text-ink/55'}`}>
                    {m.time}
                    {mine && <CheckCheck className="h-3.5 w-3.5" aria-label="lu" />}
                  </p>
                </div>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
