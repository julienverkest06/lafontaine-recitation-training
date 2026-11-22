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
  | { type: 'result'; text: string }
  | { type: 'error'; message: string };

interface ProgressInfo {
  status?: string;
  progress?: number;
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedModel: WhisperModelVariant | null = null;
let activeDevice: InferenceDevice = 'wasm';

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
    post({ type: 'ready', device: activeDevice, model });
    return;
  }

  const preferredDevice = await detectPreferredDevice();
  const modelId = MODEL_IDS[model];

  try {
    transcriber = await pipeline('automatic-speech-recognition', modelId, {
      device: preferredDevice,
      dtype: preferredDevice === 'webgpu'
        ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
        : 'q8',
      progress_callback: handleModelProgress,
    });
    activeDevice = preferredDevice;
    loadedModel = model;
    post({ type: 'ready', device: activeDevice, model });
  } catch (webgpuError) {
    if (preferredDevice === 'webgpu') {
      // Graceful fallback to CPU/WASM when WebGPU adapter fails
      transcriber = await pipeline('automatic-speech-recognition', modelId, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: handleModelProgress,
      });
      activeDevice = 'wasm';
      loadedModel = model;
      post({ type: 'ready', device: 'wasm', model });
      return;
    }
    throw webgpuError;
  }
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  try {
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

      const options: Record<string, unknown> = {
        language: payload.language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      };

      // Inject La Fontaine glossary prompt when supported by the tokenizer
      if (payload.initialPrompt && transcriber.tokenizer) {
        const promptIds = transcriber.tokenizer.encode(payload.initialPrompt, {
          add_special_tokens: false,
        });
        if (promptIds.length > 0) {
          options.prompt_ids = promptIds.slice(0, 200);
        }
      }

      const output = await transcriber(payload.audio, options);
      const text = Array.isArray(output)
        ? output.map((chunk) => chunk.text).join(' ').trim()
        : output.text.trim();

      if (text) {
        post({ type: 'result', text });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    post({ type: 'error', message });
  }
});
