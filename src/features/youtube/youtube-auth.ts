import type { YouTubeToken } from '../../types';

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

function buildOAuthUrl(clientId: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPE,
    ...extra,
  });
  return `${OAUTH_BASE}?${params}`;
}

export function initiateYouTubeAuth(clientId: string): void {
  window.location.href = buildOAuthUrl(clientId);
}

export function silentRefreshToken(clientId: string): Promise<YouTubeToken | null> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'display:none;position:fixed;';
    iframe.src = buildOAuthUrl(clientId, { prompt: 'none' });

    const cleanup = (token: YouTubeToken | null) => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      resolve(token);
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'yt-token-silent') return;
      cleanup((e.data.token as YouTubeToken) ?? null);
    };

    // Give up after 10 s — covers blocked 3rd-party cookies and network failures.
    const timer = setTimeout(() => {
      console.warn('[youtube] silent refresh timed out');
      cleanup(null);
    }, 10_000);

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
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
