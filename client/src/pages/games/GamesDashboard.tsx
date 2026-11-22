import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Gamepad2, History, Trophy } from 'lucide-react';
import { GAMES, PLAYER_NAMES } from '@shared/types';
import { api, type Dashboard } from '@/services/api';
import { getSocket } from '@/services/socket';
import { GAME_VISUALS } from '@/games/registry';
import { AnimatedNumber, Empty, Loader, Page, ScoreRing, SectionTitle, rise, stagger } from '@/components/ui';
import { Avatar } from '@/components/games/common';

/** Courbe de progression du score commun (une seule série : le titre la nomme, pas de légende). */
function Sparkline({ points }: { points: Array<{ date: string; couple: number | null }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter((p) => p.couple !== null) as Array<{ date: string; couple: number }>;
  if (data.length < 2) return <p className="text-xs text-ink/70">{data.length === 1 ? 'Encore 1 partie pour voir la courbe.' : 'La courbe apparaît après 2 parties.'}</p>;
  const W = 240;
  const H = 56;
  const pad = 6;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (data.length - 1);
  const y = (v: number) => H - pad - (v / 100) * (H - 2 * pad);
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.couple)}`).join(' ');
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible" role="img" aria-label="Progression du score commun">
        <line x1={pad} x2={W - pad} y1={y(50)} y2={y(50)} stroke="#FDE2E7" strokeWidth={1} strokeDasharray="3 3" />
        <motion.path d={d} fill="none" stroke="#9E2F4F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
        {data.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
            <circle cx={x(i)} cy={y(p.couple)} r={12} fill="transparent" />
            <circle cx={x(i)} cy={y(p.couple)} r={hover === i ? 5 : 4} fill="#9E2F4F" stroke="#FFFFFF" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute -top-8 rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white" style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {h.couple}
        </div>
      )}
    </div>
  );
}

export function GamesDashboard() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  useEffect(() => {
    const load = () => api.dashboard().then(setDash).catch(() => undefined);
    load();
    const s = getSocket();
    s.on('sessions:changed', load);
    return () => {
      s.off('sessions:changed', load);
    };
  }, []);

  if (!dash) return <Loader />;

  // État de départ : une seule invitation à jouer plutôt que des jauges vides.
  if (dash.sessionsCompleted === 0) {
    return (
      <Page>
        <SectionTitle kicker="Scores" title="Nos scores" />
        <Empty icon={<Trophy className="h-6 w-6" />} title="Pas encore de partie terminée">
          <p>Vos scores, la compatibilité et la progression par jeu apparaîtront ici après votre première partie.</p>
          <Link to="/jeux" className="btn-primary mt-4">
            <Gamepad2 className="h-5 w-5" /> Choisir un jeu
          </Link>
        </Empty>
        {dash.sessionsInProgress + dash.sessionsInterrupted > 0 && (
          <Link to="/jeux/historique" className="btn-white mt-4 w-full">
            <History className="h-5 w-5" /> Reprendre une partie en cours
          </Link>
        )}
      </Page>
    );
  }

  const played = dash.perGame.filter((g) => g.played > 0);
  const tiles = [
    { label: 'Parties lancées', value: dash.sessionsTotal },
    { label: 'Terminées', value: dash.sessionsCompleted },
    { label: 'Jeux essayés', value: dash.gamesFinished, suffix: ' / 6' },
  ];

  return (
    <Page className="max-w-5xl">
      <SectionTitle kicker="Scores" title="Nos scores">
        Moyennes des parties terminées, sur 100. Les parties interrompues ne comptent pas.
      </SectionTitle>

      <motion.section variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <motion.div variants={rise} className="card flex flex-wrap items-center justify-around gap-6 p-6">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing value={dash.couple} size={140} label="Score commun" />
            <p className="max-w-[12rem] text-center text-xs text-ink/70">Moyenne de vos parties à deux</p>
          </div>
          <div className="flex gap-6">
            {(['miguel', 'adele'] as const).map((p) => (
              <div key={p} className="flex flex-col items-center gap-2">
                <ScoreRing value={dash[p]} size={104} tone="blush" />
                <span className="flex items-center gap-2 text-sm font-semibold text-wine-800">
                  <Avatar player={p} size={22} /> {PLAYER_NAMES[p]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={rise} className="grid gap-4">
          <div className="card flex items-center gap-4 p-5">
            <ScoreRing value={dash.compatibility} size={88} stroke={8} tone="gold" />
            <div>
              <p className="font-semibold text-gold-700">Compatibilité</p>
              <p className="text-sm text-ink/75">Part de réponses identiques dans « Tu préfères quoi ? » et « Complete My Sentence ».</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="card p-3 text-center">
                <dd className="font-display text-2xl text-wine-800 sm:text-3xl">
                  <AnimatedNumber value={t.value} />
                  {t.suffix && <span className="text-base text-ink/70">{t.suffix}</span>}
                </dd>
                <dt className="text-xs font-semibold text-ink/70">{t.label}</dt>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.section>

      {dash.best && (
        <div className="mt-4 flex items-center gap-4 rounded-3xl border border-blush-100 bg-white p-5">
          <Award className="h-8 w-8 shrink-0 text-gold-700" aria-hidden />
          <p className="text-sm text-ink/85">
            <span className="font-semibold text-wine-800">Meilleur résultat individuel :</span> {PLAYER_NAMES[dash.best.player]}, {dash.best.score} / 100 à{' '}
            {GAMES[dash.best.gameId].title}, le {new Date(dash.best.date).toLocaleDateString('fr-FR')}.
          </p>
        </div>
      )}

      <h2 className="mb-1 mt-8 text-xl">Progression par jeu</h2>
      <p className="mb-4 text-sm text-ink/70">La courbe du score commun apparaît à partir de 2 parties terminées d’un même jeu.</p>
      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {played.map((g) => {
          const V = GAME_VISUALS[g.gameId];
          return (
            <motion.div key={g.gameId} variants={rise} whileHover={{ y: -4 }} className="card p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${V.gradient} text-white`}>
                  <V.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/jeux/${g.gameId}`} className="font-semibold text-wine-800 hover:underline">
                    {GAMES[g.gameId].title}
                  </Link>
                  <p className="text-xs text-ink/70">
                    {g.played} partie{g.played > 1 ? 's' : ''} terminée{g.played > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Miguel', g.miguel],
                  ['Adèle', g.adele],
                  [g.compatibility !== null ? 'Compatibilité' : 'Commun', g.compatibility ?? g.couple],
                ].map(([l, val]) => (
                  <div key={l as string} className="rounded-xl bg-blush-50 py-2">
                    <dt className="text-[11px] font-semibold text-wine-700">{l}</dt>
                    <dd className="font-display text-xl text-wine-800">{val ?? '–'}</dd>
                  </div>
                ))}
              </dl>
              {g.progression.filter((x) => x.couple !== null).length >= 2 && <Sparkline points={g.progression} />}
            </motion.div>
          );
        })}
      </motion.section>
      {played.length < 6 && (
        <p className="mt-4 text-sm text-ink/70">
          Pas encore joué : {dash.perGame.filter((g) => g.played === 0).map((g) => GAMES[g.gameId].title).join(', ')}.
        </p>
      )}

      <Link to="/jeux/historique" className="btn-white mt-8 w-full sm:w-auto">
        <History className="h-5 w-5" /> Voir tout l’historique
      </Link>
    </Page>
  );
}
