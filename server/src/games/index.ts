import type { GameId } from '../../../shared/types.js';
import type { GameEngine } from './engine.js';
import { whoKnowsWho } from './whoKnowsWho.js';
import { wouldYouRather } from './wouldYouRather.js';
import { memoryOfUs } from './memoryOfUs.js';
import { doYouRemember } from './doYouRemember.js';
import { loveChallenges } from './loveChallenges.js';
import { completeMySentence } from './completeMySentence.js';

export const ENGINES: Record<GameId, GameEngine<any>> = {
  'who-knows-who': whoKnowsWho,
  'would-you-rather': wouldYouRather,
  'memory-of-us': memoryOfUs,
  'do-you-remember': doYouRemember,
  'love-challenges': loveChallenges,
  'complete-my-sentence': completeMySentence,
};

export { GameError } from './engine.js';
