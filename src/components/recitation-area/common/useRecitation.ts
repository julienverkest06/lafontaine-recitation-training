import { useState, useCallback } from 'react';
import { VERSES_PER_SECTION } from '../../../constants/recitation';
import type { UseRecitationProps, RecitationState } from './types';
import { validateLine } from '../../../utils/validation';
import { addRecitedVerse } from '../../../utils/localStorage';

const INITIAL_STATE: RecitationState = {
  recitation: '',
  validatedLines: [],
  correctCount: 0,
  currentLineIndex: 0,
  currentSection: 0,
};

function getOpacity(index: number): number {
  const baseOpacity = 0.3;
  const opacityStep = (1 - baseOpacity) / (VERSES_PER_SECTION - 1);
  return baseOpacity + opacityStep * (VERSES_PER_SECTION - 1 - index);
}

export function useRecitation({ poem, onValidation, onTextChange }: UseRecitationProps) {
  const [state, setState] = useState<RecitationState>(INITIAL_STATE);

  const validateMultipleVerses = useCallback(
    (count: number): string[] => {
      if (!poem || count <= 0 || state.currentLineIndex >= poem.content.length) {
        return [];
      }

      const maxToValidate = Math.min(count, poem.content.length - state.currentLineIndex);
      const newValidatedLines = [...state.validatedLines];
      const validatedTexts: string[] = [];

      for (let offset = 0; offset < maxToValidate; offset++) {
        const lineIndex = state.currentLineIndex + offset;
        const targetLine = poem.content[lineIndex];
        addRecitedVerse(poem.id.toString(), poem.title, targetLine);
        newValidatedLines[lineIndex] = true;
        validatedTexts.push(targetLine);
      }

      const newCorrectCount = newValidatedLines.filter(Boolean).length;
      const nextLineIndex = state.currentLineIndex + maxToValidate;
      const newSection = Math.floor(nextLineIndex / VERSES_PER_SECTION);

      setState({
        validatedLines: newValidatedLines,
        correctCount: newCorrectCount,
        currentLineIndex: nextLineIndex,
        currentSection: newSection,
        recitation: '',
      });

      onValidation(newValidatedLines);
      onTextChange('', nextLineIndex);

      return validatedTexts;
    },
    [poem, state.currentLineIndex, state.validatedLines, onValidation, onTextChange]
  );

  const validateVerse = useCallback(
    (text: string): boolean => {
      if (!poem || state.currentLineIndex >= poem.content.length) return false;

      const targetLine = poem.content[state.currentLineIndex];
      const isCorrect = validateLine(text, targetLine);

      if (isCorrect) {
        validateMultipleVerses(1);
        return true;
      }

      return false;
    },
    [poem, state.currentLineIndex, validateMultipleVerses]
  );

  const updateRecitation = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, recitation: text }));
      onTextChange(text, state.currentLineIndex);
    },
    [onTextChange, state.currentLineIndex]
  );

  const getCurrentSectionLines = (): boolean[] => {
    const start = state.currentSection * VERSES_PER_SECTION;
    const end = Math.min(start + VERSES_PER_SECTION, poem?.content.length ?? 0);
    return Array.from(
      { length: Math.max(0, end - start) },
      (_, i) => state.validatedLines[start + i] ?? false
    );
  };

  const restart = useCallback(() => {
    setState(INITIAL_STATE);
    onValidation([]);
    onTextChange('', 0);
  }, [onValidation, onTextChange]);

  return {
    state,
    validateVerse,
    validateMultipleVerses,
    updateRecitation,
    getCurrentSectionLines,
    getOpacity,
    VERSES_PER_SECTION,
    restart,
  };
}
