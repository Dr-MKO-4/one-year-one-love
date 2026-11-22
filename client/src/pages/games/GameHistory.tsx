import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, History, Trash2 } from 'lucide-react';
import { DIFFICULTY_LABELS, GAMES, GAME_IDS, type GameId, type SessionStatus } from '@shared/types';
import { api, type SessionSummary } from '@/services/api';
import { useToast } from '@/lib/toast';
import { GAME_VISUALS } from '@/games/registry';
import { Empty, Loader, Page, SectionTitle } from '@/components/ui';

const STATUS: Record<SessionStatus, [string, string]> = {
  completed: ['Terminée', 'bg-emerald-100 text-emerald-700'],
  in_progress: ['En cours', 'bg-blush-100 text-wine-600'],
  interrupted: ['Interrompue', 'bg-ink/5 text-ink/50'],
};

export function GameHistory() {
  const toast = useToast();
  const [list, setList] = useState<SessionSummary[] | null>(null);
  const [gameId, setGameId] = useState<GameId | ''>('');
  const [status, setStatus] = useState<SessionStatus | ''>('');

  useEffect(() => {
    setList(null);
    api
      .sessions({ gameId: gameId || undefined, status: status || undefined, limit: 200 })
      .then(setList)
      .catch(() => setList([]));
  }, [gameId, status]);

  const remove = async (id: string) => {
    if (!confirm('Supprimer définitivement cette partie de l’historique ?')) return;
    await api.deleteSession(id).catch((e) => toast(e.message, 'error'));
    setList((l) => l?.filter((s) => s.id !== id) ?? null);
  };

  return (
    <Page>
      <SectionTitle kicker="Historique" title="Nos parties" />
      <div className="mb-5 flex gap-2">
        <select value={gameId} onChange={(e) => setGameId(e.target.value as GameId | '')} className="input py-2 text-sm">
          <option value="">Tous les jeux</option>
          {GAME_IDS.map((g) => (
            <option key={g} value={g}>
              {GAMES[g].title}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as SessionStatus | '')} className="input py-2 text-sm">
          <option value="">Tous les statuts</option>
          <option value="completed">Terminées</option>
          <option value="in_progress">En cours</option>
          <option value="interrupted">Interrompues</option>
        </select>
      </div>
      {!list ? (
        <Loader />
      ) : !list.length ? (
        <Empty icon={<History className="h-6 w-6" />} title="Aucune partie pour l’instant">
          <Link to="/jeux" className="font-semibold text-wine-600 underline">
            Lancer un premier jeu
          </Link>
        </Empty>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial>
            {list.map((s, i) => {
              const V = GAME_VISUALS[s.gameId];
              const [label, cls] = STATUS[s.status];
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className="card flex items-center gap-3 p-3"
                >
                  <Link to={`/partie/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${V.gradient} text-white`}>
                      <V.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-wine-700">{GAMES[s.gameId].title}</p>
                      <p className="text-xs text-ink/60">
                        {new Date(s.startedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {DIFFICULTY_LABELS[s.difficulty as 'easy']}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>
                        {s.status === 'completed' && (
                          <span className="text-[11px] font-semibold text-wine-600">
                            {s.scores.miguel !== null && s.scores.miguel !== undefined && `M ${s.scores.miguel} · `}
                            {s.scores.adele !== null && s.scores.adele !== undefined && `A ${s.scores.adele} · `}
                            {s.coupleScore !== null && `Commun ${s.coupleScore}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-wine-300" />
                  </Link>
                  <button onClick={() => remove(s.id)} className="rounded-full p-2 text-ink/30 hover:bg-blush-50 hover:text-wine-600" aria-label="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </Page>
  );
}
