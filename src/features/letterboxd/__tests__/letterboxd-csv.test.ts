import { describe, it, expect } from 'vitest';
import { parseLbCsv } from '../letterboxd-csv';

const BASIC_CSV = `Date,Name,Year,Letterboxd URI,TMDb ID
2024-01-15,Parasite,2019,https://letterboxd.com/film/parasite/,496243
2024-02-20,Dune: Part Two,2024,https://letterboxd.com/film/dune-part-two/,693134
2024-03-01,Mulholland Drive,2001,https://letterboxd.com/film/mulholland-drive/,1018`;

describe('parseLbCsv', () => {
  it('parses a basic CSV correctly', () => {
    const films = parseLbCsv(BASIC_CSV);
    expect(films).toHaveLength(3);
    expect(films[0]).toEqual({
      title: 'Parasite',
      year: '2019',
      url: 'https://letterboxd.com/film/parasite/',
      tmdbId: 496243,
    });
    expect(films[1]).toMatchObject({ title: 'Dune: Part Two', year: '2024', tmdbId: 693134 });
    expect(films[2]).toMatchObject({ title: 'Mulholland Drive', year: '2001', tmdbId: 1018 });
  });

  it('skips the header row and only returns data rows', () => {
    const films = parseLbCsv(BASIC_CSV);
    // Header row must not appear as a film
    expect(films.every((f) => f.title !== 'Name')).toBe(true);
  });

  it('handles titles with commas (quoted fields)', () => {
    const csv = `Date,Name,Year,Letterboxd URI,TMDb ID
2024-01-01,"The Good, the Bad and the Ugly",1966,https://letterboxd.com/film/the-good-the-bad-and-the-ugly/,391`;
    const films = parseLbCsv(csv);
    expect(films).toHaveLength(1);
    expect(films[0].title).toBe('The Good, the Bad and the Ugly');
  });

  it('returns null tmdbId when the TMDb ID column is missing or empty', () => {
    const csv = `Date,Name,Year,Letterboxd URI,TMDb ID
2024-01-01,Some Unknown Film,1995,https://letterboxd.com/film/some-unknown-film/,`;
    const films = parseLbCsv(csv);
    expect(films[0].tmdbId).toBeNull();
  });

  it('returns an empty array for an empty CSV', () => {
    expect(parseLbCsv('')).toEqual([]);
    expect(parseLbCsv('\n\n')).toEqual([]);
  });

  it('is resilient to different column ordering', () => {
    // Columns in a different order than the standard export
    const csv = `TMDb ID,Name,Letterboxd URI,Year,Date
496243,Parasite,https://letterboxd.com/film/parasite/,2019,2024-01-15`;
    const films = parseLbCsv(csv);
    expect(films).toHaveLength(1);
    expect(films[0]).toEqual({
      title: 'Parasite',
      year: '2019',
      url: 'https://letterboxd.com/film/parasite/',
      tmdbId: 496243,
    });
  });

  it('handles a CSV with no TMDb ID column at all', () => {
    const csv = `Date,Name,Year,Letterboxd URI
2024-01-01,Inception,2010,https://letterboxd.com/film/inception/`;
    const films = parseLbCsv(csv);
    expect(films).toHaveLength(1);
    expect(films[0]).toMatchObject({ title: 'Inception', tmdbId: null });
  });

  it('skips blank data rows without crashing', () => {
    const csv = `Date,Name,Year,Letterboxd URI,TMDb ID
2024-01-01,Parasite,2019,https://letterboxd.com/film/parasite/,496243

2024-02-01,Dune,2021,https://letterboxd.com/film/dune/,438631`;
    const films = parseLbCsv(csv);
    expect(films).toHaveLength(2);
  });
});
