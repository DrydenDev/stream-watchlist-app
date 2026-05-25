import { describe, it, expect, beforeEach } from 'vitest';
import { getDismissed, dismissItem, clearDismissed, clearDismissedBySource, dismissedCount } from '../dismissed-store';

beforeEach(() => {
  localStorage.clear();
});

describe('getDismissed', () => {
  it('returns empty set when nothing stored', () => {
    expect(getDismissed().size).toBe(0);
  });

  it('returns set of previously dismissed ids', () => {
    dismissItem('a');
    dismissItem('b');
    const result = getDismissed();
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });
});

describe('dismissItem', () => {
  it('adds id to dismissed set', () => {
    dismissItem('item-1');
    expect(getDismissed().has('item-1')).toBe(true);
  });

  it('is idempotent — dismissing twice keeps one entry', () => {
    dismissItem('item-1');
    dismissItem('item-1');
    expect(dismissedCount()).toBe(1);
  });
});

describe('clearDismissed', () => {
  it('removes all dismissed ids', () => {
    dismissItem('x');
    dismissItem('y');
    clearDismissed();
    expect(getDismissed().size).toBe(0);
  });
});

describe('clearDismissedBySource', () => {
  it('removes only ids with the matching prefix', () => {
    dismissItem('yt:abc');
    dismissItem('yt:def');
    dismissItem('lb:xyz');
    clearDismissedBySource('yt');
    const result = getDismissed();
    expect(result.has('yt:abc')).toBe(false);
    expect(result.has('yt:def')).toBe(false);
    expect(result.has('lb:xyz')).toBe(true);
  });

  it('leaves the store empty when all ids match the prefix', () => {
    dismissItem('yt:abc');
    clearDismissedBySource('yt');
    expect(getDismissed().size).toBe(0);
  });

  it('is a no-op when no ids match the prefix', () => {
    dismissItem('lb:xyz');
    clearDismissedBySource('yt');
    expect(getDismissed().has('lb:xyz')).toBe(true);
  });
});

describe('dismissedCount', () => {
  it('returns 0 when nothing dismissed', () => {
    expect(dismissedCount()).toBe(0);
  });

  it('returns correct count after dismissals', () => {
    dismissItem('a');
    dismissItem('b');
    dismissItem('c');
    expect(dismissedCount()).toBe(3);
  });
});
