import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatabaseBackup, Gamepad2, Image, Mail, Milestone, Music } from 'lucide-react';
import { Page } from '@/components/ui';
import { ContentAdmin } from './admin/ContentAdmin';
import { BackupAdmin, LetterAdmin, PhotosAdmin, TimelineAdmin } from './admin/MediaAdmin';
import { MusicAdmin } from './admin/MusicAdmin';

const TABS = [
  { id: 'jeux', label: 'Jeux', icon: Gamepad2, title: 'Contenus des jeux', intro: 'Questions, dilemmes, paires, défis et phrases de chaque jeu.' },
  { id: 'photos', label: 'Photos', icon: Image, title: 'Photos', intro: 'Les photos servent dans la frise et dans Memory of Us.' },
  { id: 'frise', label: 'Frise', icon: Milestone, title: 'Frise', intro: 'Seuls les moments confirmés apparaissent sur la frise.' },
  { id: 'lettre', label: 'Lettre', icon: Mail, title: 'Lettre d’accueil', intro: 'Elle n’apparaît sur l’accueil qu’une fois publiée.' },
  { id: 'musique', label: 'Musique', icon: Music, title: 'Playlist', intro: 'Les titres que vous écoutez ensemble.' },
  { id: 'sauvegarde', label: 'Sauvegarde', icon: DatabaseBackup, title: 'Sauvegarde', intro: 'Garder une copie de vos contenus et de vos parties.' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tabId = (TABS.some((t) => t.id === params.get('onglet')) ? params.get('onglet') : 'jeux') as TabId;
  const tab = TABS.find((t) => t.id === tabId)!;
  const activeRef = useRef<HTMLButtonElement>(null);

  // L'onglet actif reste visible même quand la barre défile horizontalement.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tabId]);

  return (
    <Page className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-wine-600">Configuration</p>
      <div role="tablist" aria-label="Sections de la configuration" className="-mx-4 mt-3 flex gap-1 overflow-x-auto border-b border-blush-100 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = t.id === tabId;
          return (
            <button
              key={t.id}
              ref={active ? activeRef : undefined}
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ onglet: t.id })}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                active ? 'border-wine-600 text-wine-800' : 'border-transparent text-ink/70 hover:text-wine-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mb-5 mt-5">
        <h1 className="text-2xl sm:text-3xl">{tab.title}</h1>
        <p className="mt-1 text-sm text-ink/75">{tab.intro}</p>
      </div>
      <div role="tabpanel">
        {tabId === 'jeux' && <ContentAdmin />}
        {tabId === 'photos' && <PhotosAdmin />}
        {tabId === 'frise' && <TimelineAdmin />}
        {tabId === 'lettre' && <LetterAdmin />}
        {tabId === 'musique' && <MusicAdmin />}
        {tabId === 'sauvegarde' && <BackupAdmin />}
      </div>
    </Page>
  );
}
