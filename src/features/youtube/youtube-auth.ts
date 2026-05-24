import type { YouTubeToken } from '../../types';

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export function initiateYouTubeAuth(clientId: string): void {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPE,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function parseTokenFromHash(hash: string): YouTubeToken | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (!accessToken || !expiresIn) return null;
  return {
    accessToken,
    expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000,
  };
}

export function isTokenExpired(token: YouTubeToken): boolean {
  return Date.now() >= token.expiresAt - 60_000;
}
