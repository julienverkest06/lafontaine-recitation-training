import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EngineDebugLogEvent,
  InferenceDevice,
  SpeechAudioState,
  SpeechEngine,
  SpeechEngineId,
  SpeechEngineStatus,
  SpeechStartOptions,
  TranscriptEvent,
  VoiceTelemetry,
  WhisperModelVariant,
} from '../../services/speech/types';
import { WebSpeechEngine } from '../../services/speech/webSpeechEngine';
import { WhisperWebGPUEngine } from '../../services/speech/whisperWebGPUEngine';

interface UseVoiceRecognitionOptions {
  onTranscript: (event: TranscriptEvent) => void;
  onDebugLog?: (event: EngineDebugLogEvent) => void;
  startOptions?: Omit<SpeechStartOptions, 'lang'>;
  engineId?: SpeechEngineId;
  whisperModel?: WhisperModelVariant;
  engine?: SpeechEngine;
}

const IDLE_AUDIO_STATE: SpeechAudioState = {
  micActive: false,
  soundDetected: false,
  speechDetected: false,
};

export function useVoiceRecognition({
  onTranscript,
  onDebugLog,
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
  const [audioState, setAudioState] = useState<SpeechAudioState>(IDLE_AUDIO_STATE);
  const [telemetry, setTelemetry] = useState<VoiceTelemetry | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onDebugLogRef = useRef(onDebugLog);
  const startOptionsRef = useRef(startOptions);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onDebugLogRef.current = onDebugLog;
  }, [onDebugLog]);

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
    setAudioState(IDLE_AUDIO_STATE);
    setTelemetry(null);
  }, [engine]);

  const resetTranscriptBuffer = useCallback(() => {
    engine.resetTranscriptBuffer?.();
  }, [engine]);

  const setVadThreshold = useCallback(
    (threshold: number) => {
      engine.setVadThreshold?.(threshold);
    },
    [engine]
  );

  const flushAudioNow = useCallback(() => {
    engine.flushAudioNow?.();
  }, [engine]);

  const toggleMicrophone = useCallback(() => {
    if (!engine.isSupported()) {
      const msg = "La reconnaissance vocale n'est pas supportée par votre navigateur.";
      setErrorMessage(msg);
      setStatus('error');
      onDebugLogRef.current?.({ level: 'error', source: 'engine', message: msg });
      return;
    }

    if (status === 'listening' || status === 'loading-model') {
      engine.stop();
      setStatus('idle');
      setModelProgress(null);
      setAudioState(IDLE_AUDIO_STATE);
      setTelemetry(null);
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
          if (nextStatus !== 'listening') {
            setAudioState(IDLE_AUDIO_STATE);
            setTelemetry(null);
          }
        },
        onAudioStateChange: (nextAudioState) => setAudioState(nextAudioState),
        onTelemetry: (nextTelemetry) => setTelemetry(nextTelemetry),
        onDebugLog: (event) => onDebugLogRef.current?.(event),
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
    audioState,
    telemetry,
    engineLabel: engine.label,
    toggleMicrophone,
    stopListening,
    resetTranscriptBuffer,
    setVadThreshold,
    flushAudioNow,
  };
}
