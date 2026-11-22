import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  CHALLENGE_CATEGORY_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  GAMES,
  GAME_IDS,
  type ContentItem,
  type Difficulty,
  type GameId,
  type MemorySide,
} from '@shared/types';
import { api, photoUrl, type PhotoMeta } from '@/services/api';
import { useToast } from '@/lib/toast';
import { Btn, Loader, Modal, RowMenu } from '@/components/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Draft = { id?: string; difficulty: Difficulty; active: boolean; toConfirm: boolean; data: any };

const EMPTY: Record<GameId, () => any> = {
  'who-knows-who': () => ({ text: '', about: 'both', answers: {} }),
  'would-you-rather': () => ({ a: '', b: '' }),
  'memory-of-us': () => ({ left: { kind: 'photo', value: '' }, right: { kind: 'date', value: '' }, caption: '' }),
  'do-you-remember': () => ({ text: '', kind: 'free', choices: [], answer: '', keywords: [], allowPartial: false }),
  'love-challenges': () => ({ text: '', category: 'romantic', target: 'individual', points: 10, allowPartial: true }),
  'complete-my-sentence': () => ({ prompt: '', keywordGroups: [] }),
};

const UNIT: Record<GameId, string> = {
  'who-knows-who': 'questions',
  'would-you-rather': 'dilemmes',
  'memory-of-us': 'paires',
  'do-you-remember': 'questions',
  'love-challenges': 'défis',
  'complete-my-sentence': 'phrases',
};

const SIDE_LABEL: Record<MemorySide['kind'], string> = { photo: 'Photo', date: 'Date', place: 'Lieu', memory: 'Souvenir', text: 'Texte' };

function summary(gameId: GameId, d: any): { title: string; sub?: string } {
  switch (gameId) {
    case 'who-knows-who':
      return {
        title: d.text,
        sub: [d.answers?.miguel && `Miguel : ${d.answers.miguel}`, d.answers?.adele && `Adèle : ${d.answers.adele}`].filter(Boolean).join(' · ') || 'Réponses à enregistrer pendant le jeu',
      };
    case 'would-you-rather':
      return { title: `${d.a} ou ${d.b}` };
    case 'memory-of-us':
      return { title: `${d.left.kind === 'photo' ? 'Photo' : d.left.value}  ↔  ${d.right.kind === 'photo' ? 'Photo' : d.right.value}`, sub: d.caption };
    case 'do-you-remember':
      return { title: d.text, sub: `${d.kind === 'mcq' ? 'Choix multiple' : 'Réponse libre'}${d.answer ? ` · Réponse : ${d.answer}` : ' · Réponse à enregistrer en jeu'}` };
    case 'love-challenges':
      return { title: d.text, sub: `${CHALLENGE_CATEGORY_LABELS[d.category as keyof typeof CHALLENGE_CATEGORY_LABELS]} · ${d.target === 'couple' ? 'À deux' : 'Individuel'} · ${d.points} pts` };
    case 'complete-my-sentence':
      return { title: d.prompt, sub: d.keywordGroups?.length ? `${d.keywordGroups.length} groupe(s) de mots-clés` : undefined };
  }
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const commas = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/70">{hint}</span>}
    </label>
  );
}

function SideEditor({ side, onChange, photos }: { side: MemorySide; onChange: (s: MemorySide) => void; photos: PhotoMeta[] }) {
  return (
    <div className="space-y-2 rounded-2xl bg-blush-50 p-3">
      <select className="input py-2" value={side.kind} onChange={(e) => onChange({ kind: e.target.value as MemorySide['kind'], value: '' })}>
        {Object.entries(SIDE_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      {side.kind === 'photo' ? (
        photos.length ? (
          <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
            {photos.map((p) => (
              <button type="button" key={p.id} onClick={() => onChange({ kind: 'photo', value: p.id })} className={`overflow-hidden rounded-xl ${side.value === p.id ? 'ring-[3px] ring-inset ring-wine-600' : ''}`}>
                <img src={photoUrl(p.id)} alt={p.caption ?? ''} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink/70">Ajoute d’abord des photos dans l’onglet Photos.</p>
        )
      ) : (
        <input className="input" value={side.value} maxLength={200} onChange={(e) => onChange({ ...side, value: e.target.value })} placeholder={SIDE_LABEL[side.kind]} />
      )}
    </div>
  );
}

function DataForm({ gameId, draft, set, photos }: { gameId: GameId; draft: Draft; set: (d: any) => void; photos: PhotoMeta[] }) {
  const d = draft.data;
  const up = (patch: any) => set({ ...d, ...patch });
  switch (gameId) {
    case 'who-knows-who':
      return (
        <>
          <Field label="Question (à la première personne)" hint="Ex. : « Quel est mon plat préféré ? »">
            <input className="input" value={d.text} onChange={(e) => up({ text: e.target.value })} />
          </Field>
          <Field label="La question concerne">
            <select className="input" value={d.about} onChange={(e) => up({ about: e.target.value })}>
              <option value="both">Miguel et Adèle</option>
              <option value="miguel">Miguel seulement</option>
              <option value="adele">Adèle seulement</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.about !== 'adele' && (
              <Field label="Réponse de Miguel" hint="Vide : elle sera demandée en jeu">
                <input className="input" value={d.answers?.miguel ?? ''} onChange={(e) => up({ answers: { ...d.answers, miguel: e.target.value || undefined } })} />
              </Field>
            )}
            {d.about !== 'miguel' && (
              <Field label="Réponse d’Adèle" hint="Vide : elle sera demandée en jeu">
                <input className="input" value={d.answers?.adele ?? ''} onChange={(e) => up({ answers: { ...d.answers, adele: e.target.value || undefined } })} />
              </Field>
            )}
          </div>
        </>
      );
    case 'would-you-rather':
      return (
        <>
          <Field label="Première possibilité">
            <input className="input" value={d.a} onChange={(e) => up({ a: e.target.value })} />
          </Field>
          <Field label="Deuxième possibilité">
            <input className="input" value={d.b} onChange={(e) => up({ b: e.target.value })} />
          </Field>
        </>
      );
    case 'memory-of-us':
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Carte 1">
              <SideEditor side={d.left} photos={photos} onChange={(left) => up({ left })} />
            </Field>
            <Field label="Carte 2">
              <SideEditor side={d.right} photos={photos} onChange={(right) => up({ right })} />
            </Field>
          </div>
          <Field label="Légende (facultatif)">
            <input className="input" value={d.caption ?? ''} onChange={(e) => up({ caption: e.target.value })} />
          </Field>
        </>
      );
    case 'do-you-remember':
      return (
        <>
          <Field label="Question">
            <input className="input" value={d.text} onChange={(e) => up({ text: e.target.value })} />
          </Field>
          <Field label="Type">
            <select className="input" value={d.kind} onChange={(e) => up({ kind: e.target.value })}>
              <option value="free">Réponse libre</option>
              <option value="mcq">Choix multiple</option>
            </select>
          </Field>
          {d.kind === 'mcq' && (
            <Field label="Choix (un par ligne)">
              <textarea className="input" rows={4} value={(d.choices ?? []).join('\n')} onChange={(e) => up({ choices: e.target.value.split('\n') })} />
            </Field>
          )}
          <Field label="Bonne réponse" hint={d.kind === 'mcq' ? 'Doit être identique à l’un des choix' : 'Vide : elle pourra être enregistrée pendant le jeu'}>
            <input className="input" value={d.answer ?? ''} onChange={(e) => up({ answer: e.target.value })} />
          </Field>
          {d.kind === 'free' && (
            <>
              <Field label="Mots-clés acceptés (séparés par des virgules)">
                <input className="input" value={(d.keywords ?? []).join(', ')} onChange={(e) => up({ keywords: commas(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-wine-700">
                <input type="checkbox" checked={!!d.allowPartial} onChange={(e) => up({ allowPartial: e.target.checked })} className="h-5 w-5 accent-wine-500" />
                Autoriser les réponses partiellement correctes
              </label>
            </>
          )}
          <Field label="Points (facultatif)" hint="Par défaut : 10, 15 ou 20 selon la difficulté">
            <input type="number" min={1} max={100} className="input" value={d.points ?? ''} onChange={(e) => up({ points: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        </>
      );
    case 'love-challenges':
      return (
        <>
          <Field label="Consigne du défi">
            <textarea className="input" rows={3} value={d.text} onChange={(e) => up({ text: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Catégorie">
              <select className="input" value={d.category} onChange={(e) => up({ category: e.target.value })}>
                {Object.entries(CHALLENGE_CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pour qui">
              <select className="input" value={d.target} onChange={(e) => up({ target: e.target.value })}>
                <option value="individual">Individuel (score personnel)</option>
                <option value="couple">À deux (score commun)</option>
              </select>
            </Field>
            <Field label="Points">
              <input type="number" min={1} max={100} className="input" value={d.points} onChange={(e) => up({ points: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Chrono en secondes (facultatif)">
              <input type="number" min={10} max={1800} className="input" value={d.durationSec ?? ''} onChange={(e) => up({ durationSec: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
          </div>
          <Field label="Mots interdits (séparés par des virgules)">
            <input className="input" value={(d.forbiddenWords ?? []).join(', ')} onChange={(e) => up({ forbiddenWords: commas(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-wine-700">
            <input type="checkbox" checked={!!d.allowPartial} onChange={(e) => up({ allowPartial: e.target.checked })} className="h-5 w-5 accent-wine-500" />
            Autoriser la réussite partielle (moitié des points)
          </label>
        </>
      );
    case 'complete-my-sentence':
      return (
        <>
          <Field label="Début de phrase" hint="Ex. : « Si nous partions demain, je choisirais… »">
            <input className="input" value={d.prompt} onChange={(e) => up({ prompt: e.target.value })} />
          </Field>
          <Field label="Groupes de mots-clés équivalents" hint="Un groupe par ligne, mots séparés par des virgules. Ex. : plage, mer, océan">
            <textarea className="input" rows={4} value={(d.keywordGroups ?? []).map((g: string[]) => g.join(', ')).join('\n')} onChange={(e) => up({ keywordGroups: lines(e.target.value).map(commas) })} />
          </Field>
        </>
      );
  }
}

function clean(gameId: GameId, d: any) {
  if (gameId === 'do-you-remember') {
    const choices = (d.choices ?? []).map((c: string) => c.trim()).filter(Boolean);
    return { ...d, choices: d.kind === 'mcq' ? choices : undefined, answer: d.answer?.trim() || undefined, keywords: d.keywords?.length ? d.keywords : undefined };
  }
  if (gameId === 'memory-of-us') return { ...d, caption: d.caption?.trim() || undefined };
  if (gameId === 'love-challenges') return { ...d, forbiddenWords: d.forbiddenWords?.length ? d.forbiddenWords : undefined };
  return d;
}

export function ContentAdmin() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const gameId = (GAME_IDS.includes(params.get('jeu') as GameId) ? params.get('jeu') : 'who-knows-who') as GameId;
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(null);
    api.content(gameId).then(setItems).catch(() => setItems([]));
    if (gameId === 'memory-of-us') api.photos().then(setPhotos).catch(() => undefined);
  }, [gameId]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const n = q.trim().toLowerCase();
    return n ? items.filter((i) => JSON.stringify(i.data).toLowerCase().includes(n)) : items;
  }, [items, q]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const body = { gameId, difficulty: draft.difficulty, active: draft.active, toConfirm: draft.toConfirm, data: clean(gameId, draft.data) };
      const saved = draft.id ? await api.updateContent(draft.id, body) : await api.createContent(body);
      setItems((list) => (draft.id ? list!.map((i) => (i.id === saved.id ? saved : i)) : [...(list ?? []), saved]));
      setDraft(null);
      toast('Enregistré', 'love');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (it: ContentItem) => {
    const saved = await api.updateContent(it.id, { active: !it.active }).catch((e) => toast(e.message, 'error'));
    if (saved) setItems((l) => l!.map((i) => (i.id === it.id ? saved : i)));
  };

  const confirmItem = async (it: ContentItem) => {
    const saved = await api.updateContent(it.id, { toConfirm: false }).catch((e) => toast(e.message, 'error'));
    if (saved) setItems((l) => l!.map((i) => (i.id === it.id ? saved : i)));
  };

  const remove = async (it: ContentItem) => {
    if (!confirm('Supprimer cet élément ?')) return;
    await api.deleteContent(it.id).catch((e) => toast(e.message, 'error'));
    setItems((l) => l!.filter((i) => i.id !== it.id));
  };

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,240px)_1fr_auto]">
        <label className="block">
          <span className="sr-only">Jeu</span>
          <select className="input py-2.5 text-sm font-semibold" value={gameId} onChange={(e) => setParams({ onglet: 'jeux', jeu: e.target.value })}>
            {GAME_IDS.map((g) => (
              <option key={g} value={g}>
                {GAMES[g].title}
              </option>
            ))}
          </select>
        </label>
        <label className="relative block">
          <span className="sr-only">Rechercher</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input py-2.5 pl-9 text-sm" />
        </label>
        <Btn className="btn-primary px-5" onClick={() => setDraft({ difficulty: 'easy', active: true, toConfirm: false, data: EMPTY[gameId]() })}>
          <Plus className="h-5 w-5" /> Ajouter
        </Btn>
      </div>

      {!items ? (
        <Loader />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/75">
            {items.filter((i) => i.active).length} {UNIT[gameId]} actifs sur {items.length}
            {items.some((i) => i.toConfirm) && ' · les éléments « À confirmer » reprennent des faits à vérifier'}
          </p>
          <ul className="space-y-2">
            {filtered.map((it) => {
              const s = summary(gameId, it.data);
              const edit = () => setDraft({ id: it.id, difficulty: it.difficulty, active: it.active, toConfirm: it.toConfirm, data: structuredClone(it.data) });
              return (
                <li key={it.id} className={`card flex items-start gap-3 p-3 sm:p-4 ${it.active ? '' : 'bg-blush-50/60'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-wine-800">{s.title}</p>
                    {s.sub && <p className="mt-0.5 text-xs text-ink/75">{s.sub}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-blush-100 px-2 py-0.5 font-semibold text-wine-800">{DIFFICULTY_LABELS[it.difficulty]}</span>
                      {!it.active && <span className="rounded-full bg-ink/10 px-2 py-0.5 font-semibold text-ink/80">Retiré du jeu</span>}
                      {it.toConfirm && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-300/40 px-2 py-0.5 font-semibold text-gold-700">
                          <AlertCircle className="h-3 w-3" /> À confirmer
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={edit} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-wine-700 hover:bg-blush-50">
                      <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Modifier</span>
                      <span className="sr-only sm:hidden">Modifier</span>
                    </button>
                    <RowMenu
                      label={`Autres actions pour « ${s.title.slice(0, 40)} »`}
                      items={[
                        { label: it.active ? 'Retirer du jeu' : 'Remettre dans le jeu', icon: it.active ? EyeOff : Eye, onClick: () => toggle(it) },
                        ...(it.toConfirm ? [{ label: 'Marquer comme confirmé', icon: Check, onClick: () => confirmItem(it) }] : []),
                        { label: 'Supprimer', icon: Trash2, onClick: () => remove(it), danger: true },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Modifier' : `Ajouter à ${GAMES[gameId].title}`}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-soft" onClick={() => setDraft(null)}>
              Annuler
            </button>
            <Btn className="btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <DataForm gameId={gameId} draft={draft} photos={photos} set={(data) => setDraft({ ...draft, data })} />
            <Field label="Difficulté">
              <select className="input" value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-wine-700">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-5 w-5 accent-wine-500" /> Actif
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-wine-700">
                <input type="checkbox" checked={draft.toConfirm} onChange={(e) => setDraft({ ...draft, toConfirm: e.target.checked })} className="h-5 w-5 accent-wine-500" /> À confirmer
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
