export type Source = 'youtube' | 'letterboxd';

export interface WatchlistItem {
  id: string;
  source: Source;
  title: string;
  poster: string | null;
  synopsis: string | null;
  runtimeMinutes: number | null;
  releaseDate: string | null;
  streamingProviders: string[] | null; // US flatrate (subscription) provider names; null = no TMDB data
  freeProviders: string[] | null;      // US free/ad-supported provider names; null = no TMDB data
  rentProviders: string[] | null;      // US rent+buy provider names; null = no TMDB data
  url: string;
  savedAt: string;
}

export interface YouTubeToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

export interface AppConfig {
  youtube: YouTubeToken | null;
  youtubeClientId: string | null;
  youtubePlaylistIds: string[] | null;
  letterboxd: { importedAt: string; count: number } | null;
  tmdbApiKey: string | null;
}

export interface ListCache {
  items: WatchlistItem[];
  fetchedAt: number; // unix ms
}
