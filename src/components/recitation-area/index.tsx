import { useState } from 'react';
import type { RecitationProps } from '../../types/poetry';
import type { RecitationMode } from './common/types';
import { TextRecitation } from './modes/text/TextRecitation';
import { VoiceRecitation } from './modes/voice/VoiceRecitation';

const noop = () => {};

export function RecitationArea({
  poem,
  difficulty,
  onDifficultyChange,
  onValidation,
  onTextChange,
  onFocusChange,
  onResetProgress,
}: RecitationProps) {
  const [mode, setMode] = useState<RecitationMode>('text');

  if (!poem) return null;

  const toggleMode = () => {
    onResetProgress?.();
    setMode((prev) => (prev === 'text' ? 'voice' : 'text'));
  };

  const sharedProps = {
    poem,
    difficulty,
    onDifficultyChange,
    onValidation,
    onTextChange: onTextChange ?? noop,
    onFocusChange: onFocusChange ?? noop,
    onModeSwitch: toggleMode,
  };

  return mode === 'text' ? (
    <TextRecitation key={poem.id} {...sharedProps} />
  ) : (
    <VoiceRecitation key={poem.id} {...sharedProps} />
  );
}
