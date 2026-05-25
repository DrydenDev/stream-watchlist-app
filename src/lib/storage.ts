import type { AppConfig } from '../types';
import type { LetterboxdFilm } from '../features/letterboxd/letterboxd-csv';

const CONFIG_KEY = 'swl_config';

const EMPTY_CONFIG: AppConfig = { youtube: null, youtubeClientId: null, youtubePlaylistIds: null, letterboxd: null, tmdbApiKey: null };

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...EMPTY_CONFIG, ...JSON.parse(raw) } : EMPTY_CONFIG;
  } catch {
    return EMPTY_CONFIG;
  }
}

export function saveConfig(patch: Partial<AppConfig>): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...getConfig(), ...patch }));
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

export interface SyncPayload {
  config: Partial<AppConfig>;
  films: LetterboxdFilm[] | null;
}

// btoa/atob only handle Latin-1; wrap with encode/decodeURIComponent for UTF-8 safety
// (film titles may contain non-ASCII characters).
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

// Full payload — config + films. Suitable for a copied link; too large for QR.
export function encodeSyncPayload(films: LetterboxdFilm[] | null): string {
  const payload: SyncPayload = { config: getConfig(), films };
  return toBase64(JSON.stringify(payload));
}

// Config only — no films. Small enough for a QR code.
export function encodeConfigForQr(): string {
  const payload: SyncPayload = { config: getConfig(), films: null };
  return toBase64(JSON.stringify(payload));
}

export function parseSyncPayload(hash: string): SyncPayload | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const raw = params.get('config');
  if (!raw) return null;
  try {
    const decoded = JSON.parse(fromBase64(raw));
    // New format: { config, films }
    if (decoded && typeof decoded === 'object' && 'config' in decoded) {
      return { config: decoded.config as Partial<AppConfig>, films: decoded.films ?? null };
    }
    // Old format: plain AppConfig — still import it, no films
    return { config: decoded as Partial<AppConfig>, films: null };
  } catch {
    return null;
  }
}
