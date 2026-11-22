import type { Poem } from '../types/poetry';
import { normalizeText } from '../utils/validation';

export interface BookGroup {
  livre: number;
  poems: Poem[];
}

export function sortFablesByBookOrder(poems: Poem[]): Poem[] {
  return poems.toSorted((a, b) => {
    if (a.livre !== b.livre) return a.livre - b.livre;
    if (a.number !== b.number) return a.number - b.number;
    return a.sort - b.sort;
  });
}

export function getAvailableBooks(poems: Poem[]): number[] {
  return [...new Set(poems.map((poem) => poem.livre))].toSorted((a, b) => a - b);
}

export function groupFablesByBook(poems: Poem[]): BookGroup[] {
  const sorted = sortFablesByBookOrder(poems);
  const groups = new Map<number, Poem[]>();

  for (const poem of sorted) {
    const existing = groups.get(poem.livre) ?? [];
    existing.push(poem);
    groups.set(poem.livre, existing);
  }

  return Array.from(groups.entries()).map(([livre, bookPoems]) => ({
    livre,
    poems: bookPoems,
  }));
}

export function getAdjacentFables(
  poems: Poem[],
  poemId: number
): { prev: Poem | null; next: Poem | null } {
  const sorted = sortFablesByBookOrder(poems);
  const index = sorted.findIndex((poem) => poem.id === poemId);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index < sorted.length - 1 ? sorted[index + 1] : null,
  };
}

export function searchFables(
  poems: Poem[],
  query: string,
  options: { book?: number | null; includeContent?: boolean } = {}
): Poem[] {
  const normalizedQuery = normalizeText(query);

  return poems.filter((poem) => {
    if (options.book != null && poem.livre !== options.book) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const inTitle = normalizeText(poem.title).includes(normalizedQuery);
    if (inTitle) return true;

    const inAuthor = normalizeText(poem.author).includes(normalizedQuery);
    if (inAuthor) return true;

    if (options.includeContent) {
      return poem.content.some((line) =>
        normalizeText(line).includes(normalizedQuery)
      );
    }

    return false;
  });
}

export function findFableBySlug(poems: Poem[], slug: string): Poem | undefined {
  return poems.find((poem) => poem.Slug === slug);
}

export function toRomanNumeral(num: number): string {
  const map: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = num;
  let result = '';

  for (const [value, symbol] of map) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }

  return result || String(num);
}
