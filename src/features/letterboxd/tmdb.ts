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

interface TmdbMovieDetails {
  runtime: number | null;
  overview: string;
  poster_path: string | null;
  title: string;
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
  const res = await fetch(`${BASE}/movie/${tmdbId}`, { headers: tmdbHeaders(token) });
  if (!res.ok) return null;
  return res.json();
}

function filmToItem(film: LetterboxdFilm, details: TmdbMovieDetails | null, _tmdbId: number | null): WatchlistItem {
  return {
    id: `lb:${film.url}`,
    source: 'letterboxd',
    title: details?.title ?? film.title,
    poster: details?.poster_path ? `${POSTER_BASE}${details.poster_path}` : null,
    synopsis: details?.overview || null,
    runtimeMinutes: details?.runtime ?? null,
    url: film.url,
    savedAt: new Date().toISOString(),
  };
}

export async function enrichWithTmdb(films: LetterboxdFilm[], token: string): Promise<WatchlistItem[]> {
  const results: WatchlistItem[] = [];

  for (const film of films) {
    const tmdbId = film.tmdbId ?? (await searchMovie(film.title, film.year, token))?.id ?? null;
    if (!tmdbId) {
      results.push(filmToItem(film, null, null));
      continue;
    }
    const details = await fetchMovieDetails(tmdbId, token);
    results.push(filmToItem(film, details, tmdbId));
  }

  return results;
}
