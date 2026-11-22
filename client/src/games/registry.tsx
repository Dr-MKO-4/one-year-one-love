import type { ComponentType } from 'react';
import { Brain, Gamepad2, HeartHandshake, Layers, PenLine, Scale, Sparkles } from 'lucide-react';
import type { GameId } from '@shared/types';
import type { GameProps } from '@/components/games/common';
import { WhoKnowsWho } from './who-knows-who/WhoKnowsWho';
import { WouldYouRather } from './would-you-rather/WouldYouRather';
import { MemoryOfUs } from './memory-of-us/MemoryOfUs';
import { DoYouRemember } from './do-you-remember/DoYouRemember';
import { LoveChallenges } from './love-challenges/LoveChallenges';
import { CompleteMySentence } from './complete-my-sentence/CompleteMySentence';

export const GAME_COMPONENTS: { [G in GameId]: ComponentType<GameProps<G>> } = {
  'who-knows-who': WhoKnowsWho,
  'would-you-rather': WouldYouRather,
  'memory-of-us': MemoryOfUs,
  'do-you-remember': DoYouRemember,
  'love-challenges': LoveChallenges,
  'complete-my-sentence': CompleteMySentence,
};

export const GAME_VISUALS: Record<GameId, { icon: typeof Gamepad2; gradient: string }> = {
  'who-knows-who': { icon: HeartHandshake, gradient: 'from-wine-500 to-wine-800' },
  'would-you-rather': { icon: Scale, gradient: 'from-blush-400 to-wine-500' },
  'memory-of-us': { icon: Layers, gradient: 'from-[#9C5A2E] to-wine-700' },
  'do-you-remember': { icon: Brain, gradient: 'from-wine-600 to-blush-400' },
  'love-challenges': { icon: Sparkles, gradient: 'from-blush-500 to-wine-600' },
  'complete-my-sentence': { icon: PenLine, gradient: 'from-wine-700 to-blush-500' },
};
