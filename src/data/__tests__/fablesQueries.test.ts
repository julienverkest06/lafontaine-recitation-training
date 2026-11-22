import { describe, expect, it } from 'vitest';
import { fables } from '../fables';
import {
  findFableBySlug,
  getAdjacentFables,
  getAvailableBooks,
  groupFablesByBook,
  searchFables,
  sortFablesByBookOrder,
  toRomanNumeral,
} from '../fablesQueries';

describe('fables dataset integrity', () => {
  it('ne contient aucune ligne vide ni espace en début/fin de vers ou de titre', () => {
    expect(fables.length).toBeGreaterThan(0);
    for (const fable of fables) {
      expect(fable.title).toBe(fable.title.trim());
      expect(fable.content.length).toBeGreaterThan(0);
      for (const line of fable.content) {
        expect(line.trim().length).toBeGreaterThan(0);
        expect(line).toBe(line.trim());
      }
    }
  });
});

describe('fablesQueries', () => {
  it('trie et groupe les fables par Livre', () => {
    const books = getAvailableBooks(fables);
    expect(books).toEqual([1, 3, 4, 5, 6, 7, 12]);

    const grouped = groupFablesByBook(fables);
    expect(grouped.map((g) => g.livre)).toEqual(books);
    expect(grouped.reduce((sum, g) => sum + g.poems.length, 0)).toBe(fables.length);
  });

  it('calcule correctement les fables précédente et suivante sans liens cassés', () => {
    const ordered = sortFablesByBookOrder(fables);
    const first = getAdjacentFables(fables, ordered[0].id);
    expect(first.prev).toBeNull();
    expect(first.next?.id).toBe(ordered[1].id);

    const last = getAdjacentFables(fables, ordered[ordered.length - 1].id);
    expect(last.prev?.id).toBe(ordered[ordered.length - 2].id);
    expect(last.next).toBeNull();
  });

  it('recherche dans les titres et dans le contenu des vers sans sensibilité aux accents', () => {
    const byTitle = searchFables(fables, 'chene');
    expect(byTitle.some((f) => f.Slug === 'le-chene-et-le-roseau')).toBe(true);

    const byVerse = searchFables(fables, 'fromage', { includeContent: true });
    expect(byVerse.some((f) => f.Slug === 'le-corbeau-et-le-renard')).toBe(true);
  });

  it('trouve une fable par slug et convertit en chiffres romains', () => {
    expect(findFableBySlug(fables, 'la-cigale-et-la-fourmi')?.title).toBe(
      'La Cigale et la Fourmi'
    );
    expect(toRomanNumeral(1)).toBe('I');
    expect(toRomanNumeral(4)).toBe('IV');
    expect(toRomanNumeral(12)).toBe('XII');
  });
});
