import { useEffect, useState } from 'react';
import { CHALLENGE_CATEGORY_LABELS, type ContentItem, type GameId, type MemorySide } from '@shared/types';
import { api, photoUrl } from '@/services/api';

const SIDE: Record<MemorySide['kind'], string> = { photo: 'Photo', date: 'Date', place: 'Lieu', memory: 'Souvenir', text: 'Mot' };

function MiniCard({ side }: { side: MemorySide }) {
  return (
    <div className="flex aspect-[3/4] w-24 flex-col items-center justify-center rounded-xl border border-blush-200 bg-white p-2 text-center sm:w-28">
      {side.kind === 'photo' ? (
        <img src={photoUrl(side.value)} alt="" className="h-full w-full rounded-lg object-cover" />
      ) : (
        <>
          <span className="text-[10px] font-bold uppercase tracking-wider text-wine-600">{SIDE[side.kind]}</span>
          <span className="mt-1 text-xs font-semibold leading-tight text-ink">{side.value}</span>
        </>
      )}
    </div>
  );
}

/** Aperçu concret de la mécanique, tiré de vos propres contenus. */
export function GamePreview({ gameId }: { gameId: GameId }) {
  const [item, setItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    api
      .content(gameId)
      .then((list) => {
        const active = list.filter((i) => i.active);
        setItem(active.length ? active[Math.floor(Math.random() * active.length)] : null);
      })
      .catch(() => undefined);
  }, [gameId]);

  if (!item) return null;
  const d = item.data as never as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  let body: React.ReactNode = null;
  switch (gameId) {
    case 'who-knows-who':
      body = (
        <>
          <p className="font-display text-lg text-wine-800">« {d.text} »</p>
          <p className="mt-2 text-sm text-ink/75">L’un répond pour l’autre, puis la personne concernée dit si c’est juste.</p>
        </>
      );
      break;
    case 'would-you-rather':
      body = (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <span className="rounded-xl bg-wine-600 px-3 py-2 text-sm font-semibold text-white">{d.a}</span>
          <span className="text-center text-sm font-semibold text-wine-700">ou</span>
          <span className="rounded-xl border border-blush-200 bg-white px-3 py-2 text-sm font-semibold text-wine-800">{d.b}</span>
        </div>
      );
      break;
    case 'memory-of-us':
      body = (
        <div className="flex items-center gap-3">
          <MiniCard side={d.left} />
          <span className="text-sm font-semibold text-wine-700">va avec</span>
          <MiniCard side={d.right} />
        </div>
      );
      break;
    case 'do-you-remember':
      body = (
        <>
          <p className="font-display text-lg text-wine-800">{d.text}</p>
          {d.kind === 'mcq' && d.choices?.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {d.choices.map((c: string) => (
                <li key={c} className="rounded-full border border-blush-200 bg-white px-3 py-1 text-xs font-semibold text-wine-800">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink/75">Réponse libre, validée par l’autre.</p>
          )}
        </>
      );
      break;
    case 'love-challenges':
      body = (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-wine-600">
            {CHALLENGE_CATEGORY_LABELS[d.category as keyof typeof CHALLENGE_CATEGORY_LABELS]} · {d.target === 'couple' ? 'à deux' : 'pour l’un de vous'} · {d.points} points
          </p>
          <p className="mt-1 font-display text-lg text-wine-800">{d.text}</p>
        </>
      );
      break;
    case 'complete-my-sentence':
      body = (
        <>
          <p className="font-display text-lg italic text-wine-800">« {d.prompt} »</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <span className="rounded-xl border border-dashed border-blush-300 px-3 py-2 text-sm text-ink/70">Réponse de Miguel…</span>
            <span className="rounded-xl border border-dashed border-blush-300 px-3 py-2 text-sm text-ink/70">Réponse d’Adèle…</span>
          </div>
        </>
      );
      break;
  }

  return (
    <section className="rounded-3xl border border-blush-100 bg-blush-50/60 p-5" aria-label="Exemple tiré de vos contenus">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-wine-700">Exemple tiré de vos contenus</p>
      {body}
    </section>
  );
}
