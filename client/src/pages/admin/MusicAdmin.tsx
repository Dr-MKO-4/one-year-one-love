import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, FileAudio, Pencil, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { api, type Track } from '@/services/api';
import { useToast } from '@/lib/toast';
import { Btn, Loader } from '@/components/ui';

const SUPPORTED = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i;
const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–');

export function MusicAdmin() {
  const toast = useToast();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ id: string; title: string; artist: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = () => api.tracks().then(setTracks).catch(() => setTracks([]));
  useEffect(() => {
    load();
  }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const all = Array.from(files);
    // Ne garde que les formats lus par le lecteur, et ignore les fichiers vides (ex. .vm.au).
    const list = all.filter((f) => f.size > 0 && SUPPORTED.test(f.name));
    const skipped = all.length - list.length;
    if (skipped) toast(`${skipped} fichier(s) ignoré(s) : format non pris en charge ou fichier vide`, 'info');
    if (!list.length) {
      if (input.current) input.current.value = '';
      return;
    }
    setUploading(list.map((f) => f.name));
    for (const f of list) {
      try {
        if (f.size > 40 * 1024 * 1024) throw new Error('fichier trop volumineux (40 Mo max)');
        await api.uploadTrack(f);
      } catch (e) {
        toast(`${f.name} : ${(e as Error).message}`, 'error');
      }
      setUploading((u) => u.filter((n) => n !== f.name));
    }
    if (input.current) input.current.value = '';
    await load();
    toast('Playlist mise à jour pour vous deux', 'love');
  };

  const move = async (i: number, dir: -1 | 1) => {
    if (!tracks) return;
    const j = i + dir;
    if (j < 0 || j >= tracks.length) return;
    const reordered = [...tracks];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    setTracks(reordered);
    await Promise.all(reordered.map((t, k) => (t.sortOrder !== k ? api.updateTrack(t.id, { sortOrder: k }) : null)));
    load();
  };

  const saveEdit = async () => {
    if (!edit) return;
    await api.updateTrack(edit.id, { title: edit.title, artist: edit.artist }).catch((e) => toast(e.message, 'error'));
    setEdit(null);
    load();
  };

  return (
    <div>
      <input ref={input} type="file" accept=".mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <div className="card mb-4 p-4 text-sm text-ink/70">
        <p>
          La musique est <strong>partagée</strong> : quand l’un de vous lance, met en pause, avance ou zappe, le téléphone de l’autre suit en même temps. Si personne n’est connecté, elle se met en pause toute seule.
        </p>
        <p className="mt-2">La playlist correspond exactement aux fichiers du dossier musique (volume Railway en ligne). Formats : mp3, m4a, aac, ogg, opus, wav, flac.</p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Btn className="btn-primary" disabled={uploading.length > 0} onClick={() => input.current?.click()}>
          <Upload className="h-5 w-5" /> {uploading.length ? `Envoi (${uploading.length})…` : 'Ajouter des titres'}
        </Btn>
        <Btn
          className="btn-white"
          disabled={scanning}
          onClick={async () => {
            setScanning(true);
            try {
              setTracks(await api.rescanTracks());
              toast('Dossier relu', 'info');
            } catch (e) {
              toast((e as Error).message, 'error');
            } finally {
              setScanning(false);
            }
          }}
        >
          <RefreshCw className={`h-5 w-5 ${scanning ? 'animate-spin' : ''}`} /> Relire le dossier
        </Btn>
      </div>

      {!tracks ? (
        <Loader />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {tracks.map((t, i) => (
              <motion.li key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="card flex items-center gap-2 p-3">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-wine-400 disabled:opacity-20" aria-label="Monter">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === tracks.length - 1} className="rounded p-0.5 text-wine-400 disabled:opacity-20" aria-label="Descendre">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine-gradient text-white">
                  <FileAudio className="h-5 w-5" />
                </span>
                {edit?.id === t.id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input className="input py-1.5 text-sm" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} aria-label="Titre" />
                    <input className="input py-1.5 text-sm" value={edit.artist} onChange={(e) => setEdit({ ...edit, artist: e.target.value })} aria-label="Artiste" />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-wine-700">{t.title}</p>
                    <p className="truncate text-xs text-ink/60">
                      {t.artist} · {fmt(t.durationSec)}
                      {t.sizeBytes ? ` · ${(t.sizeBytes / 1024 / 1024).toFixed(1)} Mo` : ''}
                    </p>
                    <p className="truncate text-[10px] text-ink/40">{t.fileName}</p>
                  </div>
                )}
                {edit?.id === t.id ? (
                  <>
                    <button onClick={saveEdit} className="rounded-full p-2 text-emerald-600 hover:bg-blush-50" aria-label="Enregistrer">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEdit(null)} className="rounded-full p-2 text-ink/40 hover:bg-blush-50" aria-label="Annuler">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEdit({ id: t.id, title: t.title, artist: t.artist })} className="rounded-full p-2 text-wine-500 hover:bg-blush-50" aria-label="Renommer">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer « ${t.title} » ? Le fichier sera effacé du dossier musique.`)) return;
                        await api.deleteTrack(t.id).catch((e) => toast(e.message, 'error'));
                        load();
                      }}
                      className="rounded-full p-2 text-ink/40 hover:bg-blush-50 hover:text-wine-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
