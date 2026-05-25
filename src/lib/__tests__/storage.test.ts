import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, saveConfig, encodeConfigForSync, parseConfigFromHash } from '../storage';

beforeEach(() => {
  localStorage.clear();
});

describe('encodeConfigForSync / parseConfigFromHash round-trip', () => {
  it('encodes the current config and decodes it back from a hash string', () => {
    saveConfig({ tmdbApiKey: 'my-token', youtubePlaylistIds: ['LL'] });
    const encoded = encodeConfigForSync();
    const decoded = parseConfigFromHash(`#config=${encoded}`);
    expect(decoded?.tmdbApiKey).toBe('my-token');
    expect(decoded?.youtubePlaylistIds).toEqual(['LL']);
  });

  it('works without a leading # in the hash', () => {
    const encoded = encodeConfigForSync();
    const decoded = parseConfigFromHash(`config=${encoded}`);
    expect(decoded).not.toBeNull();
  });
});

describe('parseConfigFromHash', () => {
  it('returns null when no config param is present', () => {
    expect(parseConfigFromHash('#access_token=abc&expires_in=3600')).toBeNull();
  });

  it('returns null for a malformed (non-base64) payload', () => {
    expect(parseConfigFromHash('#config=!!!not-valid-base64!!!')).toBeNull();
  });

  it('returns null for an empty hash', () => {
    expect(parseConfigFromHash('')).toBeNull();
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
