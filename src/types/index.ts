export type Source = 'youtube' | 'letterboxd';

export interface WatchlistItem {
  id: string;
  source: Source;
  title: string;
  poster: string | null;
  synopsis: string | null;
  runtimeMinutes: number | null;
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
  letterboxd: { username: string } | null;
  tmdbApiKey: string | null;
}

export interface ListCache {
  items: WatchlistItem[];
  fetchedAt: number; // unix ms
}
