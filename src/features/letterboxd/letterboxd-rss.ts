export interface RssFilm {
  filmTitle: string;
  filmYear: string | null;
  letterboxdUrl: string;
}

export function parseRssFeed(xml: string): RssFilm[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.querySelectorAll('item')).map((item) => {
    const rawTitle = item.querySelector('title')?.textContent?.trim() ?? '';
    const link = item.querySelector('link')?.textContent?.trim() ?? '';
    // Letterboxd RSS titles: "Film Title, YYYY"
    const match = rawTitle.match(/^(.+?),\s*(\d{4})$/);
    return {
      filmTitle: match ? match[1].trim() : rawTitle,
      filmYear: match ? match[2] : null,
      letterboxdUrl: link,
    };
  });
}

export async function fetchLetterboxdWatchlist(username: string): Promise<RssFilm[]> {
  const res = await fetch(`/api/letterboxd-rss?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Letterboxd RSS fetch failed: ${res.status}`);
  return parseRssFeed(await res.text());
}
