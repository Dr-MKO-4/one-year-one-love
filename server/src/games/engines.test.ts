import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContentItem, GameId, Player } from '../../../shared/types.js';
import { concordance, suggestVerdict } from '../../../shared/text.js';
import { whoKnowsWho } from './whoKnowsWho.js';
import { wouldYouRather } from './wouldYouRather.js';
import { memoryOfUs } from './memoryOfUs.js';
import { doYouRemember } from './doYouRemember.js';
import { loveChallenges } from './loveChallenges.js';
import { completeMySentence } from './completeMySentence.js';
import type { SessionMeta } from './engine.js';

const item = (gameId: GameId, id: string, data: unknown, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): ContentItem => ({
  id,
  gameId,
  difficulty,
  data: data as never,
  active: true,
  toConfirm: false,
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
});
const duo = (mode: SessionMeta['mode']): SessionMeta => ({ mode, difficulty: 'easy', players: ['miguel', 'adele'], sharedDevice: false });

test('Who Knows Who : référence saisie en jeu, scores sur 100 et moyenne commune', () => {
  const e = whoKnowsWho;
  const items = Array.from({ length: 8 }, (_, i) => item('who-knows-who', `q${i}`, { text: `Q${i}`, about: 'both', answers: {} }));
  const meta = duo('alternate');
  let s = e.init({ ...meta, items, now: 0 });
  assert.equal(s.rounds.length, 6);
  assert.equal(s.phase, 'reference');
  const effects: unknown[] = [];
  let i = 0;
  while (!e.isFinished(s)) {
    const r = s.rounds[s.index];
    const ref = e.apply(s, { type: 'reference', payload: { answer: 'Pizza' } }, r.subject, meta, 0);
    effects.push(...(ref.effects ?? []));
    // La vue du joueur qui devine ne révèle pas la réponse.
    assert.equal(e.view(ref.state, r.guesser, meta, 0).rounds[ref.state.index].reference, '•••');
    s = e.apply(ref.state, { type: 'guess', payload: { answer: i % 2 ? 'Sushi' : 'pizza' } }, r.guesser, meta, 0).state;
    assert.throws(() => e.apply(s, { type: 'validate', payload: { result: 'correct' } }, r.guesser, meta, 0));
    s = e.apply(s, { type: 'validate', payload: { result: s.rounds[s.index].suggestion! } }, r.subject, meta, 0).state;
    i++;
  }
  assert.equal(effects.length, 6);
  const sc = e.score(s, meta);
  assert.equal(sc.couple, Math.round(((sc.miguel ?? 0) + (sc.adele ?? 0)) / 2));
  assert.ok([0, 100].includes(sc.miguel!) && [0, 100].includes(sc.adele!));
});

test('Tu préfères quoi ? : choix masqués avant révélation, compatibilité = taux identique', () => {
  const e = wouldYouRather;
  const items = Array.from({ length: 8 }, (_, i) => item('would-you-rather', `w${i}`, { a: 'A', b: 'B' }));
  const meta = duo('simultaneous');
  let s = e.init({ ...meta, items, now: 0 });
  s.rounds.forEach((_, i) => {
    s = e.apply(s, { type: 'choose', payload: { choice: 'a' } }, 'miguel', meta, 0).state;
    if (i === 0) assert.equal(e.view(s, 'adele', meta, 0).rounds[0].choices.miguel, 'hidden');
    s = e.apply(s, { type: 'choose', payload: { choice: i < 6 ? 'a' : 'b' } }, 'adele', meta, 0).state;
    s = e.apply(s, { type: 'next' }, 'adele', meta, 0).state;
  });
  const sc = e.score(s, meta);
  assert.equal(sc.compatibility, 75);
  assert.equal(sc.miguel, 100);
});

test('Memory of Us : paires, changement de niveau et score borné', () => {
  const e = memoryOfUs;
  const items = Array.from({ length: 6 }, (_, i) =>
    item('memory-of-us', `m${i}`, { left: { kind: 'date', value: `D${i}` }, right: { kind: 'memory', value: `S${i}` } }),
  );
  const meta: SessionMeta = { mode: 'solo', difficulty: 'easy', players: ['adele'], sharedDevice: true };
  let s = e.init({ ...meta, items, now: 0 });
  assert.deepEqual(s.levels, [3, 4]);
  // Les cartes cachées ne révèlent pas leur contenu.
  assert.ok(e.view(s, 'adele', meta, 0).cards.every((c) => c.content === null));
  let guard = 0;
  while (!e.isFinished(s) && guard++ < 100) {
    const open = s.cards.filter((c) => !c.matched);
    const a = open[0];
    const b = open.find((c) => c.id !== a.id && c.pairId === a.pairId)!;
    s = e.apply(s, { type: 'flip', payload: { cardId: a.id } }, 'adele', meta, 0).state;
    s = e.apply(s, { type: 'flip', payload: { cardId: b.id } }, 'adele', meta, 0).state;
  }
  assert.ok(e.isFinished(s));
  const sc = e.score(s, meta);
  assert.equal(sc.adele, 100);
  assert.equal(sc.couple, null);
});

test('Do You Remember : choix multiple corrigé automatiquement, partiel = moitié des points', () => {
  const e = doYouRemember;
  const items = [
    item('do-you-remember', 'r1', { text: 'Date ?', kind: 'mcq', choices: ['22 mars 2025', '1 avril'], answer: '22 mars 2025' }),
    item('do-you-remember', 'r2', { text: 'Surnom ?', kind: 'free', answer: 'Ursule', allowPartial: true }),
  ];
  const meta = duo('alternate');
  let s = e.init({ ...meta, items, now: 0 });
  for (const r of s.rounds) {
    const v = r.kind === 'mcq' ? '22 mars 2025' : 'ursul';
    s = e.apply(s, { type: 'answer', payload: { answer: v } }, r.player, meta, 0).state;
    const other: Player = r.player === 'miguel' ? 'adele' : 'miguel';
    s = e.apply(s, { type: 'validate', payload: { result: r.kind === 'mcq' ? 'correct' : 'partial' } }, other, meta, 0).state;
  }
  const sc = e.score(s, meta);
  const mcqPlayer = s.rounds.find((r) => r.kind === 'mcq')!.player;
  assert.equal(sc[mcqPlayer], 100);
  assert.equal(sc[mcqPlayer === 'miguel' ? 'adele' : 'miguel'], 50);
});

test('Love Challenges : défis passés exclus, score commun sur les défis à deux', () => {
  const e = loveChallenges;
  const items = [
    item('love-challenges', 'c1', { text: 'Solo', category: 'fun', target: 'individual', points: 10, allowPartial: true }),
    item('love-challenges', 'c2', { text: 'Duo', category: 'together', target: 'couple', points: 20, allowPartial: true }),
    item('love-challenges', 'c3', { text: 'Solo 2', category: 'romantic', target: 'individual', points: 10, allowPartial: false }),
  ];
  const meta = duo('duo');
  let s = e.init({ ...meta, items, now: 0 });
  for (const r of s.rounds) {
    if (r.target === 'couple') s = e.apply(s, { type: 'validate', payload: { result: 'partial' } }, 'miguel', meta, 0).state;
    else if (r.text === 'Solo 2') s = e.apply(s, { type: 'skip' }, r.player!, meta, 0).state;
    else s = e.apply(s, { type: 'validate', payload: { result: 'done' } }, r.player === 'miguel' ? 'adele' : 'miguel', meta, 0).state;
  }
  const sc = e.score(s, meta);
  assert.equal(sc.couple, 50);
  const solo = s.rounds.find((r) => r.text === 'Solo')!.player!;
  assert.equal(sc[solo], 100);
});

test('Complete My Sentence : réponses masquées puis concordance 10/5/0', () => {
  const e = completeMySentence;
  const items = Array.from({ length: 4 }, (_, i) => item('complete-my-sentence', `s${i}`, { prompt: `P${i}`, keywordGroups: [['plage', 'mer']] }));
  const meta = duo('simultaneous');
  let s = e.init({ ...meta, items, now: 0 });
  const results = ['exact', 'close', 'different', 'exact'];
  s.rounds.forEach((_, i) => {
    s = e.apply(s, { type: 'submit', payload: { answer: 'la plage' } }, 'miguel', meta, 0).state;
    assert.equal(e.view(s, 'adele', meta, 0).rounds[i].answers.miguel, '•••');
    s = e.apply(s, { type: 'submit', payload: { answer: 'la mer' } }, 'adele', meta, 0).state;
    assert.equal(s.rounds[i].suggestion, 'close');
    s = e.apply(s, { type: 'settle', payload: { result: results[i] } }, 'miguel', meta, 0).state;
  });
  assert.equal(e.score(s, meta).couple, 63); // 25 / 40
});

test('Comparaison assistée des textes', () => {
  assert.equal(suggestVerdict('Le poulet DG', 'poulet dg'), 'correct');
  assert.equal(suggestVerdict('ndolé', 'Le ndolé aux crevettes'), 'correct');
  assert.equal(suggestVerdict('décembre', '4 décembre', ['4 décembre', 'décembre'], true), 'partial');
  assert.equal(suggestVerdict('Paris', 'Zanzibar'), 'incorrect');
  assert.equal(concordance('partir à Zanzibar', 'Zanzibar').level, 'close');
  assert.equal(concordance('Un voyage', 'un voyage').level, 'exact');
});
