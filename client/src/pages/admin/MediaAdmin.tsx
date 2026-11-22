import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Download, ImagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { api, photoUrl, type Letter, type PhotoMeta, type TimelineEvent } from '@/services/api';
import { useToast } from '@/lib/toast';
import { resizeImage } from '@/lib/image';
import { Btn, Loader, Modal } from '@/components/ui';

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
      <Btn className="btn-primary mb-2 w-full" onClick={() => input.current?.click()} disabled={uploading > 0}>
        <ImagePlus className="h-5 w-5" /> {uploading ? `Envoi… (${uploading})` : 'Ajouter des photos'}
      </Btn>
      <p className="mb-4 text-xs text-ink/60">
        Les photos sont redimensionnées sur ton téléphone avant l’envoi, puis stockées en privé. Elles servent dans Memory of Us et la frise.
      </p>
      {!photos ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <AnimatePresence>
            {photos.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="group relative overflow-hidden rounded-2xl shadow-soft">
                <img src={photoUrl(p.id)} alt={p.caption ?? ''} loading="lazy" className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                <button onClick={() => remove(p.id)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-wine-600" aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
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
        sortOrder: draft.sortOrder ?? (events?.length ?? 0),
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

  return (
    <div>
      <Btn className="btn-primary mb-4 w-full" onClick={() => setDraft({ toConfirm: false })}>
        <Plus className="h-5 w-5" /> Ajouter un moment
      </Btn>
      {!events ? (
        <Loader />
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="card flex items-center gap-3 p-3">
              {e.photoId ? <img src={photoUrl(e.photoId)} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="h-12 w-12 rounded-xl bg-blush-100" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-blush-500">{e.date}</p>
                <p className="truncate text-sm font-semibold text-wine-700">{e.title}</p>
                {e.toConfirm && (
                  <span className="chip mt-1 bg-gold-300/40 py-0.5 text-gold-700">
                    <AlertCircle className="h-3 w-3" /> À confirmer
                  </span>
                )}
              </div>
              <button onClick={() => setDraft(e)} className="rounded-full p-2 text-wine-500 hover:bg-blush-50" aria-label="Modifier">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(e.id)} className="rounded-full p-2 text-ink/40 hover:bg-blush-50" aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
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
              <span className="label">Date (texte libre)</span>
              <input className="input" value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} placeholder="Ex. : 14 février 2026" />
            </label>
            <label className="block">
              <span className="label">Titre</span>
              <input className="input" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea className="input" rows={3} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Position dans la frise</span>
              <input type="number" className="input" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
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
              <input type="checkbox" checked={!!draft.toConfirm} onChange={(e) => setDraft({ ...draft, toConfirm: e.target.checked })} className="h-5 w-5 accent-wine-500" /> À confirmer
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
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/60">Aperçu</p>
        <h3 className="text-2xl font-bold">{letter.title || 'Sans titre'}</h3>
        <p className="mt-4 whitespace-pre-line font-display text-lg leading-relaxed text-ink/85">{letter.body || 'Le texte de la lettre apparaîtra ici.'}</p>
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
        <h3 className="text-lg font-bold">Exporter</h3>
        <p className="mt-1 text-sm text-ink/70">Télécharge un fichier JSON avec les contenus, la frise, la lettre et tout l’historique des parties.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href="/api/backup/export" className="btn-primary">
            <Download className="h-5 w-5" /> Sans les photos
          </a>
          <a href="/api/backup/export?photos=1" className="btn-white">
            <Download className="h-5 w-5" /> Avec les photos
          </a>
        </div>
        <p className="mt-2 text-xs text-ink/50">Les fichiers audio ne sont pas inclus : garde tes MP3 de ton côté.</p>
      </div>
      <div className="card p-5">
        <h3 className="text-lg font-bold">Importer</h3>
        <p className="mt-1 text-sm text-ink/70">Restaure une sauvegarde exportée depuis ce site.</p>
        <input ref={input} type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        <Btn className="btn-white mt-4 w-full" disabled={busy} onClick={() => input.current?.click()}>
          <Upload className="h-5 w-5" /> {busy ? 'Import…' : 'Choisir un fichier'}
        </Btn>
      </div>
    </div>
  );
}
