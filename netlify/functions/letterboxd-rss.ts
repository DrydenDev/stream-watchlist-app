import type { Config } from '@netlify/functions';

export default async (request: Request): Promise<Response> => {
  const username = new URL(request.url).searchParams.get('username');

  if (!username || !/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
    return new Response('Invalid username', { status: 400 });
  }

  const url = `https://letterboxd.com/${username}/watchlist/rss/`;
  console.log(`[letterboxd-rss] fetching ${url}`);

  const rssHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; StreamWatchlist/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  };

  const upstream = await fetch(url, { headers: rssHeaders, redirect: 'follow' });

  console.log(`[letterboxd-rss] response status: ${upstream.status}`);
  console.log(`[letterboxd-rss] final URL (after redirects): ${upstream.url}`);
  console.log(`[letterboxd-rss] content-type: ${upstream.headers.get('content-type')}`);

  if (upstream.status === 403) {
    console.log('[letterboxd-rss] 403 — watchlist is likely private');
    return new Response('watchlist-private', { status: 403 });
  }

  if (!upstream.ok) {
    console.log(`[letterboxd-rss] unexpected error: ${upstream.status}`);
    return new Response(`Letterboxd returned ${upstream.status}`, { status: upstream.status });
  }

  const body = await upstream.text();

  // Log item titles to verify we got the right feed
  const titleMatches = [...body.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g)];
  const itemTitles = titleMatches.slice(1, 6).map((m) => (m[1] ?? m[2] ?? '').trim()); // skip channel title
  console.log(`[letterboxd-rss] item count (approx): ${(body.match(/<item>/g) ?? []).length}`);
  console.log(`[letterboxd-rss] first 5 titles: ${JSON.stringify(itemTitles)}`);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml',
      'Cache-Control': 'private, no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config: Config = { path: '/api/letterboxd-rss' };
