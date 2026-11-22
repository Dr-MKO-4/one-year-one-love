// Types partagés entre le serveur (moteurs de jeux) et le client (interfaces).

export type Player = 'miguel' | 'adele';
export const PLAYERS: Player[] = ['miguel', 'adele'];
export const PLAYER_NAMES: Record<Player, string> = { miguel: 'Miguel', adele: 'Adèle' };
export const otherPlayer = (p: Player): Player => (p === 'miguel' ? 'adele' : 'miguel');

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Intermédiaire',
  hard: 'Difficile',
};

export type PlayMode = 'duo' | 'alternate' | 'simultaneous' | 'solo';
export const MODE_LABELS: Record<PlayMode, string> = {
  duo: 'En duo',
  alternate: 'Chacun son tour',
  simultaneous: 'Réponses simultanées',
  solo: 'En solo',
};

export type GameId =
  | 'who-knows-who'
  | 'would-you-rather'
  | 'memory-of-us'
  | 'do-you-remember'
  | 'love-challenges'
  | 'complete-my-sentence';

export const GAME_IDS: GameId[] = [
  'who-knows-who',
  'would-you-rather',
  'memory-of-us',
  'do-you-remember',
  'love-challenges',
  'complete-my-sentence',
];

export type SessionStatus = 'in_progress' | 'completed' | 'interrupted';

/* ------------------------------------------------------------------ */
/* Contenus configurables (ContentItem.data)                           */
/* ------------------------------------------------------------------ */

/** Who Knows Who? : question formulée à la première personne ("Quel est mon plat préféré ?"). */
export interface WkwData {
  text: string;
  /** Pour qui la question est valable : l'un, l'autre ou les deux. */
  about: Player | 'both';
  /** Réponses de référence, enregistrées dans le jeu ou dans la configuration. */
  answers: Partial<Record<Player, string>>;
}

/** Tu préfères quoi ? */
export interface WyrData {
  a: string;
  b: string;
}

export type MemorySideKind = 'photo' | 'date' | 'place' | 'memory' | 'text';
export interface MemorySide {
  kind: MemorySideKind;
  /** Texte, ou identifiant de photo si kind === 'photo'. */
  value: string;
}
/** Memory of Us : une association entre deux cartes. */
export interface MemoryData {
  left: MemorySide;
  right: MemorySide;
  caption?: string;
}

/** Do You Remember? */
export interface RememberData {
  text: string;
  kind: 'mcq' | 'free';
  choices?: string[];
  /** Réponse de référence (peut être enregistrée pendant la partie si vide). */
  answer?: string;
  /** Mots-clés acceptés pour la comparaison assistée. */
  keywords?: string[];
  allowPartial?: boolean;
  points?: number;
}

export type ChallengeCategory = 'romantic' | 'fun' | 'memory' | 'creative' | 'together';
export const CHALLENGE_CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  romantic: 'Romantique',
  fun: 'Amusant',
  memory: 'Mémoire',
  creative: 'Créativité',
  together: 'Ensemble',
};
/** Love Challenges */
export interface ChallengeData {
  text: string;
  category: ChallengeCategory;
  target: 'individual' | 'couple';
  points: number;
  allowPartial: boolean;
  durationSec?: number;
  forbiddenWords?: string[];
}

/** Complete My Sentence */
export interface SentenceData {
  prompt: string;
  /** Groupes de mots-clés équivalents (ex. ["plage", "mer", "océan"]). */
  keywordGroups?: string[][];
}

export interface ContentDataMap {
  'who-knows-who': WkwData;
  'would-you-rather': WyrData;
  'memory-of-us': MemoryData;
  'do-you-remember': RememberData;
  'love-challenges': ChallengeData;
  'complete-my-sentence': SentenceData;
}

export interface ContentItem<G extends GameId = GameId> {
  id: string;
  gameId: G;
  difficulty: Difficulty;
  data: ContentDataMap[G];
  active: boolean;
  toConfirm: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* États de partie (GameSession.state)                                 */
/* ------------------------------------------------------------------ */

export type Verdict = 'correct' | 'partial' | 'incorrect' | 'skipped';

export interface WkwRound {
  itemId: string;
  text: string;
  subject: Player;
  guesser: Player;
  /** Masqué pour le joueur qui devine tant que la phase n'est pas "validate". */
  reference: string | null;
  hadReference: boolean;
  guess?: string;
  suggestion?: 'correct' | 'incorrect';
  result?: Verdict;
}
export interface WkwState {
  rounds: WkwRound[];
  index: number;
  phase: 'reference' | 'guess' | 'validate' | 'done';
}

export interface WyrRound {
  itemId: string;
  a: string;
  b: string;
  /** Les choix de l'autre restent masqués ("hidden") avant la révélation. */
  choices: Partial<Record<Player, 'a' | 'b' | 'skip' | 'hidden'>>;
  reasons: Partial<Record<Player, string>>;
  revealed: boolean;
}
export interface WyrState {
  rounds: WyrRound[];
  index: number;
  done: boolean;
}

export interface MemoryCard {
  id: number;
  pairId: string;
  /** Masqué (null) tant que la carte n'est pas retournée ou trouvée. */
  content: MemorySide | null;
  matched: boolean;
  matchedBy?: Player;
}
export interface MemoryState {
  level: number;
  levels: number[];
  cards: MemoryCard[];
  flipped: number[];
  lastMiss: { cards: [number, number]; at: number } | null;
  turn: Player;
  attempts: Partial<Record<Player, number>>;
  pairsFound: Partial<Record<Player, number>>;
  totalPairs: number;
  startedAt: number;
  finishedAt: number | null;
  timeLimitSec: number | null;
  timedOut: boolean;
  done: boolean;
}

export interface RememberRound {
  itemId: string;
  text: string;
  kind: 'mcq' | 'free';
  choices?: string[];
  reference: string | null;
  hadReference: boolean;
  allowPartial: boolean;
  points: number;
  player: Player;
  answer?: string;
  suggestion?: Verdict;
  result?: Verdict;
  deadline: number | null;
}
export interface RememberState {
  rounds: RememberRound[];
  index: number;
  phase: 'answer' | 'validate' | 'done';
  timePerQuestionSec: number | null;
}

export type ChallengeResult = 'done' | 'partial' | 'failed' | 'skipped';
export interface ChallengeRound {
  itemId: string;
  text: string;
  category: ChallengeCategory;
  target: 'individual' | 'couple';
  points: number;
  allowPartial: boolean;
  durationSec?: number;
  forbiddenWords?: string[];
  player: Player | null;
  timerStartedAt: number | null;
  result?: ChallengeResult;
}
export interface ChallengeState {
  rounds: ChallengeRound[];
  index: number;
  done: boolean;
}

export type Concordance = 'exact' | 'close' | 'different';
export interface SentenceRound {
  itemId: string;
  prompt: string;
  /** Les réponses de l'autre restent masquées ("•••") avant la révélation. */
  answers: Partial<Record<Player, string>>;
  submitted: Partial<Record<Player, boolean>>;
  skipped: Partial<Record<Player, boolean>>;
  revealed: boolean;
  suggestion?: Concordance;
  similarity?: number;
  result?: Concordance | 'skipped';
  deadline: number | null;
}
export interface SentenceState {
  rounds: SentenceRound[];
  index: number;
  done: boolean;
  timePerSentenceSec: number | null;
}

export interface GameStateMap {
  'who-knows-who': WkwState;
  'would-you-rather': WyrState;
  'memory-of-us': MemoryState;
  'do-you-remember': RememberState;
  'love-challenges': ChallengeState;
  'complete-my-sentence': SentenceState;
}

export interface GameAction {
  type: string;
  payload?: Record<string, unknown>;
  /** Mode un seul appareil : joueur pour qui l'action est faite. */
  as?: Player;
}

export interface SessionDTO<G extends GameId = GameId> {
  id: string;
  gameId: G;
  mode: PlayMode;
  difficulty: Difficulty;
  players: Player[];
  sharedDevice: boolean;
  state: GameStateMap[G];
  status: SessionStatus;
  scores: Partial<Record<Player, number | null>>;
  coupleScore: number | null;
  compatibility: number | null;
  version: number;
  createdBy: Player;
  startedAt: string;
  endedAt: string | null;
  /** Horloge du serveur (ms) pour synchroniser les minuteurs entre appareils. */
  serverNow: number;
}

export interface CreateSessionInput {
  gameId: GameId;
  difficulty: Difficulty;
  mode: PlayMode;
  players: Player[];
  sharedDevice: boolean;
}

/* ------------------------------------------------------------------ */
/* Métadonnées des jeux (affichage et règles de configuration)         */
/* ------------------------------------------------------------------ */

export interface GameMeta {
  id: GameId;
  title: string;
  tagline: string;
  objective: string;
  difficultyLabel: string;
  modes: PlayMode[];
  defaultMode: PlayMode;
  scoreLabel: string;
  rules: string[];
  /** Le jeu exige les deux joueurs. */
  needsBoth: boolean;
}

export const GAMES: Record<GameId, GameMeta> = {
  'who-knows-who': {
    id: 'who-knows-who',
    title: 'Who Knows Who?',
    tagline: 'À quel point vous connaissez-vous ?',
    objective: 'Découvrir à quel point chacun connaît l’autre.',
    difficultyLabel: 'Progressive',
    modes: ['alternate'],
    defaultMode: 'alternate',
    scoreLabel: 'Personnel + commun',
    needsBoth: true,
    rules: [
      'Chacun son tour, l’un devine une réponse qui concerne l’autre.',
      'Si la réponse de référence n’existe pas encore, la personne concernée l’écrit d’abord en secret : elle est enregistrée pour les prochaines parties.',
      'La personne concernée valide la réponse (le jeu propose une suggestion).',
      'Bonne réponse : 10 points. Mauvaise réponse : 0 point. Score sur 100 pour chacun, score commun = moyenne.',
      'Une question gêne ? On peut toujours la passer.',
    ],
  },
  'would-you-rather': {
    id: 'would-you-rather',
    title: 'Tu préfères quoi ?',
    tagline: 'Vos préférences, côte à côte.',
    objective: 'Découvrir vos préférences et mesurer vos ressemblances.',
    difficultyLabel: 'Accessible',
    modes: ['simultaneous'],
    defaultMode: 'simultaneous',
    scoreLabel: 'Participation + compatibilité',
    needsBoth: true,
    rules: [
      'Deux possibilités s’affichent : chacun choisit en secret.',
      'Les deux réponses sont révélées en même temps.',
      'Chacun peut expliquer son choix en quelques mots (facultatif).',
      'Même choix : 10 points communs. Le score de compatibilité est simplement le taux de réponses identiques : ce n’est pas une mesure scientifique de votre relation.',
    ],
  },
  'memory-of-us': {
    id: 'memory-of-us',
    title: 'Memory of Us',
    tagline: 'Retrouvez les paires de vos souvenirs.',
    objective: 'Retrouver les associations liées à vos souvenirs.',
    difficultyLabel: 'Progressive',
    modes: ['duo', 'solo'],
    defaultMode: 'duo',
    scoreLabel: 'Personnel + commun',
    needsBoth: false,
    rules: [
      'Les cartes sont face cachée : photos, dates, lieux et souvenirs.',
      'Retournez deux cartes pour retrouver une association (une photo et sa date, un souvenir et son lieu...).',
      'En duo, on garde la main tant qu’on trouve des paires.',
      'Le score tient compte des paires trouvées et du nombre de tentatives. Le temps est affiché en complément.',
      'Le jeu commence petit puis ajoute des cartes au niveau suivant.',
    ],
  },
  'do-you-remember': {
    id: 'do-you-remember',
    title: 'Do You Remember?',
    tagline: 'Votre histoire, question après question.',
    objective: 'Tester votre mémoire des événements de votre relation.',
    difficultyLabel: 'Intermédiaire à difficile',
    modes: ['alternate'],
    defaultMode: 'alternate',
    scoreLabel: 'Personnel + commun',
    needsBoth: true,
    rules: [
      'Chacun répond à son tour à une question sur votre histoire.',
      'Questions à choix multiples (corrigées automatiquement) ou à réponse libre (validées par l’autre).',
      'Réponse correcte : points complets. Partiellement correcte : moitié des points si la question le permet.',
      'En difficile, le temps de réponse est limité.',
    ],
  },
  'love-challenges': {
    id: 'love-challenges',
    title: 'Love Challenges',
    tagline: 'Petits défis, grands sourires.',
    objective: 'Transformer le jeu en petits défis amusants et romantiques.',
    difficultyLabel: 'Accessible à intermédiaire',
    modes: ['duo'],
    defaultMode: 'duo',
    scoreLabel: 'Personnel + commun',
    needsBoth: true,
    rules: [
      'Une succession de défis : romantiques, amusants, de mémoire, de créativité ou à faire ensemble.',
      'Les défis individuels sont validés par l’autre, les défis communs par l’un de vous deux.',
      'Réalisé : points complets. Partiellement : moitié des points si prévu. Non réalisé : 0.',
      'Un défi ne vous plaît pas ? Passez-le, il ne compte pas.',
    ],
  },
  'complete-my-sentence': {
    id: 'complete-my-sentence',
    title: 'Complete My Sentence',
    tagline: 'Pensez-vous la même chose ?',
    objective: 'Découvrir si vous pensez de la même manière.',
    difficultyLabel: 'Intermédiaire',
    modes: ['simultaneous'],
    defaultMode: 'simultaneous',
    scoreLabel: 'Personnel + commun',
    needsBoth: true,
    rules: [
      'Une phrase incomplète s’affiche : chacun la complète sans voir la réponse de l’autre.',
      'Les réponses sont révélées et le jeu propose un degré de concordance à partir de mots-clés.',
      'Vous confirmez ou corrigez : identique 10 points, proche 5 points, différent 0 point.',
      'Le jeu ne prétend pas comprendre toutes les nuances de vos mots : c’est vous qui avez le dernier mot.',
    ],
  },
};
