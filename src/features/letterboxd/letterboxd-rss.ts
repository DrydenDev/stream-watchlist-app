export interface RssFilm {
  filmTitle: string;
  filmYear: string | null;
  letterboxdUrl: string;
  tmdbId: number | null;
}

function childText(el: Element, localName: string): string | null {
  for (const child of Array.from(el.children)) {
    if (child.localName === localName) return child.textContent?.trim() ?? null;
  }
  return null;
}

export function parseRssFeed(xml: string): RssFilm[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.querySelectorAll('item')).map((item) => {
    const link = item.querySelector('link')?.textContent?.trim() ?? '';

    // Letterboxd embeds explicit namespace elements — more reliable than title parsing
    const nsTitle = childText(item, 'filmTitle');
    const nsYear = childText(item, 'filmYear');
    const nsTmdbId = childText(item, 'movieId'); // tmdb:movieId

    let filmTitle: string;
    let filmYear: string | null;

    if (nsTitle) {
      filmTitle = nsTitle;
      filmYear = nsYear;
    } else {
      const rawTitle = item.querySelector('title')?.textContent?.trim() ?? '';
      const match = rawTitle.match(/^(.+?),\s*(\d{4})$/);
      filmTitle = match ? match[1].trim() : rawTitle;
      filmYear = match ? match[2] : null;
    }

    return {
      filmTitle,
      filmYear,
      letterboxdUrl: link,
      tmdbId: nsTmdbId ? parseInt(nsTmdbId, 10) : null,
    };
  });
}

export async function fetchLetterboxdWatchlist(username: string): Promise<RssFilm[]> {
  console.log(`[letterboxd] fetching watchlist for ${username}`);
  const res = await fetch(`/api/letterboxd-rss?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
  console.log(`[letterboxd] proxy response: ${res.status}`);

  if (res.status === 403) {
    throw new Error(
      'Your Letterboxd watchlist is private. In Letterboxd → Settings → Privacy, set Watchlist to "Everyone".',
    );
  }
  if (!res.ok) throw new Error(`Letterboxd RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const raw = parseRssFeed(xml);

  // Deduplicate: prefer tmdbId match, fall back to title+year
  const seen = new Set<string>();
  const films = raw.filter((f) => {
    const key = f.tmdbId != null ? `tmdb:${f.tmdbId}` : `title:${f.filmTitle}:${f.filmYear}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[letterboxd] parsed ${films.length} films (${raw.length - films.length} dupes removed):`, films.slice(0, 5).map((f) => `${f.filmTitle} (${f.filmYear}) tmdbId=${f.tmdbId}`));
  return films;
}
