// Comparaison assistée de réponses libres.
// Volontairement simple et transparente : le jeu suggère, les joueurs décident.

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'au', 'aux', 'a', 'et', 'ou',
  'en', 'dans', 'sur', 'pour', 'par', 'avec', 'que', 'qui', 'quoi', 'ce', 'ca', 'cette',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos',
  'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'm', 'te', 't',
  'se', 's', 'y', 'est', 'c', 'qu', 'n', 'ne', 'pas', 'plus', 'tres', 'trop', 'bien',
  'the', 'a', 'an', 'of', 'to', 'and', 'is', 'my', 'your',
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Racinisation très légère : retire les pluriels et quelques terminaisons courantes. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('s')) word = word.slice(0, -1);
  if (word.length > 4 && word.endsWith('x')) word = word.slice(0, -1);
  if (word.length > 5 && word.endsWith('e')) word = word.slice(0, -1);
  return word;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .map(stem);
}

/** Distance de Levenshtein (pour tolérer les petites fautes de frappe). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const max = Math.max(a.length, b.length);
  if (max >= 5) return levenshtein(a, b) <= 1;
  return false;
}

/** Similarité 0..1 entre deux textes, basée sur les mots significatifs. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = Array.from(new Set(tokens(a)));
  const tb = Array.from(new Set(tokens(b)));
  if (!ta.length || !tb.length) return 0;
  let common = 0;
  for (const w of ta) if (tb.some((x) => wordsMatch(w, x))) common++;
  // Coefficient de Dice : robuste aux réponses de longueurs différentes.
  return (2 * common) / (ta.length + tb.length);
}

/** Vrai si le texte contient au moins un mot-clé (comparaison normalisée). */
export function containsKeyword(text: string, keyword: string): boolean {
  const nt = ` ${normalize(text)} `;
  const nk = normalize(keyword);
  if (!nk) return false;
  if (nt.includes(` ${nk} `)) return true;
  const kt = tokens(keyword);
  const tt = tokens(text);
  return kt.length > 0 && kt.every((k) => tt.some((t) => wordsMatch(k, t)));
}

/** Suggestion pour une réponse comparée à une référence (+ mots-clés optionnels). */
export function suggestVerdict(
  answer: string,
  reference: string | null | undefined,
  keywords: string[] = [],
  allowPartial = false,
): 'correct' | 'partial' | 'incorrect' {
  if (!answer.trim()) return 'incorrect';
  if (reference) {
    const s = similarity(answer, reference);
    if (s >= 0.8 || containsKeyword(answer, reference)) return 'correct';
    // La réponse n'est qu'une partie de la référence ("décembre" pour "4 décembre").
    if (containsKeyword(reference, answer)) return allowPartial ? 'partial' : 'correct';
    if (allowPartial && s >= 0.4) return 'partial';
  }
  if (keywords.length) {
    const hits = keywords.filter((k) => containsKeyword(answer, k)).length;
    if (hits === keywords.length || (hits > 0 && !allowPartial)) return 'correct';
    if (hits > 0) return 'partial';
  }
  return 'incorrect';
}

/** Concordance entre deux phrases complétées. */
export function concordance(
  a: string,
  b: string,
  keywordGroups: string[][] = [],
): { level: 'exact' | 'close' | 'different'; score: number } {
  const s = similarity(a, b);
  if (normalize(a) === normalize(b) || s >= 0.85) return { level: 'exact', score: s };
  const sharedGroup = keywordGroups.some(
    (group) => group.some((k) => containsKeyword(a, k)) && group.some((k) => containsKeyword(b, k)),
  );
  if (sharedGroup || s >= 0.35) return { level: 'close', score: Math.max(s, sharedGroup ? 0.5 : s) };
  return { level: 'different', score: s };
}
