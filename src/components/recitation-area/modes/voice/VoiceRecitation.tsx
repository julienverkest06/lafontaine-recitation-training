import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Cpu,
  Globe,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { BaseRecitationProps } from '../../common/types';
import { useRecitation } from '../../common/useRecitation';
import { RecitationShell } from '../../common/RecitationShell';
import { useVoiceRecognition } from '../../useVoiceRecognition';
import { CompletionMessage } from '../../CompletionMessage';
import type {
  SpeechEngineId,
  TranscriptEvent,
  WhisperModelVariant,
} from '../../../../services/speech/types';
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
  const [engineId, setEngineId] = useState<SpeechEngineId>('web-speech');
  const [whisperModel, setWhisperModel] = useState<WhisperModelVariant>('base');
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [rawTranscript, setRawTranscript] = useState('');
  const [isInterim, setIsInterim] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const resetBufferRef = useRef<() => void>(() => {});

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
    resetBufferRef.current();
    setTranscriptHistory([]);
    setRawTranscript('');
    setIsInterim(false);
    setStatusNotice(null);
    onWordStatusesChange?.(null, 0);
  }, [onWordStatusesChange, restart]);

  const handleTranscript = useCallback(
    (event: TranscriptEvent) => {
      setRawTranscript(event.text);
      setIsInterim(!event.isFinal);

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
        resetBufferRef.current();
        setTranscriptHistory((prev) => [...prev, ...validated]);
        setRawTranscript(alignment.remainingTranscript);
        setIsInterim(false);
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
    isLoadingModel,
    isSupported,
    errorMessage,
    modelProgress,
    inferenceDevice,
    audioState,
    engineLabel,
    toggleMicrophone,
    stopListening,
    resetTranscriptBuffer,
  } = useVoiceRecognition({
    onTranscript: handleTranscript,
    startOptions,
    engineId,
    whisperModel,
  });

  useEffect(() => {
    resetBufferRef.current = resetTranscriptBuffer;
  }, [resetTranscriptBuffer]);

  const activeFocus = (isListening || isLoadingModel) && !isCompleted;

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

  const displayedLiveText = rawTranscript || state.recitation;

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
      <div className="relative bg-gray-50 rounded-lg p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <fieldset
              className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 m-0"
              aria-label="Moteur de reconnaissance vocale"
            >
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setEngineId('web-speech');
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  engineId === 'web-speech'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                Web Speech (0 Mo)
              </button>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setEngineId('whisper-webgpu');
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  engineId === 'whisper-webgpu'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                Whisper Local (IA)
              </button>
            </fieldset>

            {engineId === 'whisper-webgpu' && (
              <select
                aria-label="Taille du modèle Whisper"
                value={whisperModel}
                onChange={(e) => {
                  stopListening();
                  setWhisperModel(e.target.value as WhisperModelVariant);
                }}
                className="h-7 px-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="base">Whisper Base (~85 Mo, rapide)</option>
                <option value="small">Whisper Small (~240 Mo, précis)</option>
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isListening && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-medium',
                  audioState.speechDetected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : audioState.micActive
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                )}
              >
                <Radio
                  className={cn(
                    'w-3 h-3',
                    audioState.speechDetected && 'animate-pulse text-emerald-600'
                  )}
                  aria-hidden="true"
                />
                {audioState.speechDetected
                  ? 'Parole détectée'
                  : audioState.micActive
                    ? 'Micro actif — parlez'
                    : 'Connexion micro…'}
              </span>
            )}

            {statusNotice && (
              <output className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                {statusNotice}
              </output>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-gray-200">
            <Sparkles className="w-3 h-3 text-indigo-500" aria-hidden="true" />
            {engineLabel}
            {engineId === 'whisper-webgpu' && inferenceDevice
              ? ` · ${inferenceDevice.toUpperCase()}`
              : ''}
            {' · '}Filtre hésitations & phonétique La Fontaine
          </span>
        </div>

        {isLoadingModel && (
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-xs text-indigo-700">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                Chargement du modèle Whisper (mis en cache navigateur)…
              </span>
              {modelProgress !== null && <span>{modelProgress}%</span>}
            </div>
            <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${modelProgress ?? 15}%` }}
              />
            </div>
          </div>
        )}

        {/* Zone de validation / transcription en direct */}
        <div
          aria-live="polite"
          className={cn(
            'min-h-28 w-full rounded-lg border bg-white p-4 flex flex-col justify-between transition-colors',
            isListening ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-gray-200'
          )}
        >
          <div className="space-y-1.5">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Texte dicté en direct (vers {state.currentLineIndex + 1}/{poem.content.length})
            </div>
            {displayedLiveText ? (
              <p
                className={cn(
                  'text-lg font-serif leading-relaxed',
                  isInterim ? 'text-indigo-700 italic' : 'text-gray-900'
                )}
              >
                {displayedLiveText}
              </p>
            ) : (
              <p className="text-base font-serif text-gray-400 italic">
                {!isSupported
                  ? "La reconnaissance vocale n'est pas disponible sur ce navigateur."
                  : isLoadingModel
                    ? 'Initialisation du modèle IA local en cours…'
                    : isListening
                      ? 'En écoute… commencez à réciter le vers à voix haute'
                      : 'Cliquez sur le micro ci-dessous puis récitez le vers à voix haute'}
              </p>
            )}
          </div>

          {state.recitation &&
            rawTranscript &&
            state.recitation !== rawTranscript.toLowerCase().trim() && (
              <p className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                Analysé après filtrage :{' '}
                <span className="font-medium text-indigo-700">{state.recitation}</span>
              </p>
            )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMicrophone}
            disabled={!isSupported}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs',
              isListening
                ? 'bg-red-100 hover:bg-red-200 text-red-700 ring-4 ring-red-50'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
            title={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
            aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
          >
            {isLoadingModel ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Chargement…
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-5 h-5" aria-hidden="true" />
                Arrêter l'écoute
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" aria-hidden="true" />
                Commencer la dictée
              </>
            )}
          </button>
        </div>
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
