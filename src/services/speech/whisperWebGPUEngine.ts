import { DEFAULT_VAD_THRESHOLD, MicrophoneSegmentRecorder } from './audioCapture';
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
  | { type: 'result'; text: string; durationMs?: number; audioSeconds?: number }
  | {
      type: 'debug';
      level: 'info' | 'warn' | 'error';
      message: string;
      details?: Record<string, unknown>;
    }
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
  private accumulatedSegments: string[] = [];
  private vadThreshold = DEFAULT_VAD_THRESHOLD;

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

  setVadThreshold(threshold: number): void {
    this.vadThreshold = threshold;
    this.recorder?.setEnergyThreshold(threshold);
  }

  flushAudioNow(): void {
    if (!this.recorder) return;
    const flushed = this.recorder.forceFlush();
    if (!flushed) {
      this.callbacks?.onDebugLog?.({
        level: 'warn',
        source: 'vad',
        message: 'Flush manuel ignoré : aucun audio en attente dans le buffer.',
      });
    }
  }

  resetTranscriptBuffer(): void {
    this.accumulatedSegments = [];
  }

  async start(
    options: SpeechStartOptions,
    callbacks: SpeechEngineCallbacks
  ): Promise<void> {
    if (!this.isSupported()) {
      const msg =
        "Votre navigateur ne supporte pas l'enregistrement audio ou les Web Workers.";
      callbacks.onDebugLog?.({ level: 'error', source: 'engine', message: msg });
      callbacks.onStatusChange('error', msg);
      return;
    }

    this.stop();
    this.isActive = true;
    this.accumulatedSegments = [];
    this.callbacks = callbacks;
    if (typeof options.vadThreshold === 'number') {
      this.vadThreshold = options.vadThreshold;
    }
    this.currentOptions = {
      ...options,
      lang: options.lang.toLowerCase().startsWith('fr') ? 'french' : options.lang,
    };

    // Create AudioContext SYNCHRONOUSLY inside the user click gesture before async model load
    // so autoplay policy does not leave it permanently suspended.
    let preWarmedContext: AudioContext | null = null;
    try {
      preWarmedContext = new AudioContext();
      if (preWarmedContext.state === 'suspended') {
        void preWarmedContext.resume();
      }
    } catch {
      preWarmedContext = null;
    }

    try {
      await this.ensureWorkerReady(callbacks);
      if (!this.isActive) {
        if (preWarmedContext) void preWarmedContext.close();
        return;
      }

      const recorder = new MicrophoneSegmentRecorder({
        energyThreshold: this.vadThreshold,
      });
      this.recorder = recorder;

      await recorder.start(
        {
          onSegment: (pcm16k) => {
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
          },
          onVoiceActivity: (isSpeech) => {
            if (!this.isActive) return;
            this.callbacks?.onAudioStateChange?.({
              micActive: true,
              soundDetected: isSpeech,
              speechDetected: isSpeech,
            });
          },
          onTelemetry: (telemetry) => {
            if (!this.isActive) return;
            this.callbacks?.onTelemetry?.(telemetry);
          },
          onDebugLog: (event) => {
            this.callbacks?.onDebugLog?.(event);
          },
        },
        preWarmedContext
      );

      callbacks.onStatusChange('listening');
      callbacks.onAudioStateChange?.({
        micActive: true,
        soundDetected: false,
        speechDetected: false,
      });
    } catch (error) {
      if (preWarmedContext && preWarmedContext.state !== 'closed') {
        void preWarmedContext.close();
      }
      this.stop();
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'initialiser Whisper local.";
      callbacks.onDebugLog?.({ level: 'error', source: 'whisper', message });
      callbacks.onStatusChange('error', message);
    }
  }

  private ensureWorkerReady(callbacks: SpeechEngineCallbacks): Promise<void> {
    if (this.worker && this.isModelReady) {
      return Promise.resolve();
    }

    callbacks.onStatusChange('loading-model');
    callbacks.onDebugLog?.({
      level: 'info',
      source: 'whisper',
      message: `Démarrage du Web Worker Whisper (modèle=${this.model})…`,
    });

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
          } else if (msg.type === 'debug') {
            this.callbacks?.onDebugLog?.({
              level: msg.level,
              source: 'whisper',
              message: msg.message,
              details: msg.details,
            });
          } else if (msg.type === 'result') {
            const cleanedSegment = msg.text.trim();
            if (!cleanedSegment) return;
            this.accumulatedSegments.push(cleanedSegment);
            const combined = this.accumulatedSegments.join(' ').trim();
            this.callbacks?.onTranscript({
              text: combined,
              alternatives: [combined, cleanedSegment],
              isFinal: true,
            });
          } else if (msg.type === 'error' && this.isModelReady) {
            this.callbacks?.onDebugLog?.({
              level: 'error',
              source: 'whisper',
              message: msg.message,
            });
            this.callbacks?.onStatusChange('error', msg.message);
          }
        });

        this.worker.addEventListener('error', (event: ErrorEvent) => {
          const message = event.message || 'Erreur fatale du Web Worker Whisper.';
          this.callbacks?.onDebugLog?.({
            level: 'error',
            source: 'whisper',
            message,
          });
          if (this.isModelReady) {
            this.callbacks?.onStatusChange('error', message);
          }
        });

        this.worker.addEventListener('messageerror', () => {
          const message = 'Erreur de désérialisation du message Web Worker.';
          this.callbacks?.onDebugLog?.({
            level: 'error',
            source: 'whisper',
            message,
          });
        });
      }

      const worker = this.worker;

      const handleLoadMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'ready') {
          this.isModelReady = true;
          callbacks.onDeviceDetected?.(msg.device);
          worker.removeEventListener('message', handleLoadMessage);
          worker.removeEventListener('error', handleLoadError);
          resolve();
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', handleLoadMessage);
          worker.removeEventListener('error', handleLoadError);
          reject(new Error(msg.message));
        }
      };

      const handleLoadError = (event: ErrorEvent) => {
        worker.removeEventListener('message', handleLoadMessage);
        worker.removeEventListener('error', handleLoadError);
        reject(new Error(event.message || 'Impossible de charger le Web Worker Whisper.'));
      };

      worker.addEventListener('message', handleLoadMessage);
      worker.addEventListener('error', handleLoadError);
      worker.postMessage({ type: 'load', model: this.model });
    });
  }

  stop(): void {
    const hadActiveRecorder = Boolean(this.recorder && this.isActive);
    this.isActive = false;
    if (this.recorder) {
      // Flush pending speech segment when user manually stops listening
      this.recorder.stop(hadActiveRecorder);
      this.recorder = null;
    }
    this.accumulatedSegments = [];
  }

  dispose(): void {
    this.isActive = false;
    if (this.recorder) {
      this.recorder.stop(false);
      this.recorder = null;
    }
    this.accumulatedSegments = [];
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isModelReady = false;
    }
  }
}
