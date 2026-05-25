import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTokenFromHash, isTokenExpired, silentRefreshToken } from '../youtube-auth';

beforeEach(() => {
  vi.useRealTimers();
  // Prevent iframes from actually appending to jsdom body
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('parseTokenFromHash', () => {
  it('parses a valid token hash', () => {
    const hash = '#access_token=abc123&token_type=Bearer&expires_in=3600';
    const result = parseTokenFromHash(hash);
    expect(result?.accessToken).toBe('abc123');
    expect(result?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('returns null for an empty hash', () => {
    expect(parseTokenFromHash('')).toBeNull();
  });

  it('returns null when access_token is missing', () => {
    expect(parseTokenFromHash('#expires_in=3600')).toBeNull();
  });

  it('works with or without the leading #', () => {
    const withHash = '#access_token=tok&expires_in=3600';
    const withoutHash = 'access_token=tok&expires_in=3600';
    expect(parseTokenFromHash(withHash)?.accessToken).toBe('tok');
    expect(parseTokenFromHash(withoutHash)?.accessToken).toBe('tok');
  });
});

describe('silentRefreshToken', () => {
  it('resolves with the token when a valid yt-token-silent message is received', async () => {
    const promise = silentRefreshToken('client-id');
    const token = { accessToken: 'fresh', expiresAt: Date.now() + 3600_000 };
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'yt-token-silent', token },
        origin: window.location.origin,
      }),
    );
    expect(await promise).toEqual(token);
  });

  it('resolves with null when the message carries a null token (auth failed in iframe)', async () => {
    const promise = silentRefreshToken('client-id');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'yt-token-silent', token: null },
        origin: window.location.origin,
      }),
    );
    expect(await promise).toBeNull();
  });

  it('ignores messages from other origins and resolves null on timeout', async () => {
    vi.useFakeTimers();
    const promise = silentRefreshToken('client-id');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'yt-token-silent', token: { accessToken: 'evil', expiresAt: 9999 } },
        origin: 'https://evil.com',
      }),
    );
    vi.advanceTimersByTime(10_001);
    expect(await promise).toBeNull();
  });

  it('resolves null after the 10-second timeout', async () => {
    vi.useFakeTimers();
    const promise = silentRefreshToken('client-id');
    vi.advanceTimersByTime(10_001);
    expect(await promise).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('returns false for a fresh token', () => {
    const token = { accessToken: 'x', expiresAt: Date.now() + 3600_000 };
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for an expired token', () => {
    const token = { accessToken: 'x', expiresAt: Date.now() - 1000 };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true within the 1-minute buffer', () => {
    const token = { accessToken: 'x', expiresAt: Date.now() + 30_000 };
    expect(isTokenExpired(token)).toBe(true);
  });
});
