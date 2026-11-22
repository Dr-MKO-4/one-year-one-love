import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Milestone } from 'lucide-react';
import { api, photoUrl, type TimelineEvent } from '@/services/api';
import { Empty, Loader, Page, SectionTitle } from '@/components/ui';

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);

  useEffect(() => {
    api.timeline().then(setEvents).catch(() => setEvents([]));
  }, []);

  // Seuls les moments confirmés sont publiés sur la frise.
  const published = events?.filter((e) => !e.toConfirm) ?? [];
  const pending = (events?.length ?? 0) - published.length;

  return (
    <Page>
      <SectionTitle kicker="Notre histoire" title="La frise de notre première année" />
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
        <ol className="relative">
          {/* Rail vertical : à gauche sur mobile, entre la date et le récit sur ordinateur. */}
          <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-blush-200 sm:left-[163px]" />
          {published.map((e) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative grid grid-cols-[16px_1fr] gap-x-4 pb-8 last:pb-0 sm:grid-cols-[144px_16px_1fr] sm:gap-x-3"
            >
              <p className="col-start-2 mb-1 text-sm font-semibold text-wine-700 sm:col-start-1 sm:row-start-1 sm:mb-0 sm:pt-4 sm:text-right">{e.date}</p>
              <span aria-hidden className="col-start-1 row-span-2 row-start-1 mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-wine-500 bg-cream sm:col-start-2 sm:row-span-1 sm:mt-[18px]" />
              <article className="card col-start-2 overflow-hidden sm:col-start-3 sm:row-start-1">
                {e.photoId && <img src={photoUrl(e.photoId)} alt="" loading="lazy" className="h-48 w-full object-cover sm:h-56" />}
                <div className="p-4 sm:p-5">
                  <h2 className="text-xl">{e.title}</h2>
                  {e.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{e.description}</p>}
                </div>
              </article>
            </motion.li>
          ))}
        </ol>
      )}
    </Page>
  );
}
