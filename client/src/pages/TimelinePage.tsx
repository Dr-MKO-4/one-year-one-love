import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Heart, Milestone } from 'lucide-react';
import { api, photoUrl, type TimelineEvent } from '@/services/api';
import { Empty, Loader, Page, SectionTitle } from '@/components/ui';

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    api.timeline().then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <Page>
      <SectionTitle kicker="Notre histoire" title="La frise de notre première année" />
      {!events ? (
        <Loader />
      ) : !events.length ? (
        <Empty icon={<Milestone className="h-6 w-6" />} title="La frise est vide">
          Ajoute des moments depuis la configuration.
        </Empty>
      ) : (
        <div ref={ref} className="relative overflow-x-clip pl-9 sm:pl-0">
          <div className="absolute bottom-0 left-4 top-0 w-1 rounded-full bg-blush-100 sm:left-1/2 sm:-translate-x-1/2" />
          <motion.div style={{ scaleY: line }} className="absolute bottom-0 left-4 top-0 w-1 origin-top rounded-full bg-wine-gradient sm:left-1/2 sm:-translate-x-1/2" />
          <ul className="space-y-10">
            {events.map((e, i) => {
              const left = i % 2 === 0;
              return (
                <li key={e.id} className={`relative sm:flex ${left ? 'sm:justify-start' : 'sm:justify-end'}`}>
                  <motion.span
                    initial={{ scale: 0.3, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.25 }}
                    className="absolute -left-[34px] top-5 flex h-8 w-8 items-center justify-center rounded-full border border-blush-200 bg-white sm:left-1/2 sm:-translate-x-1/2"
                  >
                    <Heart className="h-4 w-4 fill-wine-500 text-wine-500" />
                  </motion.span>
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="card w-full overflow-hidden sm:w-[calc(50%-2.5rem)]"
                  >
                    {e.photoId && <img src={photoUrl(e.photoId)} alt="" loading="lazy" className="h-48 w-full object-cover" />}
                    <div className="p-5">
                      <p className="text-sm font-bold uppercase tracking-wider text-wine-600">{e.date}</p>
                      <h2 className="text-xl font-bold">{e.title}</h2>
                      {e.description && <p className="mt-2 text-sm leading-relaxed text-ink/80">{e.description}</p>}
                    </div>
                  </motion.article>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Page>
  );
}
