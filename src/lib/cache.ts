import type { ListCache, WatchlistItem } from '../types';

const CACHE_KEY = 'swl_cache';
const TTL_MS = 36 * 60 * 60 * 1000; // 36 hours

export function getCachedList(): WatchlistItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: ListCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt > TTL_MS) return null;
    return cache.items;
  } catch {
    return null;
  }
}

export function setCachedList(items: WatchlistItem[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ items, fetchedAt: Date.now() } satisfies ListCache));
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
