import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DatabaseBackup, Gamepad2, Image, Mail, Milestone, Music } from 'lucide-react';
import { Page, SectionTitle } from '@/components/ui';
import { ContentAdmin } from './admin/ContentAdmin';
import { BackupAdmin, LetterAdmin, PhotosAdmin, TimelineAdmin } from './admin/MediaAdmin';
import { MusicAdmin } from './admin/MusicAdmin';

const TABS = [
  { id: 'jeux', label: 'Jeux', icon: Gamepad2 },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'frise', label: 'Frise', icon: Milestone },
  { id: 'lettre', label: 'Accueil & lettre', icon: Mail },
  { id: 'musique', label: 'Musique', icon: Music },
  { id: 'sauvegarde', label: 'Sauvegarde', icon: DatabaseBackup },
] as const;

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as (typeof TABS)[number]['id']) ?? 'jeux';

  return (
    <Page className="max-w-4xl">
      <SectionTitle kicker="Configuration" title="Nos contenus">
        Questions, réponses de référence, défis, associations, photos, frise et musique : tout se modifie ici, sans toucher au code.
      </SectionTitle>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setParams({ onglet: t.id })}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${active ? 'text-white' : 'bg-white/70 text-wine-700'}`}
            >
              {active && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-wine-gradient" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'jeux' && <ContentAdmin />}
        {tab === 'photos' && <PhotosAdmin />}
        {tab === 'frise' && <TimelineAdmin />}
        {tab === 'lettre' && <LetterAdmin />}
        {tab === 'musique' && <MusicAdmin />}
        {tab === 'sauvegarde' && <BackupAdmin />}
      </motion.div>
    </Page>
  );
}
