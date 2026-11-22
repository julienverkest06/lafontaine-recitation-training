import { normalizeText } from './validation';

export interface CleanedSpeechResult {
  cleanedText: string;
  restartDetected: boolean;
  resetFableRequested: boolean;
  removedFillers: string[];
}

const FULL_RESET_PATTERNS: RegExp[] = [
  /\brecommencer\s+la\s+fable\b/i,
  /\brepartir\s+du\s+debut\b/i,
  /\btout\s+recommencer\b/i,
  /\brecommence\s+tout\b/i,
];

/**
 * Spoken French self-correction / restart markers.
 * When matched, everything spoken BEFORE the last marker is discarded so only
 * the user's fresh attempt is evaluated.
 */
const RESTART_MARKER_PATTERNS: RegExp[] = [
  /\b(?:oh|ah)\s+non\b/gi,
  /\bnon\s+attends?\b/gi,
  /\battends?\s+je\s+(?:recommence|reprends|refais)\b/gi,
  /\bje\s+me\s+suis\s+trompee?\b/gi,
  /\b(?:je|on)\s+(?:recommence|reprends|refais)\b/gi,
  /\bnon\s+c'?est\s+pas\s+ca\b/gi,
  /\bc'?est\s+pas\s+ca\b/gi,
  /\boups\b/gi,
  /\bmince\b/gi,
  /\bzut\b/gi,
  /\bpardon\b/gi,
  /\battends?\b/gi,
  /\battendez\b/gi,
];

const SINGLE_WORD_FILLERS = new Set([
  'euh',
  'heu',
  'hum',
  'hmm',
  'hm',
  'euhm',
  'uh',
  'ben',
  'bah',
  'bon',
  'alors',
  'voila',
  'genre',
  'enfin',
]);

const MULTI_WORD_FILLERS = ['du coup', 'en fait', 'tu vois', 'eh ben'];

function tokenize(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * Collapses consecutive repeated n-grams (1 to 3 words) caused by stutters or
 * false starts (e.g. "maitre maitre corbeau" or "sur un sur un arbre"),
 * while preserving legitimate repetitions that exist in the target verse.
 */
function deduplicateFalseStarts(tokens: string[], targetNormalized: string): string[] {
  let current = [...tokens];

  for (let ngramSize = 3; ngramSize >= 1; ngramSize--) {
    const next: string[] = [];
    let i = 0;

    while (i < current.length) {
      if (i + ngramSize * 2 <= current.length) {
        const first = current.slice(i, i + ngramSize).join(' ');
        const second = current.slice(i + ngramSize, i + ngramSize * 2).join(' ');

        if (first === second && !targetNormalized.includes(`${first} ${second}`)) {
          // Skip the first occurrence so we keep the latest attempt
          i += ngramSize;
          continue;
        }
      }

      next.push(current[i]);
      i += 1;
    }

    current = next;
  }

  return current;
}

export function cleanSpokenTranscript(
  rawTranscript: string,
  targetLine: string
): CleanedSpeechResult {
  const normalizedRaw = normalizeText(rawTranscript);
  const normalizedTarget = normalizeText(targetLine);
  const targetTokens = new Set(tokenize(normalizedTarget));

  if (!normalizedRaw) {
    return {
      cleanedText: '',
      restartDetected: false,
      resetFableRequested: false,
      removedFillers: [],
    };
  }

  // 1. Check for explicit full-fable reset command
  const resetFableRequested = FULL_RESET_PATTERNS.some((pattern) =>
    pattern.test(normalizedRaw)
  );

  // 2. Slice after the latest self-correction / restart marker
  let working = normalizedRaw;
  let lastRestartEnd = -1;

  for (const pattern of RESTART_MARKER_PATTERNS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const regex = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(working)) !== null) {
      const matchedPhrase = match[0].trim();
      // Never treat a phrase as a restart marker if it actually appears in the target verse
      if (normalizedTarget.includes(matchedPhrase)) {
        continue;
      }
      const endPos = match.index + match[0].length;
      if (endPos > lastRestartEnd) {
        lastRestartEnd = endPos;
      }
    }
  }

  const restartDetected = lastRestartEnd >= 0;
  if (restartDetected) {
    working = working.slice(lastRestartEnd).trim();
  }

  // 3. Remove multi-word fillers not present in the target verse
  const removedFillers: string[] = [];
  for (const filler of MULTI_WORD_FILLERS) {
    if (normalizedTarget.includes(filler)) continue;
    const fillerRegex = new RegExp(`(^|\\s)${filler}(?=\\s|$)`, 'g');
    if (fillerRegex.test(working)) {
      removedFillers.push(filler);
      working = working.replace(fillerRegex, '$1');
    }
  }

  // 4. Remove single-word fillers not present in the target verse
  const tokensAfterFillers: string[] = [];
  for (const token of tokenize(working)) {
    if (SINGLE_WORD_FILLERS.has(token) && !targetTokens.has(token)) {
      removedFillers.push(token);
      continue;
    }
    tokensAfterFillers.push(token);
  }

  // 5. Collapse stuttered false starts
  const deduplicated = deduplicateFalseStarts(tokensAfterFillers, normalizedTarget);

  return {
    cleanedText: deduplicated.join(' ').trim(),
    restartDetected,
    resetFableRequested,
    removedFillers,
  };
}
