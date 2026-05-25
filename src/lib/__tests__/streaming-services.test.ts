import { describe, it, expect } from 'vitest';
import { STREAMING_SERVICES, itemMatchesService } from '../streaming-services';

describe('itemMatchesService', () => {
  const netflix = STREAMING_SERVICES.find((s) => s.id === 'netflix')!;
  const hbo = STREAMING_SERVICES.find((s) => s.id === 'hbo')!;

  it('returns true when a provider name matches', () => {
    expect(itemMatchesService(['Netflix', 'Hulu'], netflix)).toBe(true);
  });

  it('returns false when no provider name matches', () => {
    expect(itemMatchesService(['Hulu', 'Disney Plus'], netflix)).toBe(false);
  });

  it('returns false for an empty providers list', () => {
    expect(itemMatchesService([], netflix)).toBe(false);
  });

  it('matches legacy provider names (e.g. HBO Max → Max rebrand)', () => {
    expect(itemMatchesService(['HBO Max'], hbo)).toBe(true);
    expect(itemMatchesService(['Max'], hbo)).toBe(true);
  });
});
