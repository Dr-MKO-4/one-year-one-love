import { motion } from 'framer-motion';
import { Check, Smartphone, Users } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_LABELS, PLAYER_NAMES, type Difficulty, type Player } from '@shared/types';
import { Avatar } from './common';

const DIFF_HINT: Record<Difficulty, string> = {
  easy: 'Questions directes, règles simples',
  medium: 'Plus précis, plus de réflexion',
  hard: 'Souvenirs détaillés, temps limité',
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  layoutId,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; hint?: string }>;
  onChange: (v: T) => void;
  layoutId: string;
}) {
  return (
    <div className={`grid gap-2 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-2xl border px-3 py-3 text-left transition-colors ${active ? 'border-wine-600 text-white' : 'border-blush-200 bg-white text-wine-800 hover:bg-blush-50'}`}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 -z-0 rounded-2xl bg-wine-gradient shadow-glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            {active && <Check className="absolute right-2 top-2 h-4 w-4 text-white" aria-hidden />}
            <span className="relative block pr-4 text-sm font-bold">{o.label}</span>
            {o.hint && <span className={`relative mt-0.5 block text-xs leading-tight ${active ? 'text-white/90' : 'text-ink/70'}`}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <Segmented
      layoutId="difficulty"
      value={value}
      onChange={onChange}
      options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d], hint: DIFF_HINT[d] }))}
    />
  );
}

export function DeviceSelector({ shared, onChange }: { shared: boolean; onChange: (s: boolean) => void }) {
  return (
    <Segmented
      layoutId="device"
      value={shared ? 'one' : 'two'}
      onChange={(v) => onChange(v === 'one')}
      options={[
        { value: 'two', label: <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Deux téléphones</span>, hint: 'Chacun joue sur le sien, en temps réel' },
        { value: 'one', label: <span className="flex items-center gap-1"><Smartphone className="h-4 w-4" /> Un seul téléphone</span>, hint: 'On se passe l’appareil' },
      ]}
    />
  );
}

export function PlayerSelector({ value, onChange, me }: { value: Player; onChange: (p: Player) => void; me?: Player }) {
  return (
    <Segmented
      layoutId="player"
      value={value}
      onChange={onChange}
      options={(['adele', 'miguel'] as Player[]).map((p) => ({
        value: p,
        label: (
          <span className="flex items-center gap-2">
            <Avatar player={p} size={22} /> {PLAYER_NAMES[p]}
            {p === me && <span className="text-xs font-normal opacity-80">(toi)</span>}
          </span>
        ),
      }))}
    />
  );
}

export { Segmented };
