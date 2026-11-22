import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Settings2 } from 'lucide-react';
import { GAMES, GAME_IDS, MODE_LABELS, PLAYERS, PLAYER_NAMES, otherPlayer, type Difficulty, type GameId, type PlayMode } from '@shared/types';
import { useMe } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { api } from '@/services/api';
import { GAME_VISUALS } from '@/games/registry';
import { DeviceSelector, DifficultySelector, PlayerSelector, Segmented } from '@/components/games/selectors';
import { Btn, Page } from '@/components/ui';
import { GamePreview } from '@/components/games/GamePreview';
import { usePartnerOnline } from '@/components/Layout';

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
  const partnerOnline = usePartnerOnline(me);

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

  const partner = otherPlayer(me);

  const settings = (
    <section className="card space-y-5 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xl">
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
          <PlayerSelector value={soloPlayer} onChange={setSoloPlayer} me={me} />
          <p className="mt-2 text-xs text-ink/70">Par défaut, c’est toi ({PLAYER_NAMES[me]}). Choisis {PLAYER_NAMES[partner]} si tu lui tends le téléphone.</p>
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
      {!shared && mode !== 'solo' && (
        <p className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-sm ${partnerOnline ? 'bg-emerald-50 text-emerald-900' : 'bg-blush-50 text-ink/80'}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${partnerOnline ? 'bg-emerald-600' : 'bg-ink/40'}`} aria-hidden />
          {partnerOnline
            ? `${PLAYER_NAMES[partner]} est en ligne : l’invitation s’affichera tout de suite sur son téléphone.`
            : `${PLAYER_NAMES[partner]} est hors ligne : la partie l’attendra dans « Parties en cours » à sa prochaine visite.`}
        </p>
      )}
      <Btn className="btn-primary w-full text-lg" disabled={busy} onClick={start}>
        <Play className="h-5 w-5" /> {busy ? 'Préparation…' : 'Commencer la partie'}
      </Btn>
      {count !== null && (
        <p className="text-center text-xs text-ink/70">
          {count} {count > 1 ? 'contenus actifs' : 'contenu actif'} ·{' '}
          <Link to={`/configuration?jeu=${game.id}`} className="font-semibold text-wine-700 underline">
            Modifier les contenus
          </Link>
        </p>
      )}
    </section>
  );

  return (
    <Page className="max-w-5xl">
      <Link to="/jeux" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-wine-700">
        <ArrowLeft className="h-4 w-4" /> Tous les jeux
      </Link>

      {/* Mobile : présentation, réglages, exemple, règles. Ordinateur : réglages dans une colonne qui reste visible. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`rounded-3xl bg-gradient-to-br ${v.gradient} p-6 text-white`}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Icon className="h-6 w-6" />
            </span>
            <h1 className="font-display text-3xl text-white sm:text-4xl">{game.title}</h1>
          </div>
          <p className="mt-3 text-white/95">{game.objective}</p>
          <p className="mt-2 text-sm font-semibold text-white/90">
            {game.needsBoth ? `À deux · ${game.modes.map((m) => MODE_LABELS[m]).join(' ou ')}` : 'À deux ou en solo'} · {game.format}
          </p>
        </section>

        <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">{settings}</div>

        <GamePreview gameId={game.id} />

        <details open className="card group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl text-wine-800">
            Les règles
            <span className="font-sans text-sm font-semibold text-wine-700 group-open:hidden">Afficher</span>
            <span className="hidden font-sans text-sm font-semibold text-wine-700 group-open:inline">Masquer</span>
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
      </div>
    </Page>
  );
}
