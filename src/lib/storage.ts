import type { AppConfig } from '../types';

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
