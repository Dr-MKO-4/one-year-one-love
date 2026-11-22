import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Pause, Play, Smartphone, WifiOff, XCircle } from 'lucide-react';
import { DIFFICULTY_LABELS, GAMES, PLAYER_NAMES, type GameId, type Player, type SessionDTO } from '@shared/types';
import { useMe } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { GAME_COMPONENTS } from '@/games/registry';
import { GameResult } from '@/components/games/GameResult';
import { Btn, Loader, Modal, Page } from '@/components/ui';
import { MusicButton } from '@/components/MusicPlayer';
import type { GameProps } from '@/components/games/common';

export function GamePlay() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [connected, setConnected] = useState(true);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const versionRef = useRef(-1);

  /** N'accepte que les états plus récents (les réponses HTTP et socket peuvent se croiser). */
  const accept = useCallback((s: SessionDTO | null | undefined) => {
    if (!s || s.version < versionRef.current) return;
    versionRef.current = s.version;
    setOffset(s.serverNow - Date.now());
    setSession(s);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    versionRef.current = -1;
    const socket = getSocket();
    const join = () =>
      socket.emit('session:join', sessionId, (r: { ok: boolean; session?: SessionDTO; error?: string }) => {
        if (r.ok) accept(r.session);
        else setError(r.error ?? 'Partie introuvable.');
      });
    const onUpdate = (s: SessionDTO) => s.id === sessionId && accept(s);
    const onPresence = (p: { player: Player; here: boolean }) => {
      if (p.player !== me && p.here) toast(`${PLAYER_NAMES[p.player]} a rejoint la partie`, 'love');
    };
    const onConnect = () => {
      setConnected(true);
      join();
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session:update', onUpdate);
    socket.on('session:presence', onPresence);
    if (socket.connected) join();
    // Filet de sécurité si le temps réel est indisponible.
    api.session(sessionId).then(accept).catch((e) => setError(e.message));

    return () => {
      socket.emit('session:leave', sessionId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session:update', onUpdate);
      socket.off('session:presence', onPresence);
    };
  }, [sessionId, accept, me, toast]);

  const act = useCallback(
    async (type: string, payload?: Record<string, unknown>, as?: Player) => {
      if (!sessionId) return false;
      setBusy(true);
      try {
        accept(await api.act(sessionId, { type, payload, as }));
        return true;
      } catch (e) {
        const msg = (e as Error).message;
        if (!/instant|disponible/.test(msg)) toast(msg, 'error');
        api.session(sessionId).then(accept).catch(() => undefined);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [sessionId, accept, toast],
  );

  if (error) {
    return (
      <Page>
        <div className="card p-8 text-center">
          <p className="font-semibold text-wine-700">{error}</p>
          <Link to="/jeux" className="btn-primary mt-4">
            Retour aux jeux
          </Link>
        </div>
      </Page>
    );
  }
  if (!session) return <Loader label="On prépare la partie…" />;

  const game = GAMES[session.gameId];
  const Component = GAME_COMPONENTS[session.gameId] as React.ComponentType<GameProps<GameId>>;

  return (
    <Page>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/jeux" className="flex items-center gap-1 text-sm font-semibold text-wine-700">
          <ArrowLeft className="h-4 w-4" /> Jeux
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-wine-800">
          <MusicButton />
          <span className="rounded-full bg-blush-100 px-2.5 py-1">{DIFFICULTY_LABELS[session.difficulty]}</span>
          {session.sharedDevice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blush-100 px-2.5 py-1">
              <Smartphone className="h-3.5 w-3.5" aria-hidden /> Un seul téléphone
            </span>
          )}
        </div>
      </div>
      {!connected && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-gold-300/30 px-4 py-2.5 text-sm font-semibold text-gold-700">
          <WifiOff className="h-4 w-4" aria-hidden /> Connexion perdue : reconnexion en cours, la partie reprendra là où elle en était.
        </p>
      )}

      {session.status !== 'completed' && (
        <h1 className="mb-5 text-3xl">{game.title}</h1>
      )}

      <AnimatePresence mode="wait">
        {session.status === 'completed' ? (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <GameResult session={session} />
          </motion.div>
        ) : session.status === 'interrupted' ? (
          <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center">
            <Pause className="mx-auto mb-3 h-10 w-10 text-wine-600" />
            <h2 className="text-2xl">Partie mise de côté</h2>
            <p className="mt-2 text-sm text-ink/80">Elle ne compte pas dans vos scores tant qu’elle n’est pas terminée. Reprends-la quand vous voulez.</p>
            <Btn className="btn-primary mt-5" onClick={() => api.resume(session.id).then(accept).catch((e) => toast(e.message, 'error'))}>
              <Play className="h-5 w-5" /> Reprendre
            </Btn>
          </motion.div>
        ) : (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Component session={session as SessionDTO<GameId>} me={me} act={act} busy={busy} clockOffset={offset} />
            <div className="mt-10 rounded-2xl border border-blush-100 bg-white p-4 text-sm text-ink/80 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <p>Besoin d’une pause ? Quitte simplement la page : la partie reste en cours et vous la retrouverez dans « Parties en cours ».</p>
              <button onClick={() => setConfirmQuit(true)} className="mt-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blush-200 px-4 py-2 font-semibold text-wine-800 hover:bg-blush-50 sm:mt-0">
                <XCircle className="h-4 w-4" /> Mettre de côté
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Mettre la partie de côté ?">
        <p className="text-sm text-ink/70">
          La partie sera mise de côté et ne comptera pas dans les scores. Vous pourrez la reprendre plus tard depuis l’historique. Pour une simple pause, il suffit de quitter la page : elle reste en cours.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Btn className="btn-soft" onClick={() => setConfirmQuit(false)}>
            Continuer
          </Btn>
          <Btn
            className="btn-primary"
            onClick={async () => {
              setConfirmQuit(false);
              await api.interrupt(session.id).then(accept).catch((e) => toast(e.message, 'error'));
              navigate('/jeux');
            }}
          >
            Interrompre
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
