import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, saveConfig, encodeSyncPayload, parseSyncPayload } from '../storage';

const FILMS = [
  { title: 'Parasite', year: '2019', url: 'https://letterboxd.com/film/parasite-2019/', tmdbId: 496243 },
  { title: 'パラサイト', year: '2019', url: 'https://letterboxd.com/film/parasite-2019/', tmdbId: 496243 },
];

beforeEach(() => {
  localStorage.clear();
});

describe('encodeSyncPayload / parseSyncPayload round-trip', () => {
  it('encodes config and films together and decodes them back', () => {
    saveConfig({ tmdbApiKey: 'my-token', youtubePlaylistIds: ['LL'] });
    const encoded = encodeSyncPayload(FILMS);
    const result = parseSyncPayload(`#config=${encoded}`);
    expect(result?.config.tmdbApiKey).toBe('my-token');
    expect(result?.config.youtubePlaylistIds).toEqual(['LL']);
    expect(result?.films).toEqual(FILMS);
  });

  it('handles non-ASCII film titles (UTF-8 safety)', () => {
    const encoded = encodeSyncPayload(FILMS);
    const result = parseSyncPayload(`#config=${encoded}`);
    expect(result?.films?.[1].title).toBe('パラサイト');
  });

  it('works without a leading # in the hash', () => {
    const encoded = encodeSyncPayload(null);
    expect(parseSyncPayload(`config=${encoded}`)).not.toBeNull();
  });

  it('encodes null films and decodes them back as null', () => {
    const encoded = encodeSyncPayload(null);
    const result = parseSyncPayload(`#config=${encoded}`);
    expect(result?.films).toBeNull();
  });
});

describe('parseSyncPayload — backward compatibility', () => {
  it('handles old format (plain AppConfig, no films key) without crashing', () => {
    // Simulate an old-format link generated before the films field was added.
    const oldPayload = btoa(unescape(encodeURIComponent(JSON.stringify({ tmdbApiKey: 'old' }))));
    const result = parseSyncPayload(`#config=${oldPayload}`);
    expect(result?.config.tmdbApiKey).toBe('old');
    expect(result?.films).toBeNull();
  });
});

describe('parseSyncPayload — error cases', () => {
  it('returns null when no config param is present', () => {
    expect(parseSyncPayload('#access_token=abc&expires_in=3600')).toBeNull();
  });

  it('returns null for a malformed payload', () => {
    expect(parseSyncPayload('#config=!!!not-valid!!!')).toBeNull();
  });

  it('returns null for an empty hash', () => {
    expect(parseSyncPayload('')).toBeNull();
  });
});

describe('getConfig', () => {
  it('returns EMPTY_CONFIG when nothing is stored', () => {
    const config = getConfig();
    expect(config.youtube).toBeNull();
    expect(config.letterboxd).toBeNull();
    expect(config.tmdbApiKey).toBeNull();
  });

  it('merges stored values with defaults so new fields are never undefined', () => {
    localStorage.setItem('swl_config', JSON.stringify({ tmdbApiKey: 'tok' }));
    const config = getConfig();
    expect(config.tmdbApiKey).toBe('tok');
    expect(config.youtube).toBeNull();
  });
});
