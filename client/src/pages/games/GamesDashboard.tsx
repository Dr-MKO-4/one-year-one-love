import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Gamepad2, History, Trophy } from 'lucide-react';
import { GAMES, PLAYER_NAMES } from '@shared/types';
import { api, type Dashboard } from '@/services/api';
import { getSocket } from '@/services/socket';
import { GAME_VISUALS } from '@/games/registry';
import { AnimatedNumber, Loader, Page, ScoreRing, SectionTitle, rise, stagger } from '@/components/ui';
import { Avatar } from '@/components/games/common';

/** Courbe de progression du score commun (une seule série : le titre la nomme, pas de légende). */
function Sparkline({ points }: { points: Array<{ date: string; couple: number | null }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter((p) => p.couple !== null) as Array<{ date: string; couple: number }>;
  if (data.length < 2) return <p className="text-xs text-ink/50">Encore {2 - data.length} partie(s) pour voir la courbe.</p>;
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

  const tiles = [
    { icon: Gamepad2, label: 'Parties jouées', value: dash.sessionsTotal },
    { icon: CheckCircle2, label: 'Parties terminées', value: dash.sessionsCompleted },
    { icon: Trophy, label: 'Jeux terminés', value: dash.gamesFinished, suffix: ' / 6' },
  ];

  return (
    <Page className="max-w-5xl">
      <SectionTitle kicker="Tableau de bord" title="Nos scores">
        Moyennes des parties terminées, normalisées sur 100. Les parties interrompues ne comptent pas.
      </SectionTitle>

      <motion.section variants={stagger} initial="hidden" animate="show" className="card grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
        <motion.div variants={rise} className="col-span-2 flex justify-center sm:col-span-1">
          <ScoreRing value={dash.couple} size={140} label="Score commun" />
        </motion.div>
        {(['miguel', 'adele'] as const).map((p, i) => (
          <motion.div key={p} variants={rise} className="flex flex-col items-center gap-2">
            <ScoreRing value={dash[p]} size={110} tone="blush" delay={0.2 + i * 0.15} />
            <span className="flex items-center gap-2 text-sm font-bold text-wine-700">
              <Avatar player={p} size={22} /> {PLAYER_NAMES[p]}
            </span>
          </motion.div>
        ))}
        <motion.div variants={rise} className="col-span-2 flex flex-col items-center gap-2 sm:col-span-1">
          <ScoreRing value={dash.compatibility} size={110} tone="gold" delay={0.5} />
          <span className="text-sm font-bold text-gold-500">Compatibilité</span>
        </motion.div>
      </motion.section>

      <motion.section variants={stagger} initial="hidden" animate="show" className="mt-4 grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <motion.div key={t.label} variants={rise} className="card p-4 text-center">
            <t.icon className="mx-auto h-5 w-5 text-wine-400" />
            <p className="mt-1 font-display text-3xl font-bold text-wine-700">
              <AnimatedNumber value={t.value} />
              {t.suffix && <span className="text-lg text-wine-400">{t.suffix}</span>}
            </p>
            <p className="text-[11px] font-semibold text-ink/60">{t.label}</p>
          </motion.div>
        ))}
      </motion.section>

      {dash.best && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 flex items-center gap-4 rounded-3xl bg-wine-gradient p-5 text-white shadow-glow">
          <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <Award className="h-10 w-10 text-gold-300" />
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Meilleur résultat individuel</p>
            <p className="font-display text-xl font-bold">
              {PLAYER_NAMES[dash.best.player]} · {dash.best.score} / 100
            </p>
            <p className="text-sm text-white/80">
              {GAMES[dash.best.gameId].title}, le {new Date(dash.best.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </motion.div>
      )}

      <h2 className="mb-3 mt-8 text-xl font-bold">Progression par jeu</h2>
      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-4 sm:grid-cols-2">
        {dash.perGame.map((g) => {
          const V = GAME_VISUALS[g.gameId];
          return (
            <motion.div key={g.gameId} variants={rise} className="card p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${V.gradient} text-white`}>
                  <V.icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <Link to={`/jeux/${g.gameId}`} className="font-bold text-wine-700 hover:underline">
                    {GAMES[g.gameId].title}
                  </Link>
                  <p className="text-xs text-ink/60">
                    {g.played} partie{g.played > 1 ? 's' : ''} terminée{g.played > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Miguel', g.miguel],
                  ['Adèle', g.adele],
                  [g.compatibility !== null ? 'Compat.' : 'Commun', g.compatibility ?? g.couple],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-blush-50 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-wine-500/70">{l}</dt>
                    <dd className="font-display text-xl font-bold text-wine-700">{v ?? '–'}</dd>
                  </div>
                ))}
              </dl>
              <p className="mb-1 text-[11px] font-semibold text-ink/50">Score commun, dernières parties</p>
              <Sparkline points={g.progression} />
            </motion.div>
          );
        })}
      </motion.section>

      <Link to="/jeux/historique" className="btn-white mt-8 w-full">
        <History className="h-5 w-5" /> Voir tout l’historique
      </Link>
    </Page>
  );
}
