import type { WatchlistItem } from '../../types';

const BASE = 'https://www.googleapis.com/youtube/v3';

function parseDurationMinutes(iso8601: string): number | null {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  return h * 60 + m + Math.round(s / 60);
}

async function authedGet(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${path}`);
  return res.json();
}

async function fetchAllPlaylistItems(token: string) {
  const items: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const data = await authedGet('/playlistItems', {
      playlistId: 'WL',
      maxResults: '50',
      part: 'snippet',
      ...(pageToken ? { pageToken } : {}),
    }, token);
    items.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items as Array<{ snippet: { title: string; description: string; thumbnails: Record<string, { url: string }>; resourceId: { videoId: string }; publishedAt: string } }>;
}

async function fetchDurations(videoIds: string[], token: string): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const data = await authedGet('/videos', {
      id: videoIds.slice(i, i + 50).join(','),
      part: 'contentDetails',
    }, token);
    for (const video of data.items as Array<{ id: string; contentDetails: { duration: string } }>) {
      map.set(video.id, parseDurationMinutes(video.contentDetails.duration));
    }
  }
  return map;
}

export async function fetchWatchLater(accessToken: string): Promise<WatchlistItem[]> {
  const playlist = await fetchAllPlaylistItems(accessToken);
  const videoIds = playlist.map((i) => i.snippet.resourceId.videoId);
  const durations = await fetchDurations(videoIds, accessToken);

  return playlist.map((item) => {
    const videoId = item.snippet.resourceId.videoId;
    return {
      id: `yt:${videoId}`,
      source: 'youtube' as const,
      title: item.snippet.title,
      poster: item.snippet.thumbnails['high']?.url ?? item.snippet.thumbnails['medium']?.url ?? null,
      synopsis: item.snippet.description || null,
      runtimeMinutes: durations.get(videoId) ?? null,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      savedAt: item.snippet.publishedAt,
    };
  });
}
