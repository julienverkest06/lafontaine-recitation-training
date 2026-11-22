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

  const validateVerse = useCallback(
    (text: string): boolean => {
      if (!poem || state.currentLineIndex >= poem.content.length) return false;

      const targetLine = poem.content[state.currentLineIndex];
      const isCorrect = validateLine(text, targetLine);

      if (isCorrect) {
        addRecitedVerse(poem.id.toString(), poem.title, targetLine);

        const newValidatedLines = [...state.validatedLines];
        newValidatedLines[state.currentLineIndex] = true;

        const newCorrectCount = newValidatedLines.filter(Boolean).length;
        const nextLineIndex = state.currentLineIndex + 1;
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
        return true;
      }

      return false;
    },
    [poem, state.currentLineIndex, state.validatedLines, onValidation, onTextChange]
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
    updateRecitation,
    getCurrentSectionLines,
    getOpacity,
    VERSES_PER_SECTION,
    restart,
  };
}
