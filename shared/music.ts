import type { Player } from './types.js';

/** État de lecture partagé par le couple (le serveur fait foi). */
export interface MusicState {
  trackId: string | null;
  playing: boolean;
  /** Position (secondes) au moment `anchorAt`. */
  position: number;
  /** Horloge serveur (ms) à laquelle `position` était exacte. */
  anchorAt: number;
  shuffle: boolean;
  updatedBy: Player | null;
  version: number;
}

export interface MusicSnapshot extends MusicState {
  serverNow: number;
}

export type MusicCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; position: number }
  | { type: 'select'; trackId: string }
  | { type: 'shuffle' }
  | { type: 'ended'; trackId: string };

export interface TrackDTO {
  id: string;
  fileName: string;
  title: string;
  artist: string;
  sortOrder: number;
  durationSec: number | null;
  sizeBytes: number | null;
}
