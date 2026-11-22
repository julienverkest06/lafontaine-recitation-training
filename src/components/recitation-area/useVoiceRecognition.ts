import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
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

export function useVoiceRecognition({
  onTranscript,
  startOptions,
  engine: customEngine,
}: UseVoiceRecognitionOptions) {
  const engine = useMemo(() => customEngine ?? new WebSpeechEngine(), [customEngine]);
  const [status, setStatus] = useState<SpeechEngineStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);

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
  }, [engine]);

  const toggleMicrophone = useCallback(() => {
    if (!engine.isSupported()) {
      setErrorMessage("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      setStatus('error');
      return;
    }

    if (status === 'listening' || status === 'loading-model') {
      engine.stop();
      setStatus('idle');
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
        },
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
    engineLabel: engine.label,
    toggleMicrophone,
    stopListening,
  };
}
