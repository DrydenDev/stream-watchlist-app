import type { WatchlistItem } from '../../types';
import type { RssFilm } from './letterboxd-rss';

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

async function searchMovie(title: string, year: string | null, apiKey: string): Promise<TmdbSearchResult | null> {
  const params = new URLSearchParams({ api_key: apiKey, query: title, ...(year ? { year } : {}) });
  const res = await fetch(`${BASE}/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.results[0] as TmdbSearchResult) ?? null;
}

async function fetchMovieDetails(tmdbId: number, apiKey: string): Promise<TmdbMovieDetails | null> {
  const res = await fetch(`${BASE}/movie/${tmdbId}?api_key=${apiKey}`);
  if (!res.ok) return null;
  return res.json();
}

function filmToItem(film: RssFilm, details: TmdbMovieDetails | null, _tmdbId: number | null): WatchlistItem {
  return {
    id: `lb:${film.letterboxdUrl}`,
    source: 'letterboxd',
    title: details?.title ?? film.filmTitle,
    poster: details?.poster_path ? `${POSTER_BASE}${details.poster_path}` : null,
    synopsis: details?.overview || null,
    runtimeMinutes: details?.runtime ?? null,
    url: film.letterboxdUrl,
    savedAt: new Date().toISOString(),
  };
}

export async function enrichWithTmdb(films: RssFilm[], apiKey: string): Promise<WatchlistItem[]> {
  const results: WatchlistItem[] = [];

  for (const film of films) {
    const match = await searchMovie(film.filmTitle, film.filmYear, apiKey);
    if (!match) {
      results.push(filmToItem(film, null, null));
      continue;
    }
    const details = await fetchMovieDetails(match.id, apiKey);
    results.push(filmToItem(film, details, match.id));
  }

  return results;
}
