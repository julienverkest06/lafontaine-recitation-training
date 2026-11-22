import type { CharMatchStatus } from '../types/poetry';

const PUNCTUATION_WITH_SPACE = [' :', ' ;', ' !', ' ?'];
const SIMPLE_PUNCTUATION = /[.,«»""''()\-—:;!?…]/;

function isPunctuationWithSpace(str: string, index: number): boolean {
  if (index === 0) return false;

  for (const punct of PUNCTUATION_WITH_SPACE) {
    if (str.slice(index - 1, index + punct.length - 1) === punct) {
      return true;
    }
  }
  return false;
}

function isSimplePunctuation(char: string): boolean {
  return SIMPLE_PUNCTUATION.test(char);
}

function stripAccents(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeChar(char: string): string {
  return stripAccents(char).replace(/œ/g, 'oe').replace(/æ/g, 'ae');
}

export function normalizeText(text: string): string {
  const normalized = stripAccents(text.trim())
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

  let result = '';
  for (let i = 0; i < normalized.length; i++) {
    if (isPunctuationWithSpace(normalized, i)) {
      continue;
    }
    if (isSimplePunctuation(normalized[i])) {
      continue;
    }
    result += normalized[i];
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function validateLine(recited: string, original: string): boolean {
  const normalizedOriginal = normalizeText(original);
  if (!normalizedOriginal) return false;
  return normalizeText(recited) === normalizedOriginal;
}

export function validateRecitation(recited: string[], original: string[]): boolean[] {
  return recited.map((line, index) => {
    if (index >= original.length) return false;
    return validateLine(line, original[index]);
  });
}

function extractComparableLetters(text: string): string {
  return normalizeText(text).replace(/\s+/g, '');
}

export function compareCharacters(typed: string, original: string): CharMatchStatus[] {
  const typedLetters = extractComparableLetters(typed);
  const results: CharMatchStatus[] = [];
  let typedIndex = 0;

  for (let i = 0; i < original.length; i++) {
    const originalChar = original[i];

    if (
      isPunctuationWithSpace(original, i) ||
      isSimplePunctuation(originalChar) ||
      /\s/.test(originalChar)
    ) {
      results.push(typedIndex > 0 && typedIndex <= typedLetters.length ? 'correct' : 'pending');
      continue;
    }

    const expectedSequence = normalizeChar(originalChar);

    if (typedIndex >= typedLetters.length) {
      results.push('pending');
      continue;
    }

    const slice = typedLetters.slice(typedIndex, typedIndex + expectedSequence.length);
    if (slice === expectedSequence) {
      results.push('correct');
      typedIndex += expectedSequence.length;
    } else if (expectedSequence.length > 1 && expectedSequence.startsWith(slice)) {
      // Partial ligature match (e.g. user typed 'o' on the way to 'oe' for 'œ')
      results.push('correct');
      typedIndex += slice.length;
    } else {
      results.push('incorrect');
      typedIndex += Math.min(expectedSequence.length, typedLetters.length - typedIndex);
    }
  }

  return results;
}
