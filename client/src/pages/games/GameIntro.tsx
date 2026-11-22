import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Settings2 } from 'lucide-react';
import { GAMES, GAME_IDS, MODE_LABELS, PLAYERS, type Difficulty, type GameId, type PlayMode } from '@shared/types';
import { useMe } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { api } from '@/services/api';
import { GAME_VISUALS } from '@/games/registry';
import { DeviceSelector, DifficultySelector, PlayerSelector, Segmented } from '@/components/games/selectors';
import { Btn, Page } from '@/components/ui';

export function GameIntro() {
  const { gameId } = useParams();
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const valid = GAME_IDS.includes(gameId as GameId);
  const game = valid ? GAMES[gameId as GameId] : null;
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<PlayMode>(game?.defaultMode ?? 'duo');
  const [soloPlayer, setSoloPlayer] = useState(me);
  const [shared, setShared] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (valid) api.contentCounts().then((c) => setCount(c[gameId as GameId] ?? 0)).catch(() => undefined);
  }, [gameId, valid]);

  if (!game) return <Navigate to="/jeux" replace />;
  const v = GAME_VISUALS[game.id];
  const Icon = v.icon;

  const start = async () => {
    setBusy(true);
    try {
      const s = await api.createSession({
        gameId: game.id,
        difficulty,
        mode,
        players: mode === 'solo' ? [soloPlayer] : PLAYERS,
        sharedDevice: mode === 'solo' ? true : shared,
      });
      navigate(`/partie/${s.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Link to="/jeux" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-wine-600">
        <ArrowLeft className="h-4 w-4" /> Tous les jeux
      </Link>

      <section className={`rounded-3xl bg-gradient-to-br ${v.gradient} p-6 text-white`}>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Icon className="h-6 w-6" />
          </span>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{game.title}</h1>
        </div>
        <p className="mt-3 text-white/90">{game.objective}</p>
        <p className="mt-2 text-sm font-semibold text-white/85">
          {game.needsBoth ? `À deux · ${game.modes.map((m) => MODE_LABELS[m]).join(' ou ')}` : 'À deux ou en solo'}
        </p>
      </section>

      <section className="card mt-5 space-y-5 p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Settings2 className="h-5 w-5" /> Réglages de la partie
        </h2>
        {game.modes.length > 1 && (
          <div role="group" aria-label="Mode de jeu">
            <span className="label">Mode de jeu</span>
            <Segmented layoutId="mode" value={mode} onChange={setMode} options={game.modes.map((m) => ({ value: m, label: MODE_LABELS[m] }))} />
          </div>
        )}
        {mode === 'solo' ? (
          <div role="group" aria-label="Qui joue">
            <span className="label">Qui joue ?</span>
            <PlayerSelector value={soloPlayer} onChange={setSoloPlayer} />
          </div>
        ) : (
          <div role="group" aria-label="Appareils">
            <span className="label">Appareils</span>
            <DeviceSelector shared={shared} onChange={setShared} />
          </div>
        )}
        <div role="group" aria-label="Difficulté">
          <span className="label">Difficulté</span>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>
        <Btn className="btn-primary w-full text-lg" disabled={busy} onClick={start}>
          <Play className="h-5 w-5" /> {busy ? 'Préparation…' : 'Commencer la partie'}
        </Btn>
        {!shared && mode !== 'solo' && <p className="text-center text-sm text-ink/70">Ton partenaire reçoit une invitation s’il ou elle a le site ouvert sur son téléphone.</p>}
        {count !== null && (
          <p className="text-center text-xs text-ink/65">
            {count} {count > 1 ? 'questions actives' : 'question active'} ·{' '}
            <Link to={`/configuration?jeu=${game.id}`} className="font-semibold text-wine-700 underline">
              Modifier les contenus
            </Link>
          </p>
        )}
      </section>

      <details open className="card group mt-5 p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold text-wine-700">
          Les règles
          <span className="text-sm font-semibold text-wine-600 group-open:hidden">Afficher</span>
          <span className="hidden text-sm font-semibold text-wine-600 group-open:inline">Masquer</span>
        </summary>
        <ol className="mt-4 space-y-3">
          {game.rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink/85">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush-100 text-xs font-bold text-wine-700">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
      </details>
    </Page>
  );
}
