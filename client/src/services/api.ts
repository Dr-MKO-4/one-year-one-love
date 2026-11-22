import type {
  ContentItem,
  CreateSessionInput,
  GameAction,
  GameId,
  Player,
  SessionDTO,
  SessionStatus,
} from '@shared/types';
import type { TrackDTO } from '@shared/music';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown, raw?: { type: string; data: Blob }): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: raw ? { 'Content-Type': raw.type } : body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: raw ? raw.data : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !url.includes('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(data?.error ?? `Erreur ${res.status}`, res.status);
  }
  return data as T;
}

export const get = <T>(url: string) => request<T>('GET', url);
export const post = <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {});
export const put = <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {});
export const patch = <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {});
export const del = <T>(url: string) => request<T>('DELETE', url);

export interface SessionSummary {
  id: string;
  gameId: GameId;
  mode: string;
  difficulty: string;
  players: Player[];
  sharedDevice: boolean;
  status: SessionStatus;
  scores: Partial<Record<Player, number | null>>;
  coupleScore: number | null;
  compatibility: number | null;
  createdBy: Player;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
}

export interface Dashboard {
  sessionsTotal: number;
  sessionsCompleted: number;
  sessionsInterrupted: number;
  sessionsInProgress: number;
  gamesFinished: number;
  miguel: number | null;
  adele: number | null;
  couple: number | null;
  compatibility: number | null;
  best: { player: Player; score: number; gameId: GameId; sessionId: string; date: string } | null;
  perGame: Array<{
    gameId: GameId;
    played: number;
    miguel: number | null;
    adele: number | null;
    couple: number | null;
    compatibility: number | null;
    best: number | null;
    progression: Array<{ date: string; miguel: number | null; adele: number | null; couple: number | null }>;
  }>;
  recent: SessionSummary[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string | null;
  photoId: string | null;
  toConfirm: boolean;
  sortOrder: number;
}

export interface PhotoMeta {
  id: string;
  width: number;
  height: number;
  caption: string | null;
  createdAt: string;
}

export type Track = TrackDTO;

export interface Letter {
  title: string;
  body: string;
  signature: string;
  /** Seule une lettre publiée s'affiche sur l'accueil. */
  published?: boolean;
  /** Signature manuscrite (image PNG transparente, en data URL). */
  signatureImage?: string;
}

export interface ChatMessage {
  from: 'me' | 'them';
  text: string;
  time?: string;
  day?: string;
  reply?: { name: string; text: string };
}

export interface ChatCapture {
  id: string;
  title: string;
  caption?: string;
  contact: string;
  status?: string;
  /** Titre d'un moment de la frise sous lequel afficher la conversation. */
  attachTo?: string;
  messages: ChatMessage[];
}

export interface MessageMemories {
  published: boolean;
  excerpts: string[];
  chats?: ChatCapture[];
}

export const api = {
  login: (player: Player, pin: string) => post<{ player: Player }>('/api/auth/login', { player, pin }),
  logout: () => post('/api/auth/logout'),
  me: () => get<{ player: Player }>('/api/auth/me'),

  content: (gameId?: GameId) => get<ContentItem[]>(`/api/content${gameId ? `?gameId=${gameId}` : ''}`),
  contentCounts: () => get<Partial<Record<GameId, number>>>('/api/content/counts'),
  createContent: (body: Partial<ContentItem>) => post<ContentItem>('/api/content', body),
  updateContent: (id: string, body: Partial<ContentItem>) => put<ContentItem>(`/api/content/${id}`, body),
  deleteContent: (id: string) => del(`/api/content/${id}`),

  sessions: (q: { status?: SessionStatus; gameId?: GameId; limit?: number } = {}) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined) as [string, string][]);
    return get<SessionSummary[]>(`/api/sessions?${p}`);
  },
  session: (id: string) => get<SessionDTO>(`/api/sessions/${id}`),
  createSession: (input: CreateSessionInput) => post<SessionDTO>('/api/sessions', input),
  act: (id: string, action: GameAction) => post<SessionDTO>(`/api/sessions/${id}/actions`, action),
  interrupt: (id: string) => post<SessionDTO>(`/api/sessions/${id}/interrupt`),
  resume: (id: string) => post<SessionDTO>(`/api/sessions/${id}/resume`),
  deleteSession: (id: string) => del(`/api/sessions/${id}`),
  dashboard: () => get<Dashboard>('/api/stats/dashboard'),

  timeline: () => get<TimelineEvent[]>('/api/timeline'),
  createEvent: (b: Partial<TimelineEvent>) => post<TimelineEvent>('/api/timeline', b),
  updateEvent: (id: string, b: Partial<TimelineEvent>) => put<TimelineEvent>(`/api/timeline/${id}`, b),
  deleteEvent: (id: string) => del(`/api/timeline/${id}`),

  photos: () => get<PhotoMeta[]>('/api/photos'),
  uploadPhoto: (b: { dataUrl: string; width: number; height: number; caption?: string }) => post<PhotoMeta>('/api/photos', b),
  deletePhoto: (id: string) => del(`/api/photos/${id}`),

  letter: () => get<Letter | null>('/api/settings/letter'),
  saveLetter: (l: Letter) => put<Letter>('/api/settings/letter', l),
  messages: () => get<MessageMemories | null>('/api/settings/messages'),
  saveMessages: (messages: MessageMemories) => put<MessageMemories>('/api/settings/messages', messages),

  tracks: () => get<Track[]>('/api/tracks'),
  updateTrack: (id: string, b: Partial<Pick<Track, 'title' | 'artist' | 'sortOrder'>>) => put<Track>(`/api/tracks/${id}`, b),
  deleteTrack: (id: string) => del(`/api/tracks/${id}`),
  rescanTracks: () => post<Track[]>('/api/tracks/rescan'),
  uploadTrack: (file: File) =>
    request<Track>('POST', `/api/tracks/upload?name=${encodeURIComponent(file.name)}`, undefined, { type: 'application/octet-stream', data: file }),

  importBackup: (data: unknown) => post<{ ok: boolean; imported: Record<string, number> }>('/api/backup/import', data),
};

export const photoUrl = (id: string) => `/api/photos/${id}`;
export const audioUrl = (id: string) => `/api/tracks/${id}/audio`;
