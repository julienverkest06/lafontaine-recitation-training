import type { Difficulty, WordMatchStatus } from '../types/poetry';
import { applyContextualLexicon } from '../data/lafontaineLexicon';
import { cleanSpokenTranscript } from './speechCleaner';
import { normalizeText } from './validation';

export interface VoiceAlignmentResult {
  bestCleanedText: string;
  matchedVersesCount: number;
  remainingTranscript: string;
  currentLineWordStatuses: WordMatchStatus[];
  restartDetected: boolean;
  resetFableRequested: boolean;
  removedFillers: string[];
}

function tokenizeWords(normalized: string): string[] {
  return normalized
    .replace(/'/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function pendingStatuses(length: number): WordMatchStatus[] {
  return Array.from({ length }, () => 'pending');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

/**
 * Deterministic French phonetic key designed for oral poetry matching.
 * Groups homophones (e.g. encor/encore, paierai/payerai, ver/vers/verre/vert,
 * chantais/chantait, saisit/saisi) without external dependencies.
 */
export function toFrenchPhonetic(word: string): string {
  let s = normalizeText(word).replace(/[^a-z]/g, '');
  if (!s) return '';

  // Silent h (keep ch/ph/th first)
  s = s.replace(/ph/g, 'f');
  s = s.replace(/ch/g, 'S');
  s = s.replace(/gn/g, 'N');
  s = s.replace(/h/g, '');

  // Nasal vowels
  s = s.replace(/(?:ain|ein|aim|in|im|yn|ym)(?![aeiouy])/g, 'I');
  s = s.replace(/(?:an|am|en|em)(?![aeiouy])/g, 'A');
  s = s.replace(/(?:on|om)(?![aeiouy])/g, 'O');
  s = s.replace(/(?:un|um)(?![aeiouy])/g, 'I');

  // Compound vowels
  s = s.replace(/eaux?/g, 'o');
  s = s.replace(/au/g, 'o');
  s = s.replace(/ou/g, 'u');
  s = s.replace(/o[iy]/g, 'wa');
  s = s.replace(/eu/g, 'E');
  s = s.replace(/(?:ai|ei|ay|ey)/g, 'E');
  // Infinitive -er endings (4+ chars like chanter/parler), keeping monosyllables like ver/mer/fer
  if (s.length >= 4) {
    s = s.replace(/er$/g, 'E');
  }
  s = s.replace(/ez$/g, 'E');
  s = s.replace(/et$/g, 'E');
  s = s.replace(/y/g, 'i');

  // Consonants
  s = s.replace(/qu/g, 'k');
  s = s.replace(/gu(?=[eiE])/g, 'g');
  s = s.replace(/g(?=[eiE])/g, 'J');
  s = s.replace(/j/g, 'J');
  s = s.replace(/sc(?=[eiE])/g, 's');
  s = s.replace(/c(?=[eiE])/g, 's');
  s = s.replace(/c/g, 'k');
  s = s.replace(/q/g, 'k');
  s = s.replace(/x/g, 'ks');

  // Collapse consecutive identical letters
  s = s.replace(/(.)\1+/g, '$1');

  // Silent final letters in French (keep short 1-2 char words intact)
  if (s.length > 2) {
    s = s.replace(/[stdxz]+$/g, '');
  }
  if (s.length > 2) {
    s = s.replace(/e$/g, '');
  }

  // Final e/E normalization
  s = s.replace(/e/g, 'E');

  return s;
}

export function matchWordToTarget(
  spokenWord: string,
  targetWord: string,
  difficulty: Difficulty = 'easy'
): boolean {
  const normSpoken = normalizeText(spokenWord);
  const normTarget = normalizeText(targetWord);

  if (!normSpoken || !normTarget) return false;
  if (normSpoken === normTarget) return true;

  const phonSpoken = toFrenchPhonetic(normSpoken);
  const phonTarget = toFrenchPhonetic(normTarget);

  if (phonSpoken && phonSpoken === phonTarget) {
    return true;
  }

  if (difficulty === 'hard') {
    return false;
  }

  if (difficulty === 'medium') {
    if (normTarget.length >= 6 && levenshtein(normSpoken, normTarget) <= 1) {
      return true;
    }
    return false;
  }

  // Easy: tolerate 1-char edit on words >= 4 chars or 1-char phonetic slip on words >= 5 chars
  if (normTarget.length >= 4 && levenshtein(normSpoken, normTarget) <= 1) {
    return true;
  }
  if (phonTarget.length >= 5 && levenshtein(phonSpoken, phonTarget) <= 1) {
    return true;
  }

  return false;
}

interface SingleVerseAlignment {
  matched: boolean;
  consumedSpokenCount: number;
  wordStatuses: WordMatchStatus[];
  matchedRatio: number;
}

function alignSingleVerse(
  spokenWords: string[],
  targetLine: string,
  difficulty: Difficulty
): SingleVerseAlignment {
  const targetNormalized = normalizeText(targetLine);
  const targetWords = tokenizeWords(targetNormalized);

  if (targetWords.length === 0) {
    return { matched: false, consumedSpokenCount: 0, wordStatuses: [], matchedRatio: 0 };
  }

  const wordStatuses = pendingStatuses(targetWords.length);

  let spokenIdx = 0;
  let targetIdx = 0;
  let matchedCount = 0;

  while (spokenIdx < spokenWords.length && targetIdx < targetWords.length) {
    if (matchWordToTarget(spokenWords[spokenIdx], targetWords[targetIdx], difficulty)) {
      wordStatuses[targetIdx] = 'matched';
      matchedCount += 1;
      spokenIdx += 1;
      targetIdx += 1;
      continue;
    }

    // Look ahead 1 spoken word (extra noise word inserted by STT)
    if (
      spokenIdx + 1 < spokenWords.length &&
      matchWordToTarget(spokenWords[spokenIdx + 1], targetWords[targetIdx], difficulty)
    ) {
      spokenIdx += 1;
      continue;
    }

    // Look ahead 1 target word (single skipped short word like an article)
    if (
      difficulty !== 'hard' &&
      targetIdx + 1 < targetWords.length &&
      matchWordToTarget(spokenWords[spokenIdx], targetWords[targetIdx + 1], difficulty)
    ) {
      wordStatuses[targetIdx] = 'missed';
      targetIdx += 1;
      continue;
    }

    // No match at current cursor; advance spoken word (e.g., partial misrecognition)
    spokenIdx += 1;
  }

  const matchedRatio = matchedCount / targetWords.length;
  const requiredRatio =
    difficulty === 'hard' ? 1 : difficulty === 'medium' ? 0.9 : 0.85;

  // For very short verses (<= 4 words), require all words to avoid accidental validation
  const isShortVerse = targetWords.length <= 4;
  const matched = isShortVerse
    ? matchedCount === targetWords.length
    : matchedRatio >= requiredRatio && targetIdx >= targetWords.length - 1;

  return {
    matched,
    consumedSpokenCount: spokenIdx,
    wordStatuses,
    matchedRatio,
  };
}

function evaluateSingleAlternative(
  rawAlternative: string,
  poemLines: string[],
  startLineIndex: number,
  difficulty: Difficulty
): VoiceAlignmentResult & { score: number } {
  const currentTarget = poemLines[startLineIndex] ?? '';
  const upcomingWindow = poemLines.slice(startLineIndex, startLineIndex + 3).join(' ');
  const cleaned = cleanSpokenTranscript(rawAlternative, upcomingWindow || currentTarget);

  if (!cleaned.cleanedText) {
    const targetWords = tokenizeWords(normalizeText(currentTarget));
    return {
      bestCleanedText: '',
      matchedVersesCount: 0,
      remainingTranscript: '',
      currentLineWordStatuses: pendingStatuses(targetWords.length),
      restartDetected: cleaned.restartDetected,
      resetFableRequested: cleaned.resetFableRequested,
      removedFillers: cleaned.removedFillers,
      score: 0,
    };
  }

  let cursor = startLineIndex;
  let matchedVersesCount = 0;
  let workingText = cleaned.cleanedText;
  let currentLineWordStatuses: WordMatchStatus[] = [];
  let totalScore = 0;

  while (cursor < poemLines.length) {
    const targetLine = poemLines[cursor];
    const targetNormalized = normalizeText(targetLine);
    const lexiconAdjusted = applyContextualLexicon(workingText, targetNormalized);
    const spokenWords = tokenizeWords(lexiconAdjusted);

    if (spokenWords.length === 0) {
      const targetWords = tokenizeWords(targetNormalized);
      currentLineWordStatuses = pendingStatuses(targetWords.length);
      break;
    }

    const alignment = alignSingleVerse(spokenWords, targetLine, difficulty);
    totalScore += alignment.matchedRatio;

    if (alignment.matched) {
      matchedVersesCount += 1;
      cursor += 1;
      const remainingWords = spokenWords.slice(alignment.consumedSpokenCount);
      workingText = remainingWords.join(' ');
      if (remainingWords.length === 0) {
        const nextTarget = poemLines[cursor] ?? '';
        currentLineWordStatuses = pendingStatuses(
          tokenizeWords(normalizeText(nextTarget)).length
        );
        break;
      }
    } else {
      currentLineWordStatuses = alignment.wordStatuses;
      break;
    }
  }

  return {
    bestCleanedText: cleaned.cleanedText,
    matchedVersesCount,
    remainingTranscript: workingText,
    currentLineWordStatuses,
    restartDetected: cleaned.restartDetected,
    resetFableRequested: cleaned.resetFableRequested,
    removedFillers: cleaned.removedFillers,
    score: matchedVersesCount * 10 + totalScore,
  };
}

export function alignTranscriptToPoem(
  alternatives: string[],
  poemLines: string[],
  startLineIndex: number,
  difficulty: Difficulty = 'easy'
): VoiceAlignmentResult {
  const candidates = alternatives.length > 0 ? alternatives : [''];

  let best = evaluateSingleAlternative(candidates[0], poemLines, startLineIndex, difficulty);

  for (let i = 1; i < candidates.length; i++) {
    const evaluated = evaluateSingleAlternative(
      candidates[i],
      poemLines,
      startLineIndex,
      difficulty
    );
    if (evaluated.score > best.score) {
      best = evaluated;
    }
  }

  const { score: _score, ...result } = best;
  return result;
}
