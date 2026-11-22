import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { Mic } from 'lucide-react';
import type { BaseRecitationProps } from '../../common/types';
import { useRecitation } from '../../common/useRecitation';
import { RecitationShell } from '../../common/RecitationShell';
import CustomTextarea from '../../../ui/Textarea';
import { CompletionMessage } from '../../CompletionMessage';

export function TextRecitation({
  poem,
  difficulty,
  onDifficultyChange,
  onValidation,
  onTextChange,
  onFocusChange,
  onModeSwitch,
}: BaseRecitationProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [textareaContent, setTextareaContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    state,
    validateVerse,
    updateRecitation,
    getCurrentSectionLines,
    getOpacity,
    VERSES_PER_SECTION,
    restart,
  } = useRecitation({ poem, onValidation, onTextChange });

  const isCompleted =
    state.correctCount === poem.content.length && state.correctCount > 0;
  const activeFocus = isFocused && !isCompleted;

  useEffect(() => {
    onFocusChange(activeFocus);
  }, [activeFocus, onFocusChange]);

  useEffect(() => {
    return () => {
      onFocusChange(false);
    };
  }, [onFocusChange]);

  const handleRecitationChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextareaContent(value);

    const lines = value.split('\n');
    const currentLine = lines[lines.length - 1] ?? '';

    updateRecitation(currentLine);

    if (validateVerse(currentLine)) {
      const willComplete = state.correctCount + 1 >= poem.content.length;
      if (willComplete) {
        textareaRef.current?.blur();
        setIsFocused(false);
        return;
      }

      const newValue = `${value}\n`;
      setTextareaContent(newValue);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          const length = newValue.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      });
    }
  };

  const handleRestart = () => {
    restart();
    setTextareaContent('');
  };

  if (isCompleted) {
    return <CompletionMessage poemTitle={poem.title} versesCount={poem.content.length} />;
  }

  return (
    <RecitationShell
      heading="Récitation écrite"
      isFocused={activeFocus}
      isDirty={textareaContent.length > 0 || state.correctCount > 0}
      difficulty={difficulty}
      onDifficultyChange={onDifficultyChange}
      onModeSwitch={onModeSwitch}
      onRestart={handleRestart}
      modeSwitchTitle="Passer en mode vocal"
      modeSwitchIcon={<Mic className="w-4 h-4" />}
      modeSwitchTooltip={
        <div className="flex items-center gap-2">
          <span>Mode vocal</span>
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500 text-black rounded-full">
            Beta
          </span>
        </div>
      }
      totalVerses={poem.content.length}
      completedVerses={state.correctCount}
      sectionLines={getCurrentSectionLines()}
      currentSection={state.currentSection}
      versesPerSection={VERSES_PER_SECTION}
      getOpacity={getOpacity}
    >
      <div className="relative">
        <CustomTextarea
          ref={textareaRef}
          value={textareaContent}
          onChange={handleRecitationChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`Veuillez, cher ami, réciter le premier vers de la fable de Jean de La Fontaine : ${poem.title}...`}
          className="h-48 font-serif text-lg resize-none w-full pr-12"
          spellCheck={false}
          aria-label={`Zone de récitation pour ${poem.title}`}
        />
      </div>
    </RecitationShell>
  );
}
