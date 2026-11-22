import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type { InferenceDevice, WhisperModelVariant } from '../services/speech/types';

// Static web deployment: always fetch ONNX models from Hugging Face Hub and cache via Cache API
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_IDS: Record<WhisperModelVariant, string> = {
  base: 'onnx-community/whisper-base',
  small: 'onnx-community/whisper-small',
};

type WorkerRequest =
  | { type: 'load'; model: WhisperModelVariant }
  | {
      type: 'transcribe';
      audio: Float32Array;
      language: string;
      initialPrompt?: string;
    };

type WorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'ready'; device: InferenceDevice; model: WhisperModelVariant }
  | { type: 'result'; text: string; durationMs: number; audioSeconds: number }
  | {
      type: 'debug';
      level: 'info' | 'warn' | 'error';
      message: string;
      details?: Record<string, unknown>;
    }
  | { type: 'error'; message: string };

interface ProgressInfo {
  status?: string;
  progress?: number;
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedModel: WhisperModelVariant | null = null;
let activeDevice: InferenceDevice = 'wasm';

// Strict FIFO promise chain so ONNX sessions never overlap concurrently
let jobQueue: Promise<void> = Promise.resolve();

async function detectPreferredDevice(): Promise<InferenceDevice> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return 'wasm';
  }
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } })
      .gpu;
    const adapter = await gpu?.requestAdapter();
    return adapter ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

function handleModelProgress(info: ProgressInfo): void {
  if (typeof info.progress === 'number') {
    post({ type: 'progress', progress: Math.round(info.progress) });
  }
}

async function ensureLoaded(model: WhisperModelVariant): Promise<void> {
  if (transcriber && loadedModel === model) {
    post({
      type: 'debug',
      level: 'info',
      message: `Modèle Whisper (${model}) déjà en mémoire (${activeDevice})`,
    });
    post({ type: 'ready', device: activeDevice, model });
    return;
  }

  const preferredDevice = await detectPreferredDevice();
  const modelId = MODEL_IDS[model];
  const loadStart = performance.now();

  post({
    type: 'debug',
    level: 'info',
    message: `Chargement ${modelId} (backend préféré : ${preferredDevice})…`,
  });

  try {
    transcriber = await pipeline('automatic-speech-recognition', modelId, {
      device: preferredDevice,
      dtype:
        preferredDevice === 'webgpu'
          ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
          : 'q8',
      progress_callback: handleModelProgress,
    });
    activeDevice = preferredDevice;
    loadedModel = model;
    post({
      type: 'debug',
      level: 'info',
      message: `Modèle prêt en ${Math.round(performance.now() - loadStart)} ms (${activeDevice})`,
    });
    post({ type: 'ready', device: activeDevice, model });
  } catch (webgpuError) {
    if (preferredDevice === 'webgpu') {
      post({
        type: 'debug',
        level: 'warn',
        message: 'Échec WebGPU — bascule automatique sur WASM (q8)',
        details: {
          reason: webgpuError instanceof Error ? webgpuError.message : String(webgpuError),
        },
      });
      transcriber = await pipeline('automatic-speech-recognition', modelId, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: handleModelProgress,
      });
      activeDevice = 'wasm';
      loadedModel = model;
      post({
        type: 'debug',
        level: 'info',
        message: `Modèle prêt en fallback WASM (${Math.round(performance.now() - loadStart)} ms)`,
      });
      post({ type: 'ready', device: 'wasm', model });
      return;
    }
    throw webgpuError;
  }
}

async function processRequest(payload: WorkerRequest): Promise<void> {
  if (payload.type === 'load') {
    await ensureLoaded(payload.model);
    return;
  }

  if (payload.type === 'transcribe') {
    if (!transcriber) {
      await ensureLoaded(loadedModel ?? 'base');
    }
    if (!transcriber) {
      throw new Error('Whisper pipeline non initialisé.');
    }

    const audioSeconds = Number((payload.audio.length / 16000).toFixed(2));
    const startedAt = performance.now();

    post({
      type: 'debug',
      level: 'info',
      message: `Inférence Whisper démarrée (${audioSeconds}s audio, langue=${payload.language})`,
    });

    const output = await transcriber(payload.audio, {
      language: payload.language,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    const durationMs = Math.round(performance.now() - startedAt);
    const text = Array.isArray(output)
      ? output.map((chunk) => chunk.text).join(' ').trim()
      : output.text.trim();

    if (!text) {
      post({
        type: 'debug',
        level: 'warn',
        message: `Inférence terminée en ${durationMs} ms mais transcription vide (bruit ou voix trop faible)`,
      });
      return;
    }

    post({
      type: 'debug',
      level: 'info',
      message: `Inférence terminée en ${durationMs} ms → "${text}"`,
    });
    post({ type: 'result', text, durationMs, audioSeconds });
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  jobQueue = jobQueue
    .then(() => processRequest(payload))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      post({ type: 'error', message });
    });
});
