import type { Config } from '@netlify/functions';

export default async (request: Request): Promise<Response> => {
  const username = new URL(request.url).searchParams.get('username');

  if (!username || !/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
    return new Response('Invalid username', { status: 400 });
  }

  const rssHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; StreamWatchlist/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  };

  const upstream = await fetch(`https://letterboxd.com/${username}/watchlist/rss/`, { headers: rssHeaders });

  if (upstream.status === 403) {
    return new Response('watchlist-private', { status: 403 });
  }

  if (!upstream.ok) {
    return new Response(`Letterboxd returned ${upstream.status}`, { status: upstream.status });
  }

  return new Response(await upstream.text(), {
    headers: {
      'Content-Type': 'application/rss+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config: Config = { path: '/api/letterboxd-rss' };
