import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InferenceDevice,
  SpeechEngine,
  SpeechEngineId,
  SpeechEngineStatus,
  SpeechStartOptions,
  TranscriptEvent,
  WhisperModelVariant,
} from '../../services/speech/types';
import { WebSpeechEngine } from '../../services/speech/webSpeechEngine';
import { WhisperWebGPUEngine } from '../../services/speech/whisperWebGPUEngine';

interface UseVoiceRecognitionOptions {
  onTranscript: (event: TranscriptEvent) => void;
  startOptions?: Omit<SpeechStartOptions, 'lang'>;
  engineId?: SpeechEngineId;
  whisperModel?: WhisperModelVariant;
  engine?: SpeechEngine;
}

export function useVoiceRecognition({
  onTranscript,
  startOptions,
  engineId = 'web-speech',
  whisperModel = 'base',
  engine: customEngine,
}: UseVoiceRecognitionOptions) {
  const engine = useMemo<SpeechEngine>(() => {
    if (customEngine) return customEngine;
    if (engineId === 'whisper-webgpu') {
      return new WhisperWebGPUEngine(whisperModel);
    }
    return new WebSpeechEngine();
  }, [customEngine, engineId, whisperModel]);

  const [status, setStatus] = useState<SpeechEngineStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [inferenceDevice, setInferenceDevice] = useState<InferenceDevice | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const startOptionsRef = useRef(startOptions);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    startOptionsRef.current = startOptions;
    if (startOptions) {
      engine.updateContext?.(startOptions);
    }
  }, [engine, startOptions]);

  useEffect(() => {
    return () => {
      engine.dispose();
    };
  }, [engine]);

  const isListening = status === 'listening';
  const isLoadingModel = status === 'loading-model';
  const isSupported = engine.isSupported();

  const stopListening = useCallback(() => {
    engine.stop();
    setStatus('idle');
    setModelProgress(null);
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
      setModelProgress(null);
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
        onDeviceDetected: (device) => setInferenceDevice(device),
      }
    );
  }, [engine, status]);

  return {
    isListening,
    isLoadingModel,
    isSupported,
    status,
    errorMessage,
    modelProgress,
    inferenceDevice,
    engineLabel: engine.label,
    toggleMicrophone,
    stopListening,
  };
}
