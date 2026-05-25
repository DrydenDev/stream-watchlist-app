export interface LetterboxdFilm {
  title: string;
  year: string | null;
  url: string;
  tmdbId: number | null;
}

// Parses a single CSV line into fields, respecting double-quoted values that may
// contain commas. Letterboxd's export does not escape quotes within quoted fields,
// so we only need to handle the basic RFC 4180 quoting case.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote inside a quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

// Builds an index map from header names to column positions so we don't rely on
// column order staying stable across Letterboxd export versions.
function buildColumnIndex(headers: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    index[headers[i].trim()] = i;
  }
  return index;
}

export function parseLbCsv(csv: string): LetterboxdFilm[] {
  const lines = csv.split('\n').map((l) => l.trimEnd());

  // Find the first non-empty line — that's the header row
  const headerIndex = lines.findIndex((l) => l.length > 0);
  if (headerIndex === -1) return [];

  const headers = parseCsvLine(lines[headerIndex]);
  const col = buildColumnIndex(headers);

  const nameCol = col['Name'];
  const yearCol = col['Year'];
  const uriCol = col['Letterboxd URI'];
  const tmdbCol = col['TMDb ID'];

  // We need at least a Name column to produce useful output
  if (nameCol === undefined) return [];

  const films: LetterboxdFilm[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const fields = parseCsvLine(line);

    const title = fields[nameCol]?.trim() ?? '';
    if (!title) continue;

    const year = yearCol !== undefined ? (fields[yearCol]?.trim() || null) : null;
    const url = uriCol !== undefined ? (fields[uriCol]?.trim() ?? '') : '';
    const rawTmdb = tmdbCol !== undefined ? fields[tmdbCol]?.trim() : undefined;
    const tmdbId = rawTmdb ? (parseInt(rawTmdb, 10) || null) : null;

    films.push({ title, year, url, tmdbId });
  }

  return films;
}
