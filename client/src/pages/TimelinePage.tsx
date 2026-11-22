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
        <div ref={ref} className="relative pl-10 sm:pl-0">
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
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -left-[34px] top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-glow sm:left-1/2 sm:-translate-x-1/2"
                  >
                    <Heart className="h-4 w-4 fill-wine-500 text-wine-500" />
                  </motion.span>
                  <motion.article
                    initial={{ opacity: 0, x: left ? -60 : 60, rotate: left ? -3 : 3 }}
                    whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    whileHover={{ y: -4 }}
                    className="card w-full overflow-hidden sm:w-[calc(50%-2.5rem)]"
                  >
                    {e.photoId && <img src={photoUrl(e.photoId)} alt="" loading="lazy" className="h-48 w-full object-cover" />}
                    <div className="p-5">
                      <p className="font-script text-2xl text-blush-500">{e.date}</p>
                      <h2 className="text-xl font-bold">{e.title}</h2>
                      {e.description && <p className="mt-2 text-sm leading-relaxed text-ink/75">{e.description}</p>}
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
