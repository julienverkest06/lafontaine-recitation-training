export type AppMode = 'recite' | 'read';
export type ReaderViewMode = 'single' | 'anthology';
export type ReaderFontSize = 'sm' | 'md' | 'lg';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type CharMatchStatus = 'correct' | 'incorrect' | 'pending';

export interface Poem {
  id: number;
  title: string;
  author: string;
  content: string[];
  year?: string;
  status: string;
  livre: number;
  cover: string | null;
  sort: number;
  prev: number | null;
  next: number | null;
  Slug: string;
  learnt: boolean;
  number: number;
}

export interface PoemDisplayProps {
  poem: Poem;
  validatedLines?: boolean[];
  currentTypedText?: string;
  currentLineIndex?: number;
  difficulty?: Difficulty;
}

export interface PoemListProps {
  poems: Poem[];
  onSelectPoem: (poem: Poem) => void;
  selectedPoemId: string | null;
  completedPoemIds?: Set<string>;
}

export interface RecitationProps {
  poem: Poem | null;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onValidation: (validatedLines: boolean[]) => void;
  onTextChange?: (text: string, lineIndex: number) => void;
  onFocusChange?: (isFocused: boolean) => void;
  onResetProgress?: () => void;
}

export interface ValidationResult {
  correctLines: number;
  totalLines: number;
  validatedLines: boolean[];
}

export interface RecitedVerse {
  poemTitle: string;
  lines: string[];
}

export type RecitedVersesMap = Record<string, RecitedVerse>;

export interface ReaderPreferences {
  showLineNumbers: boolean;
  fontSize: ReaderFontSize;
  view: ReaderViewMode;
}
