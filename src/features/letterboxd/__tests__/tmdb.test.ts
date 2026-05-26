import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enrichWithTmdb } from '../tmdb';
import type { LetterboxdFilm } from '../letterboxd-csv';

const FILM: LetterboxdFilm = {
  title: 'Test Film',
  year: '2022',
  url: 'https://letterboxd.com/film/test-film/',
  tmdbId: 42,
};

const PAST_DATE = '2022-03-15';
const FUTURE_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function mockDetails(overrides: object = {}) {
  return {
    title: 'Test Film',
    overview: 'A synopsis.',
    poster_path: '/poster.jpg',
    runtime: 95,
    release_date: PAST_DATE,
    'watch/providers': {
      results: {
        US: { flatrate: [{ provider_name: 'Netflix' }, { provider_name: 'Hulu' }] },
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('enrichWithTmdb — streaming providers', () => {
  it('extracts US flatrate provider names from watch/providers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails()), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.streamingProviders).toEqual(['Netflix', 'Hulu']);
  });

  it('returns empty array when US has no flatrate providers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails({ 'watch/providers': { results: { US: {} } } })), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.streamingProviders).toEqual([]);
  });

  it('returns null when US is not in watch/providers results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails({ 'watch/providers': { results: {} } })), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.streamingProviders).toBeNull();
  });

  it('returns null streamingProviders when there is no TMDB match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    const filmWithoutId: LetterboxdFilm = { ...FILM, tmdbId: null };
    const [item] = await enrichWithTmdb([filmWithoutId], 'token');
    expect(item.streamingProviders).toBeNull();
  });
});

describe('enrichWithTmdb — free providers', () => {
  it('extracts US free provider names from the free key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(mockDetails({ 'watch/providers': { results: { US: { free: [{ provider_name: 'Tubi TV' }] } } } })),
        { status: 200 },
      ),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.freeProviders).toEqual(['Tubi TV']);
  });

  it('merges free and ads keys into freeProviders', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(mockDetails({
          'watch/providers': {
            results: { US: { free: [{ provider_name: 'Tubi TV' }], ads: [{ provider_name: 'Pluto TV' }] } },
          },
        })),
        { status: 200 },
      ),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.freeProviders).toEqual(['Tubi TV', 'Pluto TV']);
  });

  it('returns empty freeProviders when US has no free or ads providers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails({ 'watch/providers': { results: { US: {} } } })), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.freeProviders).toEqual([]);
  });

  it('returns null freeProviders when there is no TMDB match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    const filmWithoutId: LetterboxdFilm = { ...FILM, tmdbId: null };
    const [item] = await enrichWithTmdb([filmWithoutId], 'token');
    expect(item.freeProviders).toBeNull();
  });
});

describe('enrichWithTmdb — rent providers', () => {
  it('merges rent and buy keys into rentProviders', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(mockDetails({
          'watch/providers': {
            results: { US: { rent: [{ provider_name: 'Apple TV' }], buy: [{ provider_name: 'Amazon Video' }] } },
          },
        })),
        { status: 200 },
      ),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.rentProviders).toEqual(['Apple TV', 'Amazon Video']);
  });

  it('returns null rentProviders when there is no TMDB match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    const filmWithoutId: LetterboxdFilm = { ...FILM, tmdbId: null };
    const [item] = await enrichWithTmdb([filmWithoutId], 'token');
    expect(item.rentProviders).toBeNull();
  });
});

describe('enrichWithTmdb — release date', () => {
  it('stores release_date from TMDB details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails()), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.releaseDate).toBe(PAST_DATE);
  });

  it('stores a future release_date without filtering (filtering is App-level)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockDetails({ release_date: FUTURE_DATE })), { status: 200 }),
    );
    const [item] = await enrichWithTmdb([FILM], 'token');
    expect(item.releaseDate).toBe(FUTURE_DATE);
  });

  it('returns null releaseDate when there is no TMDB match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    const filmWithoutId: LetterboxdFilm = { ...FILM, tmdbId: null };
    const [item] = await enrichWithTmdb([filmWithoutId], 'token');
    expect(item.releaseDate).toBeNull();
  });
});
