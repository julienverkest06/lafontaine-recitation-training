import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Mic, MicOff, RefreshCw, Sparkles } from 'lucide-react';
import type { BaseRecitationProps } from '../../common/types';
import { useRecitation } from '../../common/useRecitation';
import { RecitationShell } from '../../common/RecitationShell';
import { useVoiceRecognition } from '../../useVoiceRecognition';
import { CompletionMessage } from '../../CompletionMessage';
import type { TranscriptEvent } from '../../../../services/speech/types';
import { alignTranscriptToPoem } from '../../../../utils/phoneticAligner';
import {
  buildWhisperInitialPrompt,
  extractFableGlossary,
} from '../../../../data/lafontaineLexicon';
import { cn } from '../../../../lib/utils';

export function VoiceRecitation({
  poem,
  difficulty,
  onDifficultyChange,
  onValidation,
  onTextChange,
  onWordStatusesChange,
  onFocusChange,
  onModeSwitch,
}: BaseRecitationProps) {
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);

  const {
    state,
    validateMultipleVerses,
    updateRecitation,
    getCurrentSectionLines,
    getOpacity,
    VERSES_PER_SECTION,
    restart,
  } = useRecitation({ poem, onValidation, onTextChange });

  const isCompleted =
    state.correctCount === poem.content.length && state.correctCount > 0;

  const glossary = useMemo(() => extractFableGlossary(poem, 12), [poem]);

  const validatedTexts = useMemo(
    () => poem.content.filter((_, i) => state.validatedLines[i]),
    [poem.content, state.validatedLines]
  );

  const startOptions = useMemo(
    () => ({
      vocabularyHints: glossary,
      contextVerses: validatedTexts.slice(-2),
      initialPrompt: buildWhisperInitialPrompt(poem, validatedTexts),
    }),
    [glossary, poem, validatedTexts]
  );

  const showTransientNotice = useCallback((message: string) => {
    window.clearTimeout(noticeTimerRef.current);
    setStatusNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const handleRestart = useCallback(() => {
    restart();
    setTranscriptHistory([]);
    setStatusNotice(null);
    onWordStatusesChange?.(null, 0);
  }, [onWordStatusesChange, restart]);

  const handleTranscript = useCallback(
    (event: TranscriptEvent) => {
      const alignment = alignTranscriptToPoem(
        event.alternatives,
        poem.content,
        state.currentLineIndex,
        difficulty
      );

      if (alignment.resetFableRequested) {
        handleRestart();
        showTransientNotice('Commande vocale : récitation redémarrée depuis le début');
        return;
      }

      if (alignment.restartDetected) {
        showTransientNotice('Reprise détectée — tentative précédente ignorée');
      } else if (alignment.removedFillers.length > 0) {
        showTransientNotice('Hésitation filtrée automatiquement');
      }

      if (alignment.matchedVersesCount > 0) {
        const validated = validateMultipleVerses(alignment.matchedVersesCount);
        setTranscriptHistory((prev) => [...prev, ...validated]);
        const nextIndex = state.currentLineIndex + alignment.matchedVersesCount;
        onWordStatusesChange?.(
          alignment.remainingTranscript ? alignment.currentLineWordStatuses : null,
          nextIndex
        );
        updateRecitation(alignment.remainingTranscript);
        if (alignment.matchedVersesCount > 1) {
          showTransientNotice(`${alignment.matchedVersesCount} vers validés en continu`);
        }
        return;
      }

      updateRecitation(alignment.bestCleanedText);
      onWordStatusesChange?.(alignment.currentLineWordStatuses, state.currentLineIndex);
    },
    [
      difficulty,
      handleRestart,
      onWordStatusesChange,
      poem.content,
      showTransientNotice,
      state.currentLineIndex,
      updateRecitation,
      validateMultipleVerses,
    ]
  );

  const {
    isListening,
    isSupported,
    errorMessage,
    engineLabel,
    toggleMicrophone,
    stopListening,
  } = useVoiceRecognition({
    onTranscript: handleTranscript,
    startOptions,
  });

  const activeFocus = isListening && !isCompleted;

  useEffect(() => {
    onFocusChange(activeFocus);
  }, [activeFocus, onFocusChange]);

  useEffect(() => {
    return () => {
      onFocusChange(false);
      onWordStatusesChange?.(null, 0);
    };
  }, [onFocusChange, onWordStatusesChange]);

  useEffect(() => {
    if (isCompleted) {
      stopListening();
      onWordStatusesChange?.(null, state.currentLineIndex);
    }
  }, [isCompleted, onWordStatusesChange, state.currentLineIndex, stopListening]);

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
        onWordStatusesChange?.(null, 0);
        onModeSwitch();
      }}
      onRestart={() => {
        stopListening();
        handleRestart();
      }}
      modeSwitchTitle="Passer en mode texte"
      modeSwitchIcon={<Keyboard className="w-4 h-4" />}
      modeSwitchTooltip={
        <div className="flex items-center gap-2">
          <span>Retour au mode texte</span>
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500 text-black rounded-full">
            Clavier
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
      <div className="relative min-h-40 bg-gray-50 rounded-lg p-5 flex flex-col items-center justify-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-gray-200">
            <Sparkles className="w-3 h-3 text-indigo-500" aria-hidden="true" />
            {engineLabel} · Filtre hésitations & phonétique La Fontaine
          </span>
          {statusNotice && (
            <output className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              {statusNotice}
            </output>
          )}
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-1.5 text-sm">
            {!isSupported
              ? "La reconnaissance vocale n'est pas disponible sur ce navigateur."
              : isListening
                ? 'En écoute… récitez naturellement (vous pouvez hésiter ou dire « je recommence »)'
                : 'Cliquez sur le micro pour commencer la récitation orale'}
          </p>
          <p className="text-lg font-serif text-gray-800 min-h-7">
            {state.recitation || 'Votre récitation apparaîtra ici'}
          </p>
          {errorMessage && (
            <p className="mt-1.5 text-xs text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={toggleMicrophone}
          disabled={!isSupported}
          className={cn(
            'p-3.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs',
            isListening
              ? 'bg-red-100 hover:bg-red-200 text-red-600 ring-4 ring-red-50'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
          title={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
          aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>

      {transcriptHistory.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {transcriptHistory.slice(-4).map((transcript, index) => (
            <p key={index} className="text-sm text-green-700/80 font-serif italic">
              ✓ {transcript}
            </p>
          ))}
        </div>
      )}
    </RecitationShell>
  );
}
