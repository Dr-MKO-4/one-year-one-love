import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Play, Settings2 } from 'lucide-react';
import { GAMES, GAME_IDS, MODE_LABELS, PLAYERS, type Difficulty, type GameId, type PlayMode } from '@shared/types';
import { useMe } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { api } from '@/services/api';
import { GAME_VISUALS } from '@/games/registry';
import { DeviceSelector, DifficultySelector, PlayerSelector, Segmented } from '@/components/games/selectors';
import { Btn, Page, rise, stagger } from '@/components/ui';

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

      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${v.gradient} p-7 text-white shadow-glow`}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: `${10 + i * 16}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -12, 0], opacity: [0.15, 0.35, 0.15] }}
            transition={{ repeat: Infinity, duration: 3 + i * 0.4, delay: i * 0.2 }}
          >
            <Heart className="h-6 w-6 fill-white/30 text-white/30" />
          </motion.span>
        ))}
        <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }} className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur">
          <Icon className="h-8 w-8" />
        </motion.div>
        <h1 className="relative font-display text-4xl font-bold text-white">{game.title}</h1>
        <p className="relative mt-2 text-white/85">{game.objective}</p>
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/20 px-3 py-1">{game.difficultyLabel}</span>
          <span className="rounded-full bg-white/20 px-3 py-1">{game.modes.map((m) => MODE_LABELS[m]).join(' ou ')}</span>
          <span className="rounded-full bg-white/20 px-3 py-1">{game.scoreLabel}</span>
        </div>
      </motion.section>

      <motion.section variants={stagger} initial="hidden" animate="show" className="card mt-6 p-6">
        <h2 className="mb-3 text-xl font-bold">Les règles</h2>
        <ol className="space-y-3">
          {game.rules.map((r, i) => (
            <motion.li key={i} variants={rise} className="flex gap-3 text-sm leading-relaxed text-ink/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush-100 text-xs font-bold text-wine-600">{i + 1}</span>
              {r}
            </motion.li>
          ))}
        </ol>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card mt-6 space-y-5 p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Settings2 className="h-5 w-5" /> Configuration
        </h2>
        {game.modes.length > 1 && (
          <div>
            <span className="label">Mode de jeu</span>
            <Segmented layoutId="mode" value={mode} onChange={setMode} options={game.modes.map((m) => ({ value: m, label: MODE_LABELS[m] }))} />
          </div>
        )}
        {mode === 'solo' ? (
          <div>
            <span className="label">Qui joue ?</span>
            <PlayerSelector value={soloPlayer} onChange={setSoloPlayer} />
          </div>
        ) : (
          <div>
            <span className="label">Appareils</span>
            <DeviceSelector shared={shared} onChange={setShared} />
          </div>
        )}
        <div>
          <span className="label">Difficulté</span>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>
        {count !== null && (
          <p className="text-xs text-ink/60">
            {count} élément{count > 1 ? 's' : ''} actif{count > 1 ? 's' : ''} dans la banque.{' '}
            <Link to={`/configuration?jeu=${game.id}`} className="font-semibold text-wine-600 underline">
              Modifier les contenus
            </Link>
          </p>
        )}
        <Btn className="btn-primary w-full text-lg" disabled={busy} onClick={start}>
          <Play className="h-5 w-5" /> {busy ? 'Préparation…' : 'Commencer la partie'}
        </Btn>
        {!shared && mode !== 'solo' && <p className="text-center text-xs text-ink/50">Ton partenaire recevra une invitation sur son téléphone.</p>}
      </motion.section>
    </Page>
  );
}
