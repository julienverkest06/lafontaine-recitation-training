import { MicrophoneSegmentRecorder } from './audioCapture';
import type {
  InferenceDevice,
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechStartOptions,
  WhisperModelVariant,
} from './types';

type WorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'ready'; device: InferenceDevice; model: WhisperModelVariant }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string };

export class WhisperWebGPUEngine implements SpeechEngine {
  readonly id = 'whisper-webgpu' as const;
  private readonly model: WhisperModelVariant;
  private worker: Worker | null = null;
  private recorder: MicrophoneSegmentRecorder | null = null;
  private currentOptions: SpeechStartOptions = { lang: 'french' };
  private callbacks: SpeechEngineCallbacks | null = null;
  private isModelReady = false;
  private isActive = false;

  constructor(model: WhisperModelVariant = 'base') {
    this.model = model;
  }

  get label(): string {
    return this.model === 'small'
      ? 'Whisper Small Local (IA)'
      : 'Whisper Base Local (IA)';
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof AudioContext !== 'undefined'
    );
  }

  updateContext(options: Partial<SpeechStartOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
  }

  async start(
    options: SpeechStartOptions,
    callbacks: SpeechEngineCallbacks
  ): Promise<void> {
    if (!this.isSupported()) {
      callbacks.onStatusChange(
        'error',
        "Votre navigateur ne supporte pas l'enregistrement audio ou les Web Workers."
      );
      return;
    }

    this.stop();
    this.isActive = true;
    this.callbacks = callbacks;
    this.currentOptions = {
      ...options,
      lang: options.lang.toLowerCase().startsWith('fr') ? 'french' : options.lang,
    };

    try {
      await this.ensureWorkerReady(callbacks);
      if (!this.isActive) return;

      const recorder = new MicrophoneSegmentRecorder();
      this.recorder = recorder;

      await recorder.start((pcm16k) => {
        if (!this.isActive || !this.worker) return;
        this.worker.postMessage(
          {
            type: 'transcribe',
            audio: pcm16k,
            language: this.currentOptions.lang,
            initialPrompt: this.currentOptions.initialPrompt,
          },
          [pcm16k.buffer]
        );
      });

      callbacks.onStatusChange('listening');
    } catch (error) {
      this.stop();
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'initialiser Whisper local.";
      callbacks.onStatusChange('error', message);
    }
  }

  private ensureWorkerReady(callbacks: SpeechEngineCallbacks): Promise<void> {
    if (this.worker && this.isModelReady) {
      return Promise.resolve();
    }

    callbacks.onStatusChange('loading-model');

    return new Promise<void>((resolve, reject) => {
      if (!this.worker) {
        this.worker = new Worker(
          new URL('../../workers/whisper.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'progress') {
            this.callbacks?.onProgress?.(msg.progress);
          } else if (msg.type === 'result') {
            this.callbacks?.onTranscript({
              text: msg.text,
              alternatives: [msg.text],
              isFinal: true,
            });
          } else if (msg.type === 'error' && this.isModelReady) {
            this.callbacks?.onStatusChange('error', msg.message);
          }
        });
      }

      const worker = this.worker;

      const handleLoadMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'ready') {
          this.isModelReady = true;
          callbacks.onDeviceDetected?.(msg.device);
          worker.removeEventListener('message', handleLoadMessage);
          resolve();
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', handleLoadMessage);
          reject(new Error(msg.message));
        }
      };

      worker.addEventListener('message', handleLoadMessage);
      worker.postMessage({ type: 'load', model: this.model });
    });
  }

  stop(): void {
    this.isActive = false;
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  dispose(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isModelReady = false;
    }
  }
}
