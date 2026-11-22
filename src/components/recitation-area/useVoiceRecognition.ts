import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SpeechAudioState,
  SpeechEngine,
  SpeechEngineStatus,
  SpeechStartOptions,
  TranscriptEvent,
} from '../../services/speech/types';
import { WebSpeechEngine } from '../../services/speech/webSpeechEngine';

interface UseVoiceRecognitionOptions {
  onTranscript: (event: TranscriptEvent) => void;
  startOptions?: Omit<SpeechStartOptions, 'lang'>;
  engine?: SpeechEngine;
}

const IDLE_AUDIO_STATE: SpeechAudioState = {
  micActive: false,
  soundDetected: false,
  speechDetected: false,
};

export function useVoiceRecognition({
  onTranscript,
  startOptions,
  engine: customEngine,
}: UseVoiceRecognitionOptions) {
  const engine = useMemo(() => customEngine ?? new WebSpeechEngine(), [customEngine]);
  const [status, setStatus] = useState<SpeechEngineStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [audioState, setAudioState] = useState<SpeechAudioState>(IDLE_AUDIO_STATE);

  const onTranscriptRef = useRef(onTranscript);
  const startOptionsRef = useRef(startOptions);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    startOptionsRef.current = startOptions;
  }, [startOptions]);

  useEffect(() => {
    return () => {
      engine.dispose();
    };
  }, [engine]);

  const isListening = status === 'listening';
  const isSupported = engine.isSupported();

  const stopListening = useCallback(() => {
    engine.stop();
    setStatus('idle');
    setAudioState(IDLE_AUDIO_STATE);
  }, [engine]);

  const resetTranscriptBuffer = useCallback(() => {
    engine.resetTranscriptBuffer?.();
  }, [engine]);

  const toggleMicrophone = useCallback(() => {
    if (!engine.isSupported()) {
      setErrorMessage(
        "La reconnaissance vocale Web Speech n'est pas supportée par votre navigateur."
      );
      setStatus('error');
      return;
    }

    if (status === 'listening' || status === 'loading-model') {
      engine.stop();
      setStatus('idle');
      setAudioState(IDLE_AUDIO_STATE);
      return;
    }

    setErrorMessage(null);
    void engine.start(
      {
        lang: 'fr-FR',
        ...startOptionsRef.current,
      },
      {
        onTranscript: (event) => onTranscriptRef.current(event),
        onStatusChange: (nextStatus, err) => {
          setStatus(nextStatus);
          if (err) setErrorMessage(err);
          if (nextStatus === 'listening') setModelProgress(null);
          if (nextStatus !== 'listening') setAudioState(IDLE_AUDIO_STATE);
        },
        onAudioStateChange: (nextAudioState) => setAudioState(nextAudioState),
        onProgress: (progress) => setModelProgress(progress),
      }
    );
  }, [engine, status]);

  return {
    isListening,
    isSupported,
    status,
    errorMessage,
    modelProgress,
    audioState,
    engineLabel: engine.label,
    toggleMicrophone,
    stopListening,
    resetTranscriptBuffer,
  };
}
