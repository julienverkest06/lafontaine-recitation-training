import type {
  InferenceDevice,
  SpeechAudioState,
  SpeechEngineId,
  SpeechEngineStatus,
  VoiceTelemetry,
} from '../services/speech/types';

export type DebugLogLevel = 'info' | 'warn' | 'error';

export type DebugLogSource =
  | 'engine'
  | 'audio'
  | 'vad'
  | 'whisper'
  | 'cleaner'
  | 'aligner'
  | 'ui';

export interface VoiceDebugEntry {
  id: number;
  timestamp: string;
  level: DebugLogLevel;
  source: DebugLogSource;
  message: string;
  details?: Record<string, unknown>;
}

export interface VoiceEnvironmentDiagnostics {
  isSecureContext: boolean;
  hasSpeechRecognition: boolean;
  hasWebkitSpeechRecognition: boolean;
  hasGetUserMedia: boolean;
  hasAudioContext: boolean;
  hasAudioWorklet: boolean;
  hasWorker: boolean;
  hasWebGPU: boolean;
  userAgent: string;
}

export const MAX_DEBUG_ENTRIES = 100;

let nextEntryId = 1;

function padNumber(n: number, len: number = 2): string {
  return String(n).padStart(len, '0');
}

export function formatDebugTimestamp(date: Date = new Date()): string {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(
    date.getSeconds()
  )}.${padNumber(date.getMilliseconds(), 3)}`;
}

export function createDebugEntry(
  level: DebugLogLevel,
  source: DebugLogSource,
  message: string,
  details?: Record<string, unknown>
): VoiceDebugEntry {
  return {
    id: nextEntryId++,
    timestamp: formatDebugTimestamp(),
    level,
    source,
    message,
    details,
  };
}

export function appendDebugEntry(
  logs: VoiceDebugEntry[],
  entry: VoiceDebugEntry,
  maxEntries: number = MAX_DEBUG_ENTRIES
): VoiceDebugEntry[] {
  const updated = [...logs, entry];
  if (updated.length <= maxEntries) return updated;
  return updated.slice(updated.length - maxEntries);
}

export function collectVoiceEnvironmentDiagnostics(): VoiceEnvironmentDiagnostics {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isSecureContext: false,
      hasSpeechRecognition: false,
      hasWebkitSpeechRecognition: false,
      hasGetUserMedia: false,
      hasAudioContext: false,
      hasAudioWorklet: false,
      hasWorker: false,
      hasWebGPU: false,
      userAgent: 'non-browser',
    };
  }

  const AudioCtx = window.AudioContext;

  return {
    isSecureContext: Boolean(window.isSecureContext),
    hasSpeechRecognition: Boolean(window.SpeechRecognition),
    hasWebkitSpeechRecognition: Boolean(window.webkitSpeechRecognition),
    hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    hasAudioContext: typeof AudioCtx !== 'undefined',
    hasAudioWorklet: typeof AudioWorkletNode !== 'undefined',
    hasWorker: typeof Worker !== 'undefined',
    hasWebGPU: 'gpu' in navigator,
    userAgent: navigator.userAgent,
  };
}

export function isDebugEnabledInUrl(search: string, hash: string): boolean {
  const combined = `${search}&${hash.split('?')[1] ?? ''}`;
  const params = new URLSearchParams(combined.replace(/^\?/, ''));
  const value = params.get('debug');
  return value === 'voice' || value === '1' || value === 'true';
}

export function buildDebugReportJson(payload: {
  poemTitle: string;
  currentLineIndex: number;
  targetLine: string;
  engineId: SpeechEngineId;
  status: SpeechEngineStatus;
  inferenceDevice: InferenceDevice | null;
  errorMessage: string | null;
  audioState: SpeechAudioState;
  telemetry: VoiceTelemetry | null;
  diagnostics: VoiceEnvironmentDiagnostics;
  logs: VoiceDebugEntry[];
}): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ...payload,
    },
    null,
    2
  );
}
