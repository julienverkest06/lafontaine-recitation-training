import type { GameHighScoreMap, GameId } from '../types/games';
import type { ReaderPreferences, RecitedVersesMap } from '../types/poetry';

const VERSES_COUNT_KEY = 'recitedVerses';
const RECITED_VERSES_KEY = 'recitedVersesDetails';
const LAST_SELECTED_POEM_KEY = 'lastSelectedPoem';
const HAS_VISITED_KEY = 'hasVisited';
const READER_PREFERENCES_KEY = 'readerPreferences';
const GAME_HIGH_SCORES_KEY = 'gameHighScores';

const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  showLineNumbers: true,
  fontSize: 'md',
  view: 'single',
};

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export const getVersesCount = (): number => {
  const count = safeGetItem(VERSES_COUNT_KEY);
  const parsed = count ? Number.parseInt(count, 10) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const incrementVersesCount = (amount: number = 1): number => {
  const currentCount = getVersesCount();
  const newCount = currentCount + amount;
  safeSetItem(VERSES_COUNT_KEY, newCount.toString());
  return newCount;
};

export const getRecitedVerses = (): RecitedVersesMap => {
  const raw = safeGetItem(RECITED_VERSES_KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RecitedVersesMap;
    }
    return {};
  } catch {
    return {};
  }
};

export const addRecitedVerse = (
  poemId: string,
  poemTitle: string,
  line: string
): RecitedVersesMap => {
  const verses = getRecitedVerses();
  const existing = verses[poemId] ?? { poemTitle, lines: [] };

  if (!existing.lines.includes(line)) {
    const updated: RecitedVersesMap = {
      ...verses,
      [poemId]: {
        poemTitle,
        lines: [...existing.lines, line],
      },
    };
    safeSetItem(RECITED_VERSES_KEY, JSON.stringify(updated));
    return updated;
  }

  return verses;
};

export const saveLastSelectedPoem = (poemId: number): void => {
  safeSetItem(LAST_SELECTED_POEM_KEY, poemId.toString());
  safeSetItem(HAS_VISITED_KEY, 'true');
};

export const getLastSelectedPoem = (): number | null => {
  const poemId = safeGetItem(LAST_SELECTED_POEM_KEY);
  if (!poemId) return null;
  const parsed = Number.parseInt(poemId, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const hasVisitedBefore = (): boolean => {
  return safeGetItem(HAS_VISITED_KEY) === 'true';
};

export const getReaderPreferences = (): ReaderPreferences => {
  const raw = safeGetItem(READER_PREFERENCES_KEY);
  if (!raw) return DEFAULT_READER_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as Partial<ReaderPreferences>;
      return {
        showLineNumbers:
          typeof candidate.showLineNumbers === 'boolean'
            ? candidate.showLineNumbers
            : DEFAULT_READER_PREFERENCES.showLineNumbers,
        fontSize:
          candidate.fontSize === 'sm' ||
          candidate.fontSize === 'md' ||
          candidate.fontSize === 'lg'
            ? candidate.fontSize
            : DEFAULT_READER_PREFERENCES.fontSize,
        view:
          candidate.view === 'single' || candidate.view === 'anthology'
            ? candidate.view
            : DEFAULT_READER_PREFERENCES.view,
      };
    }
    return DEFAULT_READER_PREFERENCES;
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
};

export const saveReaderPreferences = (preferences: ReaderPreferences): void => {
  safeSetItem(READER_PREFERENCES_KEY, JSON.stringify(preferences));
};

export const getGameHighScores = (): GameHighScoreMap => {
  const raw = safeGetItem(GAME_HIGH_SCORES_KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: GameHighScoreMap = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          result[key as GameId] = Math.floor(value);
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
};

export const saveGameHighScore = (gameId: GameId, score: number): GameHighScoreMap => {
  const scores = getGameHighScores();
  const normalized = Math.max(0, Math.floor(score));
  const currentBest = scores[gameId] ?? 0;

  if (normalized > currentBest) {
    const updated: GameHighScoreMap = {
      ...scores,
      [gameId]: normalized,
    };
    safeSetItem(GAME_HIGH_SCORES_KEY, JSON.stringify(updated));
    return updated;
  }

  return scores;
};
