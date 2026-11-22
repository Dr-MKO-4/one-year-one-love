import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Gamepad2, RotateCcw, Timer } from 'lucide-react';
import { GAMES, PLAYER_NAMES, type GameStateMap, type SessionDTO } from '@shared/types';
import { encouragement } from '@shared/scoring';
import { api } from '@/services/api';
import { useToast } from '@/lib/toast';
import { Btn, ScoreRing, celebrate, rise, stagger } from '../ui';
import { Avatar, ResultBadge } from './common';

function Recap({ session }: { session: SessionDTO }) {
  const s = session.state as GameStateMap[keyof GameStateMap];
  let rows: Array<{ key: string; text: string; detail?: string; result?: string }> = [];
  switch (session.gameId) {
    case 'who-knows-who': {
      const st = s as GameStateMap['who-knows-who'];
      rows = st.rounds.map((r, i) => ({ key: String(i), text: `${PLAYER_NAMES[r.guesser]} : ${r.text}`, detail: r.guess ? `${r.guess} (réponse : ${r.reference})` : undefined, result: r.result }));
      break;
    }
    case 'would-you-rather': {
      const st = s as GameStateMap['would-you-rather'];
      rows = st.rounds.map((r, i) => {
        const lbl = (c?: string) => (c === 'a' ? r.a : c === 'b' ? r.b : 'passé');
        const same = r.choices.miguel === r.choices.adele && r.choices.miguel !== 'skip';
        return { key: String(i), text: `${r.a} ou ${r.b}`, detail: `Miguel : ${lbl(r.choices.miguel)} · Adèle : ${lbl(r.choices.adele)}`, result: same ? 'exact' : 'different' };
      });
      break;
    }
    case 'memory-of-us': {
      const st = s as GameStateMap['memory-of-us'];
      const secs = st.finishedAt ? Math.round((st.finishedAt - st.startedAt) / 1000) : null;
      rows = [
        ...session.players.map((p) => ({ key: p, text: PLAYER_NAMES[p], detail: `${st.pairsFound[p] ?? 0} paires en ${st.attempts[p] ?? 0} essais` })),
        ...(secs !== null ? [{ key: 'time', text: 'Temps de résolution', detail: `${Math.floor(secs / 60)} min ${secs % 60} s${st.timedOut ? ' (temps écoulé)' : ''}` }] : []),
      ];
      break;
    }
    case 'do-you-remember': {
      const st = s as GameStateMap['do-you-remember'];
      rows = st.rounds.map((r, i) => ({ key: String(i), text: `${PLAYER_NAMES[r.player]} : ${r.text}`, detail: r.answer ? `${r.answer}${r.reference ? ` (réponse : ${r.reference})` : ''}` : undefined, result: r.result }));
      break;
    }
    case 'love-challenges': {
      const st = s as GameStateMap['love-challenges'];
      rows = st.rounds.map((r, i) => ({ key: String(i), text: r.text, detail: r.player ? `Défi de ${PLAYER_NAMES[r.player]} · ${r.points} pts` : `À deux · ${r.points} pts`, result: r.result }));
      break;
    }
    case 'complete-my-sentence': {
      const st = s as GameStateMap['complete-my-sentence'];
      rows = st.rounds.map((r, i) => ({ key: String(i), text: r.prompt, detail: `Miguel : ${r.answers.miguel ?? 'passé'} · Adèle : ${r.answers.adele ?? 'passé'}`, result: r.result }));
      break;
    }
  }
  return (
    <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-2">
      {rows.map((r) => (
        <motion.li key={r.key} variants={rise} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-wine-700">{r.text}</p>
            {r.detail && <p className="mt-0.5 text-xs text-ink/60">{r.detail}</p>}
          </div>
          <ResultBadge result={r.result} />
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function GameResult({ session }: { session: SessionDTO }) {
  const navigate = useNavigate();
  const toast = useToast();
  const game = GAMES[session.gameId];
  const headline = session.coupleScore ?? session.scores.miguel ?? session.scores.adele ?? null;

  useEffect(() => {
    const t = setTimeout(() => celebrate((headline ?? 0) >= 50 ? 'big' : 'soft'), 400);
    return () => clearTimeout(t);
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const replay = async () => {
    try {
      const s = await api.createSession({
        gameId: session.gameId,
        difficulty: session.difficulty,
        mode: session.mode,
        players: session.players,
        sharedDevice: session.sharedDevice,
      });
      navigate(`/partie/${s.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const secs = session.endedAt ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : null;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="font-script text-3xl text-blush-500">Partie terminée</p>
        <h1 className="font-display text-4xl font-bold">{game.title}</h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mx-auto mt-3 max-w-md text-ink/75">
          {encouragement(headline)}
        </motion.p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="card mt-6 flex flex-wrap items-start justify-center gap-6 p-6">
        {session.coupleScore !== null && (
          <motion.div variants={rise} className="w-full flex justify-center">
            <ScoreRing value={session.coupleScore} size={150} label="Score commun" delay={0.2} />
          </motion.div>
        )}
        {session.players.map((p, i) => (
          <motion.div key={p} variants={rise} className="flex flex-col items-center gap-2">
            <ScoreRing value={session.scores[p] ?? null} size={104} tone="blush" delay={0.5 + i * 0.2} />
            <span className="flex items-center gap-2 text-sm font-bold text-wine-700">
              <Avatar player={p} size={22} /> {PLAYER_NAMES[p]}
            </span>
          </motion.div>
        ))}
        {session.compatibility !== null && (
          <motion.div variants={rise} className="flex flex-col items-center gap-2">
            <ScoreRing value={session.compatibility} size={104} tone="gold" delay={0.9} />
            <span className="text-sm font-bold text-gold-700">Compatibilité</span>
          </motion.div>
        )}
      </motion.div>
      {session.compatibility !== null && (
        <p className="mt-2 text-center text-xs text-ink/50">La compatibilité est le taux de réponses identiques : un jeu, pas une mesure scientifique.</p>
      )}
      {['would-you-rather', 'complete-my-sentence'].includes(session.gameId) && (
        <p className="mt-1 text-center text-xs text-ink/50">Scores personnels : participation.</p>
      )}
      {secs !== null && (
        <p className="mt-3 flex items-center justify-center gap-1 text-xs text-ink/50">
          <Timer className="h-3.5 w-3.5" /> Durée de la partie : {Math.floor(secs / 60)} min {secs % 60} s
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Btn className="btn-primary col-span-3 sm:col-span-1" onClick={replay}>
          <RotateCcw className="h-5 w-5" /> Rejouer
        </Btn>
        <Link to="/jeux/tableau-de-bord" className="btn-white col-span-3 sm:col-span-1 text-sm">
          <BarChart3 className="h-5 w-5" /> Scores
        </Link>
        <Link to="/jeux" className="btn-white col-span-3 sm:col-span-1 text-sm">
          <Gamepad2 className="h-5 w-5" /> Autres jeux
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Le détail</h2>
        <Recap session={session} />
      </section>
    </div>
  );
}
