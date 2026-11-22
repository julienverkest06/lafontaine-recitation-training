import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhisperWebGPUEngine } from '../whisperWebGPUEngine';

type Listener = (event: unknown) => void;

class MockWorker {
  static latest: MockWorker | null = null;
  posted: unknown[] = [];
  terminated = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    MockWorker.latest = this;
  }

  addEventListener(type: string, cb: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(cb);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners.get(type)?.delete(cb);
  }

  postMessage(data: unknown) {
    this.posted.push(data);
  }

  terminate() {
    this.terminated = true;
  }

  emit(type: string, event: unknown) {
    for (const cb of this.listeners.get(type) ?? []) {
      cb(event);
    }
  }
}

describe('WhisperWebGPUEngine', () => {
  const originalWorker = globalThis.Worker;
  const originalAudioContext = globalThis.AudioContext;
  const originalAudioWorkletNode = globalThis.AudioWorkletNode;
  const originalMediaDevices = navigator.mediaDevices;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    MockWorker.latest = null;
    (globalThis as unknown as { Worker: unknown }).Worker = MockWorker;
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = class {
      state = 'running';
      sampleRate = 16000;
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createMediaStreamSource = () => ({ connect: vi.fn() });
      createGain = () => ({ gain: { value: 0 }, connect: vi.fn() });
      audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
    };
    (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = class {
      port = { addEventListener: vi.fn(), start: vi.fn() };
      connect = vi.fn();
      disconnect = vi.fn();
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [{ label: 'Virtual Mic', readyState: 'live', muted: false }],
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-worklet');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    (globalThis as unknown as { Worker: unknown }).Worker = originalWorker;
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode =
      originalAudioWorkletNode;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('charge le modèle, rapporte la progression, cumule les segments transcrits et réinitialise le buffer', async () => {
    const engine = new WhisperWebGPUEngine('base');
    const onTranscript = vi.fn();
    const onStatusChange = vi.fn();
    const onProgress = vi.fn();
    const onDeviceDetected = vi.fn();

    const startPromise = engine.start(
      { lang: 'fr-FR' },
      { onTranscript, onStatusChange, onProgress, onDeviceDetected }
    );

    const worker = MockWorker.latest!;
    expect(worker).not.toBeNull();
    expect(onStatusChange).toHaveBeenCalledWith('loading-model');

    worker.emit('message', { data: { type: 'progress', progress: 50 } });
    expect(onProgress).toHaveBeenCalledWith(50);

    worker.emit('message', { data: { type: 'ready', device: 'webgpu', model: 'base' } });
    await startPromise;

    expect(onDeviceDetected).toHaveBeenCalledWith('webgpu');
    expect(onStatusChange).toHaveBeenCalledWith('listening');

    // Reçoit deux segments consécutifs -> cumulés tant que le buffer n'est pas réinitialisé
    worker.emit('message', { data: { type: 'result', text: 'Maître Corbeau' } });
    worker.emit('message', { data: { type: 'result', text: 'sur un arbre perché' } });

    expect(onTranscript).toHaveBeenLastCalledWith({
      text: 'Maître Corbeau sur un arbre perché',
      alternatives: ['Maître Corbeau sur un arbre perché', 'sur un arbre perché'],
      isFinal: true,
    });

    engine.resetTranscriptBuffer();
    worker.emit('message', { data: { type: 'result', text: 'Tenait en son bec' } });
    expect(onTranscript).toHaveBeenLastCalledWith({
      text: 'Tenait en son bec',
      alternatives: ['Tenait en son bec', 'Tenait en son bec'],
      isFinal: true,
    });

    engine.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('ne reste pas bloqué en loading-model si le Web Worker échoue', async () => {
    const engine = new WhisperWebGPUEngine('base');
    const onStatusChange = vi.fn();

    const startPromise = engine.start(
      { lang: 'fr-FR' },
      { onTranscript: vi.fn(), onStatusChange }
    );

    MockWorker.latest!.emit('error', { message: 'Worker script failed to load' });
    await startPromise;

    expect(onStatusChange).toHaveBeenLastCalledWith('error', 'Worker script failed to load');
  });
});
