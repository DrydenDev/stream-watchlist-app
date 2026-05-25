import type { LetterboxdFilm } from '../features/letterboxd/letterboxd-csv';

const LB_FILMS_KEY = 'swl_lb_films';

export function getLbFilms(): LetterboxdFilm[] | null {
  try {
    const raw = localStorage.getItem(LB_FILMS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LetterboxdFilm[];
  } catch {
    return null;
  }
}

export function setLbFilms(films: LetterboxdFilm[]): void {
  localStorage.setItem(LB_FILMS_KEY, JSON.stringify(films));
}

export function clearLbFilms(): void {
  localStorage.removeItem(LB_FILMS_KEY);
}
