import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Mic, MicOff } from 'lucide-react';
import type { BaseRecitationProps } from '../../common/types';
import { useRecitation } from '../../common/useRecitation';
import { RecitationShell } from '../../common/RecitationShell';
import { useVoiceRecognition } from '../../useVoiceRecognition';
import { CompletionMessage } from '../../CompletionMessage';
import { cn } from '../../../../lib/utils';

export function VoiceRecitation({
  poem,
  difficulty,
  onDifficultyChange,
  onValidation,
  onTextChange,
  onFocusChange,
  onModeSwitch,
}: BaseRecitationProps) {
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);

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

  const handleTranscriptUpdate = useCallback(
    (transcript: string) => {
      const newText = transcript.trim();
      updateRecitation(newText);
      if (validateVerse(newText)) {
        setTranscriptHistory((prev) => [...prev, newText]);
      }
    },
    [updateRecitation, validateVerse]
  );

  const { isListening, isSupported, toggleMicrophone, stopListening } =
    useVoiceRecognition(handleTranscriptUpdate);

  const activeFocus = isListening && !isCompleted;

  useEffect(() => {
    onFocusChange(activeFocus);
  }, [activeFocus, onFocusChange]);

  useEffect(() => {
    return () => {
      onFocusChange(false);
    };
  }, [onFocusChange]);

  useEffect(() => {
    if (isCompleted) {
      stopListening();
    }
  }, [isCompleted, stopListening]);

  const handleRestart = () => {
    restart();
    setTranscriptHistory([]);
    stopListening();
  };

  if (isCompleted) {
    return <CompletionMessage poemTitle={poem.title} versesCount={poem.content.length} />;
  }

  return (
    <RecitationShell
      heading="Récitation vocale"
      isFocused={activeFocus}
      isDirty={isListening || state.correctCount > 0}
      difficulty={difficulty}
      onDifficultyChange={onDifficultyChange}
      onModeSwitch={() => {
        stopListening();
        onModeSwitch();
      }}
      onRestart={handleRestart}
      modeSwitchTitle="Passer en mode texte"
      modeSwitchIcon={<Keyboard className="w-4 h-4" />}
      modeSwitchTooltip={
        <div className="flex items-center gap-2">
          <span>Retour au mode texte</span>
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500 text-black rounded-full">
            Recommandé
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
      <div className="relative min-h-36 bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center">
        <div className="text-center mb-4">
          <p className="text-gray-600 mb-2 text-sm">
            {!isSupported
              ? "La reconnaissance vocale n'est pas disponible sur ce navigateur."
              : isListening
                ? 'En écoute...'
                : 'Cliquez sur le micro pour commencer'}
          </p>
          <p className="text-lg font-serif text-gray-800">
            {state.recitation || 'Votre récitation apparaîtra ici'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMicrophone}
          disabled={!isSupported}
          className={cn(
            'p-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            isListening
              ? 'bg-red-100 hover:bg-red-200 text-red-600'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          )}
          title={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
          aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>

      {transcriptHistory.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {transcriptHistory.map((transcript, index) => (
            <p key={index} className="text-sm text-gray-500 italic opacity-75">
              {transcript}
            </p>
          ))}
        </div>
      )}
    </RecitationShell>
  );
}
