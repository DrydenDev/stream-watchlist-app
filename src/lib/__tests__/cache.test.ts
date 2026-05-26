import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedList, setCachedList, clearCache } from '../cache';
import type { WatchlistItem } from '../../types';

const ITEM: WatchlistItem = {
  id: 'yt:abc123',
  source: 'youtube',
  title: 'Test Video',
  poster: null,
  synopsis: null,
  runtimeMinutes: 10,
  releaseDate: null,
  streamingProviders: null,
  freeProviders: null,
  rentProviders: null,
  url: 'https://youtube.com/watch?v=abc123',
  savedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('getCachedList', () => {
  it('returns null when nothing is cached', () => {
    expect(getCachedList()).toBeNull();
  });

  it('returns items when cache is fresh', () => {
    setCachedList([ITEM]);
    expect(getCachedList()).toEqual([ITEM]);
  });

  it('returns null when cache is expired', () => {
    setCachedList([ITEM]);
    // Advance time past the 36h TTL
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 37 * 60 * 60 * 1000);
    expect(getCachedList()).toBeNull();
  });
});

describe('clearCache', () => {
  it('removes cached items', () => {
    setCachedList([ITEM]);
    clearCache();
    expect(getCachedList()).toBeNull();
  });
});
