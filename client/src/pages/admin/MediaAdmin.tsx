import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowDown, ArrowUp, Check, Download, ImagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { api, photoUrl, type Letter, type PhotoMeta, type TimelineEvent } from '@/services/api';
import { useToast } from '@/lib/toast';
import { resizeImage } from '@/lib/image';
import { Btn, Empty, Loader, Modal, RowMenu } from '@/components/ui';

/* ------------------------------ Photos ------------------------------ */

export function PhotosAdmin() {
  const toast = useToast();
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.photos().then(setPhotos).catch(() => setPhotos([]));
  }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(files.length);
    for (const f of Array.from(files)) {
      try {
        const img = await resizeImage(f);
        const saved = await api.uploadPhoto({ ...img, caption: f.name.replace(/\.[^.]+$/, '') });
        setPhotos((p) => [saved, ...(p ?? [])]);
      } catch (e) {
        toast(`${f.name} : ${(e as Error).message}`, 'error');
      }
      setUploading((n) => n - 1);
    }
    if (input.current) input.current.value = '';
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette photo ? Les cartes Memory qui l’utilisent seront à mettre à jour.')) return;
    await api.deletePhoto(id).catch((e) => toast(e.message, 'error'));
    setPhotos((p) => p!.filter((x) => x.id !== id));
  };

  return (
    <div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Btn className="btn-primary" onClick={() => input.current?.click()} disabled={uploading > 0}>
          <ImagePlus className="h-5 w-5" /> {uploading ? `Envoi… (${uploading})` : 'Ajouter des photos'}
        </Btn>
        <p className="text-sm text-ink/75">Redimensionnées avant l’envoi, visibles par vous deux seulement.</p>
      </div>
      {!photos ? (
        <Loader />
      ) : !photos.length ? (
        <Empty icon={<ImagePlus className="h-6 w-6" />} title="Aucune photo pour l’instant">
          <p>Ajoute vos photos, puis relie-les à un moment de la frise ou à une paire de Memory of Us (une photo et sa date, par exemple).</p>
        </Empty>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          <AnimatePresence>
            {photos.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="group relative overflow-hidden rounded-2xl shadow-soft">
                <img src={photoUrl(p.id)} alt={p.caption ?? ''} loading="lazy" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                <button onClick={() => remove(p.id)} className="absolute right-1.5 top-1.5 rounded-full bg-white p-2 text-wine-700 shadow-sm" aria-label="Supprimer la photo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Frise ------------------------------- */

type EventDraft = Partial<TimelineEvent>;

export function TimelineAdmin() {
  const toast = useToast();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  useEffect(() => {
    api.timeline().then(setEvents).catch(() => setEvents([]));
    api.photos().then(setPhotos).catch(() => undefined);
  }, []);

  const save = async () => {
    if (!draft) return;
    try {
      const body = {
        date: draft.date ?? '',
        title: draft.title ?? '',
        description: draft.description || null,
        photoId: draft.photoId || null,
        toConfirm: !!draft.toConfirm,
        sortOrder: draft.sortOrder ?? (events?.length ? Math.max(...events.map((e) => e.sortOrder)) + 1 : 0),
      };
      const saved = draft.id ? await api.updateEvent(draft.id, body) : await api.createEvent(body);
      setEvents((l) => (draft.id ? l!.map((e) => (e.id === saved.id ? saved : e)) : [...(l ?? []), saved]).sort((a, b) => a.sortOrder - b.sortOrder));
      setDraft(null);
      toast('Moment enregistré', 'love');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce moment ?')) return;
    await api.deleteEvent(id).catch((e) => toast(e.message, 'error'));
    setEvents((l) => l!.filter((e) => e.id !== id));
  };

  const patch = async (id: string, body: Partial<TimelineEvent>) => {
    const saved = await api.updateEvent(id, body).catch((e) => toast(e.message, 'error'));
    if (saved) setEvents((l) => l!.map((e) => (e.id === id ? saved : e)));
  };

  /** Déplace un moment d'un cran et renumérote l'ordre. */
  const move = async (i: number, dir: -1 | 1) => {
    if (!events) return;
    const j = i + dir;
    if (j < 0 || j >= events.length) return;
    const next = [...events];
    [next[i], next[j]] = [next[j], next[i]];
    const renumbered = next.map((e, k) => ({ ...e, sortOrder: k }));
    setEvents(renumbered);
    await Promise.all(renumbered.map((e) => api.updateEvent(e.id, { sortOrder: e.sortOrder })));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/75">{events ? `${events.filter((e) => !e.toConfirm).length} publiés sur ${events.length}` : ''}</p>
        <Btn className="btn-primary" onClick={() => setDraft({ toConfirm: false })}>
          <Plus className="h-5 w-5" /> Ajouter un moment
        </Btn>
      </div>
      {!events ? (
        <Loader />
      ) : (
        <ol className="space-y-2">
          {events.map((e, i) => (
            <li key={e.id} className="card flex items-center gap-2 p-3 sm:gap-3">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-wine-700 hover:bg-blush-50 disabled:opacity-25" aria-label={`Déplacer « ${e.title} » plus tôt`}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === events.length - 1} className="rounded-lg p-1.5 text-wine-700 hover:bg-blush-50 disabled:opacity-25" aria-label={`Déplacer « ${e.title} » plus tard`}>
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              {e.photoId ? <img src={photoUrl(e.photoId)} alt="" className="hidden h-12 w-12 rounded-xl object-cover sm:block" /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-wine-700">{e.date}</p>
                <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${e.toConfirm ? 'bg-gold-300/40 text-gold-700' : 'bg-emerald-50 text-emerald-800'}`}>
                  {e.toConfirm ? <AlertCircle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {e.toConfirm ? 'À confirmer : masqué' : 'Publié'}
                </span>
              </div>
              {e.toConfirm && (
                <button onClick={() => patch(e.id, { toConfirm: false })} className="hidden min-h-[40px] rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 sm:block">
                  Confirmer
                </button>
              )}
              <button onClick={() => setDraft(e)} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-wine-700 hover:bg-blush-50">
                <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Modifier</span>
                <span className="sr-only sm:hidden">Modifier</span>
              </button>
              <RowMenu
                label={`Autres actions pour « ${e.title} »`}
                items={[
                  e.toConfirm
                    ? { label: 'Confirmer et publier', icon: Check, onClick: () => patch(e.id, { toConfirm: false }) }
                    : { label: 'Repasser à confirmer', icon: AlertCircle, onClick: () => patch(e.id, { toConfirm: true }) },
                  { label: 'Supprimer', icon: Trash2, onClick: () => remove(e.id), danger: true },
                ]}
              />
            </li>
          ))}
        </ol>
      )}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Modifier le moment' : 'Nouveau moment'}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-soft" onClick={() => setDraft(null)}>
              Annuler
            </button>
            <Btn className="btn-primary" onClick={save} disabled={!draft?.date?.trim() || !draft?.title?.trim()}>
              Enregistrer
            </Btn>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <label className="block">
              <span className="label">Date</span>
              <input className="input" value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} placeholder="14 février 2026, ou février 2026" />
            </label>
            <label className="block">
              <span className="label">Titre</span>
              <input className="input" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea className="input" rows={3} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            {photos.length > 0 && (
              <div>
                <span className="label">Photo (facultatif)</span>
                <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto">
                  <button type="button" onClick={() => setDraft({ ...draft, photoId: null })} className={`aspect-square rounded-xl bg-blush-50 text-xs font-semibold text-wine-600 ${!draft.photoId ? 'ring-[3px] ring-inset ring-wine-600' : ''}`}>
                    Aucune
                  </button>
                  {photos.map((p) => (
                    <button type="button" key={p.id} onClick={() => setDraft({ ...draft, photoId: p.id })} className={`overflow-hidden rounded-xl ${draft.photoId === p.id ? 'ring-[3px] ring-inset ring-wine-600' : ''}`}>
                      <img src={photoUrl(p.id)} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold text-wine-700">
              <input type="checkbox" checked={!!draft.toConfirm} onChange={(e) => setDraft({ ...draft, toConfirm: e.target.checked })} className="h-5 w-5 accent-wine-500" /> À confirmer (masqué sur la frise en attendant)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------ Lettre ------------------------------ */

export function LetterAdmin() {
  const toast = useToast();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.letter().then((l) => setLetter(l ? { ...l, published: !!l.published } : { title: 'Pour toi', body: '', signature: '', published: false }));
  }, []);
  if (!letter) return <Loader />;

  const save = async (next: Letter) => {
    setSaving(true);
    try {
      const saved = await api.saveLetter(next);
      setLetter({ ...saved, published: !!saved.published });
      toast(next.published ? 'Lettre publiée sur l’accueil' : 'Brouillon enregistré', 'love');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${letter.published ? 'bg-emerald-100 text-emerald-800' : 'bg-gold-300/40 text-gold-700'}`}>
          {letter.published ? 'Publiée sur l’accueil' : 'Brouillon : invisible sur l’accueil'}
        </span>
        <p className="flex-1 text-sm text-ink/75">
          {letter.published ? 'Adèle peut ouvrir cette lettre depuis l’accueil.' : 'Rien ne s’affiche sur l’accueil tant que la lettre n’est pas publiée.'}
        </p>
      </div>
      <div className="card space-y-4 p-5">
        <label className="block">
          <span className="label">Titre</span>
          <input className="input" value={letter.title} onChange={(e) => setLetter({ ...letter, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Texte</span>
          <textarea className="input text-base leading-relaxed" rows={12} value={letter.body} onChange={(e) => setLetter({ ...letter, body: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Signature</span>
          <input className="input" value={letter.signature} onChange={(e) => setLetter({ ...letter, signature: e.target.value })} />
        </label>
      </div>
      <section aria-label="Aperçu de la lettre" className="rounded-3xl border border-blush-200 bg-white p-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/70">Aperçu</p>
        <h3 className="text-2xl font-bold">{letter.title || 'Sans titre'}</h3>
        <p className="mt-4 whitespace-pre-line font-letter text-lg leading-relaxed text-ink/85">{letter.body || 'Le texte de la lettre apparaîtra ici.'}</p>
        {letter.signature && <p className="mt-4 text-right font-script text-3xl text-wine-600">{letter.signature}</p>}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Btn className="btn-white" disabled={saving} onClick={() => save({ ...letter, published: false })}>
          {letter.published ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}
        </Btn>
        <Btn className="btn-primary" disabled={saving || !letter.body.trim()} onClick={() => save({ ...letter, published: true })}>
          {letter.published ? 'Mettre à jour la lettre publiée' : 'Publier sur l’accueil'}
        </Btn>
      </div>
    </div>
  );
}

/* ----------------------------- Sauvegarde ---------------------------- */

export function BackupAdmin() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm('Importer cette sauvegarde ? Les éléments existants avec le même identifiant seront remplacés.')) return;
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      const r = await api.importBackup(data);
      toast(`Import terminé : ${r.imported.sessions} parties, ${r.imported.content} contenus`, 'love');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-xl">Télécharger une copie</h2>
        <p className="mt-1 text-sm text-ink/80">
          Un fichier avec les contenus des jeux, la frise, la lettre et tout l’historique des parties. Les fichiers audio ne sont jamais inclus.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a href="/api/backup/export?photos=1" className="rounded-2xl border border-blush-200 p-4 hover:bg-blush-50">
            <span className="flex items-center gap-2 font-semibold text-wine-800">
              <Download className="h-5 w-5" /> Copie complète
            </span>
            <span className="mt-1 block text-sm text-ink/75">Avec les photos. Fichier plus lourd, à garder en lieu sûr.</span>
          </a>
          <a href="/api/backup/export" className="rounded-2xl border border-blush-200 p-4 hover:bg-blush-50">
            <span className="flex items-center gap-2 font-semibold text-wine-800">
              <Download className="h-5 w-5" /> Copie légère
            </span>
            <span className="mt-1 block text-sm text-ink/75">Sans les photos. Pratique pour garder l’historique des parties.</span>
          </a>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-xl">Restaurer une copie</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/80">
          <li>Choisis un fichier téléchargé depuis cette page.</li>
          <li>Confirme : les éléments déjà présents avec le même identifiant sont remplacés, les autres sont conservés.</li>
          <li>Un message indique le nombre de parties et de contenus restaurés.</li>
        </ol>
        <input ref={input} type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        <Btn className="btn-white mt-4" disabled={busy} onClick={() => input.current?.click()}>
          <Upload className="h-5 w-5" /> {busy ? 'Restauration…' : 'Choisir le fichier de sauvegarde'}
        </Btn>
      </div>
    </div>
  );
}
