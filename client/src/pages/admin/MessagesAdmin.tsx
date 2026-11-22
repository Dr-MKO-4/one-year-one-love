import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { api, type ChatCapture } from '@/services/api';

const slots = [0, 1, 2];

export function MessagesAdmin() {
  const toast = useToast();
  const [excerpts, setExcerpts] = useState<string[] | null>(null);
  const [published, setPublished] = useState(false);
  const [chats, setChats] = useState<ChatCapture[]>([]);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.messages().then((messages) => {
      setExcerpts(slots.map((slot) => messages?.excerpts[slot] ?? ''));
      setPublished(messages?.published ?? false);
      setChats(messages?.chats ?? []);
    }).catch(() => setLoadingError(true));
  }, []);

  const entries = excerpts?.map((excerpt) => excerpt.trim()).filter(Boolean) ?? [];
  const editMsg = (ci: number, mi: number, text: string) =>
    setChats(chats.map((c, i) => (i !== ci ? c : { ...c, messages: c.messages.map((m, j) => (j === mi ? { ...m, text } : m)) })));

  async function save(nextPublished: boolean) {
    setSaving(true);
    try {
      const messages = await api.saveMessages({ published: nextPublished, excerpts: entries, chats });
      setExcerpts(slots.map((slot) => messages.excerpts[slot] ?? ''));
      setPublished(messages.published);
      setChats(messages.chats ?? []);
      toast(messages.published ? 'Messages publiés' : 'Brouillon des messages enregistré', 'love');
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="card group mt-6">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-wine-700 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">Messages souvenirs</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-blush-100 p-5">
        {loadingError && <p role="alert">Impossible de charger les messages.</p>}
        {!loadingError && !excerpts && <p role="status">Chargement des messages…</p>}
        {excerpts && (
          <>
            <p className="text-sm text-ink/75">Trois phrases courtes qui défilent sur l’accueil, puis les conversations affichées dans « Nos messages » (et sous un moment de la frise si elles y sont rattachées).</p>
            <fieldset disabled={saving} className="space-y-4">
              {excerpts.map((excerpt, index) => (
                <label key={index} className="block">
                  <span className="label">Extrait {index + 1}</span>
                  <textarea className="input" rows={3} maxLength={400} value={excerpt} onChange={(e) => setExcerpts(excerpts.map((value, slot) => slot === index ? e.target.value : value))} />
                </label>
              ))}
              {chats.map((c, ci) => (
                <details key={c.id} className="rounded-2xl border border-blush-100 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-wine-800">
                    <span className="flex-1">{c.title}{c.attachTo ? ` · sous « ${c.attachTo} »` : ''}</span>
                    <span className="text-xs text-ink/70">{c.messages.length} messages</span>
                  </summary>
                  <div className="space-y-3 border-t border-blush-100 p-4">
                    {c.messages.map((m, mi) => (
                      <label key={mi} className="block">
                        <span className="label">{m.from === 'me' ? 'Miguel' : 'Adèle'}{m.time ? ` · ${m.time}` : ''}</span>
                        <textarea className="input text-sm" rows={Math.min(8, Math.max(2, Math.ceil(m.text.length / 70)))} value={m.text} onChange={(e) => editMsg(ci, mi, e.target.value)} />
                      </label>
                    ))}
                    <button type="button" className="btn-ghost text-sm" onClick={() => confirm(`Retirer la conversation « ${c.title} » ?`) && setChats(chats.filter((_, i) => i !== ci))}>
                      Retirer cette conversation
                    </button>
                  </div>
                </details>
              ))}
              {!chats.length && <p className="text-sm text-ink/70">Aucune conversation : importe le fichier fourni via l’onglet Sauvegarde.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className="btn-white" onClick={() => save(false)}>
                  {published ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}
                </button>
                <button type="button" className="btn-primary" disabled={!entries.length && !chats.length} onClick={() => save(true)}>
                  {published ? 'Mettre à jour les messages' : 'Publier les messages'}
                </button>
              </div>
            </fieldset>
          </>
        )}
      </div>
    </details>
  );
}
