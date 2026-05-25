import { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem } from './types';
import { getConfig, saveConfig } from './lib/storage';
import { getCachedList, setCachedList, clearCache } from './lib/cache';
import { parseTokenFromHash, isTokenExpired, silentRefreshToken } from './features/youtube/youtube-auth';
import { fetchFromPlaylists, DEFAULT_PLAYLIST_IDS } from './features/youtube/youtube-api';
import { enrichWithTmdb } from './features/letterboxd/tmdb';
import { getLbFilms } from './lib/letterboxd-store';
import { getDismissed, dismissItem, clearDismissed, clearDismissedBySource } from './lib/dismissed-store';
import { STREAMING_SERVICES, YOUTUBE_TMDB_NAMES, itemMatchesService } from './lib/streaming-services';
import type { ServiceFilterId } from './lib/streaming-services';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WatchlistCard } from './components/WatchlistCard';

type AppState = 'onboarding' | 'loading' | 'ready' | 'error';
type ActiveFilter = 'all' | 'youtube' | 'letterboxd' | 'short' | ServiceFilterId;

function hasAnySources(config: ReturnType<typeof getConfig>): boolean {
  return config.youtube !== null || config.letterboxd !== null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = useCallback((id: string) => {
    dismissItem(id);
    setDismissed(new Set(getDismissed()));
  }, []);

  const handleRestoreAll = useCallback(() => {
    clearDismissed();
    setDismissed(new Set());
  }, []);

  const visibleItems = items
    .filter((item) => !dismissed.has(item.id))
    .filter((item) => {
      // Auto-hide Letterboxd movies that haven't been released yet.
      if (item.source === 'letterboxd' && item.releaseDate) {
        return new Date(item.releaseDate) <= new Date();
      }
      return true;
    });

  const hasYoutube = visibleItems.some(
    (i) => i.source === 'youtube' || YOUTUBE_TMDB_NAMES.some((n) => i.streamingProviders?.includes(n)),
  );
  const hasLetterboxd = visibleItems.some((i) => i.source === 'letterboxd');
  const hasShort = visibleItems.some((i) => i.runtimeMinutes !== null && i.runtimeMinutes < 30);
  const availableServiceIds = new Set(
    visibleItems.flatMap((item) =>
      item.streamingProviders
        ? STREAMING_SERVICES.filter((svc) => itemMatchesService(item.streamingProviders!, svc)).map((s) => s.id)
        : [],
    ),
  );

  const filteredItems = visibleItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'youtube') {
      return (
        item.source === 'youtube' ||
        YOUTUBE_TMDB_NAMES.some((n) => item.streamingProviders?.includes(n))
      );
    }
    if (activeFilter === 'letterboxd') return item.source === 'letterboxd';
    if (activeFilter === 'short') return item.runtimeMinutes !== null && item.runtimeMinutes < 30;
    const svc = STREAMING_SERVICES.find((s) => s.id === activeFilter);
    if (svc) return item.streamingProviders ? itemMatchesService(item.streamingProviders, svc) : false;
    return true;
  });

  const fetchAll = useCallback(async () => {
    setAppState('loading');
    setError(null);

    const config = getConfig();
    const fetchers: Promise<WatchlistItem[]>[] = [];

    let youtubeToken = config.youtube;

    if (youtubeToken && isTokenExpired(youtubeToken) && config.youtubeClientId) {
      console.log('[youtube] token expired — attempting silent refresh');
      const refreshed = await silentRefreshToken(config.youtubeClientId);
      if (refreshed) {
        saveConfig({ youtube: refreshed });
        youtubeToken = refreshed;
        console.log('[youtube] silent refresh succeeded');
      } else {
        console.warn('[youtube] silent refresh failed — skipping YouTube fetch');
        youtubeToken = null;
      }
    }

    if (youtubeToken && !isTokenExpired(youtubeToken)) {
      clearDismissedBySource('yt');
      setDismissed(new Set(getDismissed()));
      const playlistIds = config.youtubePlaylistIds ?? DEFAULT_PLAYLIST_IDS;
      fetchers.push(fetchFromPlaylists(youtubeToken.accessToken, playlistIds));
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
          {dismissed.size > 0 && (
            <button
              onClick={handleRestoreAll}
              className="text-zinc-500 hover:text-white text-sm transition-colors"
            >
              Restore {dismissed.size}
            </button>
          )}
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
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'All' },
                  ...(hasYoutube ? [{ id: 'youtube', label: 'YouTube' }] : []),
                  ...(hasLetterboxd ? [{ id: 'letterboxd', label: 'Letterboxd' }] : []),
                  ...STREAMING_SERVICES.filter((s) => availableServiceIds.has(s.id)).map((s) => ({ id: s.id, label: s.label })),
                  ...(hasShort ? [{ id: 'short', label: '< 30 min' }] : []),
                ] as { id: ActiveFilter; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === id
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <WatchlistCard key={item.id} item={item} onDismiss={handleDismiss} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
