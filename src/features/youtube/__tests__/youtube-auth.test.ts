import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseTokenFromHash, isTokenExpired } from '../youtube-auth';

beforeEach(() => {
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
