import { describe, it, expect } from 'vitest';
import { pickRandom } from '../random';

describe('pickRandom', () => {
  it('returns exactly count items when pool is larger', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(pickRandom(items, 3)).toHaveLength(3);
  });

  it('returns all items when pool is smaller than count', () => {
    const items = [1, 2, 3];
    expect(pickRandom(items, 6)).toHaveLength(3);
  });

  it('returns a copy, not the original array', () => {
    const items = [1, 2, 3];
    expect(pickRandom(items, 6)).not.toBe(items);
  });

  it('returns an empty array for an empty input', () => {
    expect(pickRandom([], 6)).toHaveLength(0);
  });

  it('only includes items from the original pool', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = pickRandom(items, 3);
    result.forEach((item) => expect(items).toContain(item));
  });
});
