const KEY = 'swl_dismissed';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function save(ids: Set<string>): void {
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function getDismissed(): Set<string> {
  return load();
}

export function dismissItem(id: string): void {
  const ids = load();
  ids.add(id);
  save(ids);
}

export function clearDismissed(): void {
  localStorage.removeItem(KEY);
}

export function clearDismissedBySource(prefix: 'yt' | 'lb'): void {
  const ids = load();
  for (const id of ids) {
    if (id.startsWith(`${prefix}:`)) ids.delete(id);
  }
  save(ids);
}

export function dismissedCount(): number {
  return load().size;
}
