// Règles communes de normalisation des scores (cahier des charges, section 7.1).

/** Ramène un score à l'intervalle 0..100, arrondi à l'unité. */
export function norm100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)));
}

/** Pourcentage earned/possible, ou null si rien n'était en jeu (ex. toutes les questions passées). */
export function pct(earned: number, possible: number): number | null {
  if (possible <= 0) return null;
  return norm100((earned / possible) * 100);
}

/** Moyenne des valeurs définies, ou null si aucune. */
export function mean(values: Array<number | null | undefined>): number | null {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return null;
  return norm100(v.reduce((a, b) => a + b, 0) / v.length);
}

export interface ScoreResult {
  miguel: number | null;
  adele: number | null;
  couple: number | null;
  compatibility: number | null;
}

/** Messages bienveillants : aucun score n'est présenté comme un échec. */
export function encouragement(score: number | null): string {
  if (score === null) return 'Merci d’avoir joué ensemble.';
  if (score >= 90) return 'Incroyable complicité. Vous êtes faits pour vous entendre.';
  if (score >= 70) return 'Très belle partie : vous vous connaissez déjà si bien.';
  if (score >= 50) return 'Une jolie partie, pleine de découvertes.';
  if (score >= 30) return 'Que de choses à découvrir encore l’un sur l’autre. C’est ce qui rend l’aventure belle.';
  return 'Chaque réponse est une occasion de mieux se connaître. On rejoue ?';
}
