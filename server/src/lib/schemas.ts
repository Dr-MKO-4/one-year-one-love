import { z } from 'zod';
import type { GameId } from '../../../shared/types.js';

const player = z.enum(['miguel', 'adele']);
export const difficulty = z.enum(['easy', 'medium', 'hard']);
export const gameId = z.enum([
  'who-knows-who',
  'would-you-rather',
  'memory-of-us',
  'do-you-remember',
  'love-challenges',
  'complete-my-sentence',
]);
const text = (max = 300) => z.string().trim().min(1, 'Champ obligatoire').max(max);
const optText = (max = 300) => z.string().trim().max(max).optional();

const memorySide = z.object({
  kind: z.enum(['photo', 'date', 'place', 'memory', 'text']),
  value: text(200),
});

export const contentSchemas: Record<GameId, z.ZodTypeAny> = {
  'who-knows-who': z.object({
    text: text(),
    about: z.enum(['miguel', 'adele', 'both']),
    answers: z.object({ miguel: optText(200), adele: optText(200) }).default({}),
  }),
  'would-you-rather': z.object({ a: text(150), b: text(150) }),
  'memory-of-us': z.object({ left: memorySide, right: memorySide, caption: optText(200) }),
  'do-you-remember': z
    .object({
      text: text(),
      kind: z.enum(['mcq', 'free']),
      choices: z.array(text(120)).max(6).optional(),
      answer: optText(300),
      keywords: z.array(text(60)).max(20).optional(),
      allowPartial: z.boolean().optional(),
      points: z.number().int().min(1).max(100).optional(),
    })
    .refine((d) => d.kind !== 'mcq' || ((d.choices?.length ?? 0) >= 2 && !!d.answer && d.choices!.includes(d.answer)), {
      message: 'Un choix multiple demande au moins deux choix et une bonne réponse présente dans la liste.',
    }),
  'love-challenges': z.object({
    text: text(400),
    category: z.enum(['romantic', 'fun', 'memory', 'creative', 'together']),
    target: z.enum(['individual', 'couple']),
    points: z.number().int().min(1).max(100),
    allowPartial: z.boolean(),
    durationSec: z.number().int().min(10).max(1800).optional(),
    forbiddenWords: z.array(text(40)).max(10).optional(),
  }),
  'complete-my-sentence': z.object({
    prompt: text(),
    keywordGroups: z.array(z.array(text(60)).min(1).max(15)).max(15).optional(),
  }),
};

export const contentInput = z.object({
  gameId,
  difficulty: difficulty.default('easy'),
  data: z.unknown(),
  active: z.boolean().default(true),
  toConfirm: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const createSessionInput = z.object({
  gameId,
  difficulty,
  mode: z.enum(['duo', 'alternate', 'simultaneous', 'solo']),
  players: z.array(player).min(1).max(2),
  sharedDevice: z.boolean().default(false),
});

export const actionInput = z.object({
  type: z.string().min(1).max(40),
  payload: z.record(z.unknown()).optional(),
  as: player.optional(),
});

export const timelineInput = z.object({
  date: text(60),
  title: text(120),
  description: optText(1000).nullable(),
  photoId: z.string().max(40).nullable().optional(),
  toConfirm: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const photoInput = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/, 'Image invalide'),
  width: z.number().int().min(1).max(4000),
  height: z.number().int().min(1).max(4000),
  caption: optText(200),
});
