import { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem } from './types';
import { getConfig, saveConfig } from './lib/storage';
import { getCachedList, setCachedList, clearCache } from './lib/cache';
import { parseTokenFromHash, isTokenExpired } from './features/youtube/youtube-auth';
import { fetchFromPlaylists, DEFAULT_PLAYLIST_IDS } from './features/youtube/youtube-api';
import { enrichWithTmdb } from './features/letterboxd/tmdb';
import { getLbFilms } from './lib/letterboxd-store';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WatchlistCard } from './components/WatchlistCard';

type AppState = 'onboarding' | 'loading' | 'ready' | 'error';

function hasAnySources(config: ReturnType<typeof getConfig>): boolean {
  return config.youtube !== null || config.letterboxd !== null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      const lbFilms = getLbFilms();
      if (lbFilms && lbFilms.length > 0) {
        console.log(`[letterboxd] enriching ${lbFilms.length} imported films with TMDB metadata`);
        fetchers.push(enrichWithTmdb(lbFilms, config.tmdbApiKey!));
      }
    }

    try {
      const results = await Promise.allSettled(fetchers);
      const fetched: WatchlistItem[] = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      );
      setCachedList(fetched);
      setItems(fetched);
      setAppState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch your lists');
      setAppState('error');
    }
  }, []);

  useEffect(() => {
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
      console.log(`[app] serving ${cached.length} items from cache — click Refresh to re-fetch`);
      setItems(cached);
      setAppState('ready');
      return;
    }

    fetchAll();
  }, [fetchAll]);

  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={() => fetchAll()} />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur flex items-center justify-between px-6 py-4">
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

      <main className="flex-1 px-6 py-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item) => (
              <WatchlistCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
