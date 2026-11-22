import { motion } from 'framer-motion';
import { ArrowLeft, CheckCheck, Mic, MoreVertical, Paperclip, Phone, Smile } from 'lucide-react';
import type { ChatCapture } from '@/services/api';

/**
 * Capture d'écran de conversation, reconstituée en HTML (texte net, lisible, accessible).
 * Style d'une messagerie sombre : messages de Miguel à droite en violet-bleu, ceux d'Adèle à gauche.
 */
export function ChatShot({ chat, compact = false }: { chat: ChatCapture; compact?: boolean }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 30, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className="mx-auto w-full max-w-[400px]"
    >
      <div
        className="overflow-hidden rounded-[2rem] border-[6px] border-[#141018] shadow-[0_24px_60px_-20px_rgba(61,15,30,0.55)]"
        role="group"
        aria-label={`Conversation : ${chat.title}`}
      >
        {/* En-tête */}
        <div className="flex items-center gap-3 bg-[#2b1f4a] px-3 py-2.5 text-white">
          <ArrowLeft className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blush-300 to-wine-500 font-display text-sm" aria-hidden>
            A
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold">{chat.contact}</p>
            <p className="truncate text-xs text-white/60">{chat.status ?? 'en ligne'}</p>
          </div>
          <Phone className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          <MoreVertical className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
        </div>

        {/* Fil */}
        <ol
          className={`space-y-1.5 px-2.5 py-3 ${compact ? '' : 'min-h-[220px]'}`}
          style={{
            background:
              'radial-gradient(circle at 20% 10%, rgba(122,63,224,0.18), transparent 45%), radial-gradient(circle at 90% 80%, rgba(216,90,123,0.16), transparent 45%), #17121f',
          }}
        >
          {chat.messages.map((m, i) => {
            const mine = m.from === 'me';
            return (
              <li key={i}>
                {m.day && (
                  <p className="my-2 text-center">
                    <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white/90">{m.day}</span>
                  </p>
                )}
                <motion.div
                  initial={{ opacity: 0, x: mine ? 24 : -24, scale: 0.96 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.08, 0.6), type: 'spring', stiffness: 260, damping: 24 }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-3 pb-1.5 pt-2 text-[14.5px] leading-snug text-white shadow-sm ${
                      mine ? 'rounded-br-md bg-gradient-to-br from-[#8a4be6] to-[#4b6ef0]' : 'rounded-bl-md bg-[#2a2433]'
                    }`}
                  >
                    {m.reply && (
                      <div className={`mb-1.5 rounded-lg border-l-[3px] px-2 py-1 ${mine ? 'border-white/80 bg-white/15' : 'border-[#7ed3c8] bg-white/5'}`}>
                        <p className={`truncate text-[13px] font-semibold ${mine ? 'text-white' : 'text-[#7ed3c8]'}`}>{m.reply.name}</p>
                        <p className="truncate text-[13px] text-white/80">{m.reply.text}</p>
                      </div>
                    )}
                    <p className="whitespace-pre-line break-words">{m.text}</p>
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-white/65">
                      {m.time}
                      {mine && <CheckCheck className="h-3.5 w-3.5" aria-label="lu" />}
                    </p>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ol>

        {/* Barre de saisie (décorative) */}
        <div className="flex items-center gap-2 bg-[#17121f] px-2.5 pb-3" aria-hidden>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-[#2a2433] px-3 py-2 text-sm text-white/45">
            <Smile className="h-5 w-5" /> <span className="flex-1">Message</span> <Paperclip className="h-5 w-5" />
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4b6ef0] text-white">
            <Mic className="h-5 w-5" />
          </span>
        </div>
      </div>
      {(chat.title || chat.caption) && (
        <figcaption className="mt-3 px-2 text-center">
          <span className="block font-display text-lg text-wine-800">{chat.title}</span>
          {chat.caption && <span className="text-sm text-ink/70">{chat.caption}</span>}
        </figcaption>
      )}
    </motion.figure>
  );
}
