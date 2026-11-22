export type SpeechEngineId = 'web-speech' | 'whisper-webgpu';

export type SpeechEngineStatus = 'idle' | 'loading-model' | 'listening' | 'error';

export type WhisperModelVariant = 'base' | 'small';

export type InferenceDevice = 'webgpu' | 'wasm';

export interface SpeechAudioState {
  micActive: boolean;
  soundDetected: boolean;
  speechDetected: boolean;
}

export interface VoiceTelemetry {
  rms: number;
  peak: number;
  threshold: number;
  isVoice: boolean;
  sampleRate: number;
  contextState: string;
  segmentsEmitted: number;
}

export interface EngineDebugLogEvent {
  level: 'info' | 'warn' | 'error';
  source: 'engine' | 'audio' | 'vad' | 'whisper';
  message: string;
  details?: Record<string, unknown>;
}

export interface TranscriptEvent {
  text: string;
  alternatives: string[];
  isFinal: boolean;
  confidence?: number;
}

export interface SpeechStartOptions {
  lang: string;
  vocabularyHints?: string[];
  contextVerses?: string[];
  initialPrompt?: string;
  vadThreshold?: number;
}

export interface SpeechEngineCallbacks {
  onTranscript: (event: TranscriptEvent) => void;
  onStatusChange: (status: SpeechEngineStatus, error?: string) => void;
  onAudioStateChange?: (state: SpeechAudioState) => void;
  onTelemetry?: (telemetry: VoiceTelemetry) => void;
  onDebugLog?: (event: EngineDebugLogEvent) => void;
  onProgress?: (progress: number) => void;
  onDeviceDetected?: (device: InferenceDevice) => void;
}

export interface SpeechEngine {
  readonly id: SpeechEngineId;
  readonly label: string;
  isSupported(): boolean;
  start(options: SpeechStartOptions, callbacks: SpeechEngineCallbacks): Promise<void> | void;
  updateContext?(options: Partial<SpeechStartOptions>): void;
  setVadThreshold?(threshold: number): void;
  flushAudioNow?(): void;
  resetTranscriptBuffer?(): void;
  stop(): void;
  dispose(): void;
}
