import { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem } from './types';
import { getConfig, saveConfig } from './lib/storage';
import { getCachedList, setCachedList, clearCache } from './lib/cache';
import { pickRandom } from './lib/random';
import { parseTokenFromHash, isTokenExpired } from './features/youtube/youtube-auth';
import { fetchFromPlaylists, DEFAULT_PLAYLIST_IDS } from './features/youtube/youtube-api';
import { fetchLetterboxdWatchlist } from './features/letterboxd/letterboxd-rss';
import { enrichWithTmdb } from './features/letterboxd/tmdb';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WatchlistCard } from './components/WatchlistCard';
import { PlaceholderCard } from './components/PlaceholderCard';

const CARD_COUNT = 6;

type AppState = 'onboarding' | 'loading' | 'ready' | 'error';

function hasAnySources(config: ReturnType<typeof getConfig>): boolean {
  return config.youtube !== null || config.letterboxd !== null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [allItems, setAllItems] = useState<WatchlistItem[]>([]);
  const [displayed, setDisplayed] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reshuffle = useCallback((items: WatchlistItem[]) => {
    setDisplayed(pickRandom(items, CARD_COUNT));
  }, []);

  const fetchAll = useCallback(async () => {
    setAppState('loading');
    setError(null);

    const config = getConfig();
    const fetchers: Promise<WatchlistItem[]>[] = [];

    if (config.youtube && !isTokenExpired(config.youtube)) {
      const playlistIds = config.youtubePlaylistIds ?? DEFAULT_PLAYLIST_IDS;
      fetchers.push(fetchFromPlaylists(config.youtube.accessToken, playlistIds));
    }

    if (config.letterboxd && config.tmdbApiKey) {
      fetchers.push(
        fetchLetterboxdWatchlist(config.letterboxd.username).then((films) =>
          enrichWithTmdb(films, config.tmdbApiKey!),
        ),
      );
    }

    try {
      const results = await Promise.allSettled(fetchers);
      const items: WatchlistItem[] = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      );
      setCachedList(items);
      setAllItems(items);
      reshuffle(items);
      setAppState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch your lists');
      setAppState('error');
    }
  }, [reshuffle]);

  useEffect(() => {
    // Handle YouTube OAuth callback (token in URL hash)
    const token = parseTokenFromHash(window.location.hash);
    if (token) {
      saveConfig({ youtube: token });
      history.replaceState(null, '', window.location.pathname);
    }

    const config = getConfig();

    if (!hasAnySources(config)) {
      setAppState('onboarding');
      return;
    }

    const cached = getCachedList();
    if (cached && cached.length > 0) {
      setAllItems(cached);
      reshuffle(cached);
      setAppState('ready');
      return;
    }

    fetchAll();
  }, [fetchAll, reshuffle]);

  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={() => fetchAll()} />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-white font-bold text-xl tracking-tight">Stream Watchlist</h1>
        <div className="flex gap-3">
          <button
            onClick={() => { clearCache(); fetchAll(); }}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setAppState('onboarding')}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Settings
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pb-6">
        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">Fetching your lists…</p>
          </div>
        )}

        {appState === 'error' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-zinc-400">{error}</p>
            <button
              onClick={fetchAll}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {appState === 'ready' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayed.map((item) => (
              <WatchlistCard key={item.id} item={item} />
            ))}
            {Array.from({ length: Math.max(0, CARD_COUNT - displayed.length) }).map((_, i) => (
              <PlaceholderCard key={`placeholder-${i}`} />
            ))}
          </div>
        )}
      </main>

      {appState === 'ready' && (
        <footer className="px-6 pb-8 flex justify-center">
          <button
            onClick={() => reshuffle(allItems)}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <span>🔀</span> Reshuffle
          </button>
        </footer>
      )}
    </div>
  );
}
