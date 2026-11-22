export type SpeechEngineId = 'web-speech' | 'whisper-webgpu';

export type SpeechEngineStatus = 'idle' | 'loading-model' | 'listening' | 'error';

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

export interface SpeechEngine {
  readonly id: SpeechEngineId;
  readonly label: string;
  isSupported(): boolean;
  start(
    options: SpeechStartOptions,
    callbacks: {
      onTranscript: (event: TranscriptEvent) => void;
      onStatusChange: (status: SpeechEngineStatus, error?: string) => void;
      onProgress?: (progress: number) => void;
    }
  ): Promise<void> | void;
  stop(): void;
  dispose(): void;
}
