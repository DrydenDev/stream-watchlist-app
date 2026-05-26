import type { WatchlistItem } from '../../types';
import type { LetterboxdFilm } from './letterboxd-csv';

const BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbSearchResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
}

interface TmdbProviderEntry {
  provider_name: string;
}

interface TmdbMovieDetails {
  runtime: number | null;
  overview: string;
  poster_path: string | null;
  title: string;
  release_date: string;
  'watch/providers': {
    results: Record<string, { flatrate?: TmdbProviderEntry[]; free?: TmdbProviderEntry[]; ads?: TmdbProviderEntry[] }>;
  } | null;
}

function tmdbHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function searchMovie(title: string, year: string | null, token: string): Promise<TmdbSearchResult | null> {
  const params = new URLSearchParams({ query: title, ...(year ? { year } : {}) });
  const res = await fetch(`${BASE}/search/movie?${params}`, { headers: tmdbHeaders(token) });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.results[0] as TmdbSearchResult) ?? null;
}

async function fetchMovieDetails(tmdbId: number, token: string): Promise<TmdbMovieDetails | null> {
  const res = await fetch(
    `${BASE}/movie/${tmdbId}?append_to_response=watch%2Fproviders`,
    { headers: tmdbHeaders(token) },
  );
  if (!res.ok) return null;
  return res.json();
}

function extractUsProviders(details: TmdbMovieDetails): { streaming: string[] | null; free: string[] | null } {
  const us = details['watch/providers']?.results?.['US'];
  if (!us) return { streaming: null, free: null };
  const streaming = (us.flatrate ?? []).map((p) => p.provider_name);
  // TMDB uses both 'free' and 'ads' keys for ad-supported services depending on region/title.
  const free = [...(us.free ?? []), ...(us.ads ?? [])].map((p) => p.provider_name);
  return { streaming, free };
}

function filmToItem(film: LetterboxdFilm, details: TmdbMovieDetails | null): WatchlistItem {
  const providers = details ? extractUsProviders(details) : { streaming: null, free: null };
  return {
    id: `lb:${film.url}`,
    source: 'letterboxd',
    title: details?.title ?? film.title,
    poster: details?.poster_path ? `${POSTER_BASE}${details.poster_path}` : null,
    synopsis: details?.overview || null,
    runtimeMinutes: details?.runtime ?? null,
    releaseDate: details?.release_date ?? null,
    streamingProviders: providers.streaming,
    freeProviders: providers.free,
    url: film.url,
    savedAt: new Date().toISOString(),
  };
}

export async function enrichWithTmdb(films: LetterboxdFilm[], token: string): Promise<WatchlistItem[]> {
  const results: WatchlistItem[] = [];

  for (const film of films) {
    const tmdbId = film.tmdbId ?? (await searchMovie(film.title, film.year, token))?.id ?? null;
    if (!tmdbId) {
      results.push(filmToItem(film, null));
      continue;
    }
    const details = await fetchMovieDetails(tmdbId, token);
    results.push(filmToItem(film, details));
  }

  return results;
}
