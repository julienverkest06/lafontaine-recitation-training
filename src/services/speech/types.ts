export type SpeechEngineId = 'web-speech' | 'whisper-webgpu';

export type SpeechEngineStatus = 'idle' | 'loading-model' | 'listening' | 'error';

export type WhisperModelVariant = 'base' | 'small';

export type InferenceDevice = 'webgpu' | 'wasm';

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
}

export interface SpeechEngineCallbacks {
  onTranscript: (event: TranscriptEvent) => void;
  onStatusChange: (status: SpeechEngineStatus, error?: string) => void;
  onProgress?: (progress: number) => void;
  onDeviceDetected?: (device: InferenceDevice) => void;
}

export interface SpeechEngine {
  readonly id: SpeechEngineId;
  readonly label: string;
  isSupported(): boolean;
  start(
    options: SpeechStartOptions,
    callbacks: SpeechEngineCallbacks
  ): Promise<void> | void;
  updateContext?(options: Partial<SpeechStartOptions>): void;
  stop(): void;
  dispose(): void;
}
