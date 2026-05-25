export interface StreamingService {
  id: ServiceFilterId;
  label: string;
  tmdbNames: readonly string[];
}

// Provider names are matched case-sensitively against TMDB's flatrate provider list.
// Include both pre- and post-rebrand names to handle stale TMDB data.
export const STREAMING_SERVICES: readonly StreamingService[] = [
  { id: 'netflix', label: 'Netflix', tmdbNames: ['Netflix'] },
  { id: 'hbo', label: 'Max', tmdbNames: ['Max', 'HBO Max'] },
  { id: 'disney', label: 'Disney+', tmdbNames: ['Disney Plus'] },
  { id: 'hulu', label: 'Hulu', tmdbNames: ['Hulu'] },
  { id: 'prime', label: 'Prime Video', tmdbNames: ['Amazon Prime Video', 'Amazon Video', 'Prime Video'] },
  { id: 'apple', label: 'Apple TV+', tmdbNames: ['Apple TV Plus', 'Apple TV+'] },
  { id: 'crunchyroll', label: 'Crunchyroll', tmdbNames: ['Crunchyroll'] },
  // 'youtube' is handled separately — it covers both YouTube-source items and
  // Letterboxd movies on YouTube Premium.
];

export type ServiceFilterId = 'netflix' | 'hbo' | 'disney' | 'hulu' | 'prime' | 'apple' | 'crunchyroll';

export const YOUTUBE_TMDB_NAMES = ['YouTube', 'YouTube Premium', 'YouTube Movies'] as const;

export function itemMatchesService(providers: string[], service: StreamingService): boolean {
  return service.tmdbNames.some((n) => providers.includes(n));
}
