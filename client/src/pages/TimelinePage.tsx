import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Milestone } from 'lucide-react';
import { api, photoUrl, type TimelineEvent } from '@/services/api';
import { Empty, Loader, Page, SectionTitle } from '@/components/ui';

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    api.timeline().then(setEvents).catch(() => setEvents([]));
  }, []);

  // Seuls les moments confirmés sont publiés sur la frise.
  const published = events?.filter((e) => !e.toConfirm) ?? [];
  const pending = (events?.length ?? 0) - published.length;

  return (
    <Page className="max-w-5xl">
      <SectionTitle kicker="Notre histoire" title="La frise de notre première année">
        {published.length > 1 ? `${published.length === 9 ? 'Neuf' : published.length} moments qui racontent le début de notre histoire.` : null}
      </SectionTitle>
      {pending > 0 && (
        <p className="mb-6 rounded-2xl border border-gold-300 bg-gold-300/20 px-4 py-3 text-sm text-gold-700">
          {pending} {pending > 1 ? 'moments attendent' : 'moment attend'} une confirmation avant d’apparaître ici.{' '}
          <Link to="/configuration?onglet=frise" className="font-semibold underline">
            Les vérifier
          </Link>
        </p>
      )}
      {!events ? (
        <Loader />
      ) : !published.length ? (
        <Empty icon={<Milestone className="h-6 w-6" />} title="La frise se prépare">
          Les moments apparaîtront ici une fois confirmés dans la configuration.
        </Empty>
      ) : (
        <ol ref={ref} className="relative">
          {/* Rail : à gauche sur mobile, au centre sur tablette et ordinateur. */}
          <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-blush-200 sm:left-1/2 sm:-translate-x-1/2" />
          <motion.span aria-hidden style={{ scaleY: line }} className="absolute bottom-2 left-[6px] top-2 w-1 origin-top rounded-full bg-wine-gradient sm:left-1/2 sm:-translate-x-1/2" />
          {published.map((e, i) => {
            const left = i % 2 === 0;
            return (
              <li key={e.id} className="relative grid grid-cols-[16px_1fr] gap-x-4 pb-8 last:pb-0 sm:grid-cols-[1fr_16px_1fr] sm:gap-x-8 sm:pb-12">
                {/* Date : au-dessus de la carte sur mobile, en face de la carte sur grand écran. */}
                <motion.p
                  initial={{ opacity: 0, x: left ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  className={`col-start-2 row-start-1 mb-1 text-sm font-semibold text-wine-700 sm:mb-0 sm:self-start sm:pt-3.5 sm:font-display sm:text-xl ${
                    left ? 'sm:col-start-3 sm:text-left' : 'sm:col-start-1 sm:text-right'
                  }`}
                >
                  {e.date}
                </motion.p>
                <motion.span
                  aria-hidden
                  initial={{ scale: 0 }}
                  whileInView={{ scale: [0, 1.4, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="relative z-10 col-start-1 row-span-2 row-start-1 mt-1 h-4 w-4 rounded-full border-2 border-wine-500 bg-cream sm:col-start-2 sm:row-span-1 sm:mt-5"
                />
                <motion.article
                  initial={{ opacity: 0, y: 30, x: left ? -40 : 40, rotate: left ? -2 : 2 }}
                  whileInView={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  whileHover={{ y: -4 }}
                  className={`card col-start-2 row-start-2 overflow-hidden sm:row-start-1 ${left ? 'sm:col-start-1' : 'sm:col-start-3'}`}
                >
                  {e.photoId && <img src={photoUrl(e.photoId)} alt="" loading="lazy" className="h-48 w-full object-cover sm:h-56" />}
                  <div className="p-4 sm:p-5">
                    <h2 className="text-xl">{e.title}</h2>
                    {e.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{e.description}</p>}
                  </div>
                </motion.article>
              </li>
            );
          })}
        </ol>
      )}
    </Page>
  );
}
