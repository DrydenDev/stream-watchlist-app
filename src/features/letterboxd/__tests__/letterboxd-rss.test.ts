import { describe, it, expect } from 'vitest';
import { parseRssFeed } from '../letterboxd-rss';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test's Watchlist</title>
    <item>
      <title>Dune: Part Two, 2024</title>
      <link>https://letterboxd.com/film/dune-part-two/</link>
    </item>
    <item>
      <title>The Godfather, 1972</title>
      <link>https://letterboxd.com/film/the-godfather/</link>
    </item>
    <item>
      <title>Mulholland Drive</title>
      <link>https://letterboxd.com/film/mulholland-drive/</link>
    </item>
  </channel>
</rss>`;

describe('parseRssFeed', () => {
  it('parses film titles and years', () => {
    const films = parseRssFeed(SAMPLE_RSS);
    expect(films).toHaveLength(3);
    expect(films[0]).toMatchObject({ filmTitle: 'Dune: Part Two', filmYear: '2024' });
    expect(films[1]).toMatchObject({ filmTitle: 'The Godfather', filmYear: '1972' });
  });

  it('handles films without a year', () => {
    const films = parseRssFeed(SAMPLE_RSS);
    expect(films[2]).toMatchObject({ filmTitle: 'Mulholland Drive', filmYear: null });
  });

  it('captures the letterboxd URL', () => {
    const films = parseRssFeed(SAMPLE_RSS);
    expect(films[0].letterboxdUrl).toBe('https://letterboxd.com/film/dune-part-two/');
  });

  it('returns empty array for empty feed', () => {
    const empty = `<?xml version="1.0"?><rss><channel></channel></rss>`;
    expect(parseRssFeed(empty)).toHaveLength(0);
  });
});
