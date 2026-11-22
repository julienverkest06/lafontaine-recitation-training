import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VAD_THRESHOLD,
  SpeechSegmenter,
  TARGET_SAMPLE_RATE,
  computePeak,
  computeRms,
  downsampleTo16kHz,
} from '../audioCapture';

describe('audioCapture DSP & VAD', () => {
  it('calcule correctement le RMS et le peak d’un signal silencieux vs actif', () => {
    const silence = new Float32Array(1600).fill(0);
    const tone = new Float32Array(1600).fill(0.2);
    tone[10] = -0.75;

    expect(computeRms(silence)).toBe(0);
    expect(computePeak(silence)).toBe(0);
    expect(computeRms(tone)).toBeGreaterThan(0.2);
    expect(computePeak(tone)).toBeCloseTo(0.75, 5);
  });

  it('rééchantillonne de 48 kHz et 44,1 kHz vers 16 kHz', () => {
    const input48k = new Float32Array(4800).fill(0.5);
    const output16k = downsampleTo16kHz(input48k, 48000);
    expect(output16k.length).toBe(1600);
    expect(output16k[0]).toBeCloseTo(0.5, 5);

    const input44k = new Float32Array(4410).fill(0.25);
    const outputFrom44 = downsampleTo16kHz(input44k, 44100);
    expect(outputFrom44.length).toBe(1600);
    expect(outputFrom44[0]).toBeCloseTo(0.25, 5);
  });

  it('détecte un segment de parole suivi d’un silence et ignore les bruits trop courts', () => {
    const segmenter = new SpeechSegmenter({
      energyThreshold: 0.02,
      minSpeechDurationMs: 200,
      silenceDurationMs: 200,
    });

    const chunkSize = TARGET_SAMPLE_RATE * 0.1; // 100 ms
    const speech = new Float32Array(chunkSize).fill(0.1);
    const silence = new Float32Array(chunkSize).fill(0.001);

    // 100ms click -> too short, should be dropped after silence
    expect(segmenter.push(speech)).toBeNull();
    expect(segmenter.push(silence)).toBeNull();
    expect(segmenter.push(silence)).toBeNull();

    // 300ms speech + 200ms silence -> emits segment
    expect(segmenter.push(speech)).toBeNull();
    expect(segmenter.push(speech)).toBeNull();
    expect(segmenter.push(speech)).toBeNull();
    expect(segmenter.push(silence)).toBeNull();
    const emitted = segmenter.push(silence);

    expect(emitted).not.toBeNull();
    expect(emitted!.length).toBeGreaterThanOrEqual(chunkSize * 5);
  });

  it('permet d’ajuster dynamiquement le seuil VAD et de forcer un flush manuel', () => {
    const segmenter = new SpeechSegmenter();
    expect(segmenter.getEnergyThreshold()).toBe(DEFAULT_VAD_THRESHOLD);

    segmenter.setEnergyThreshold(0.002);
    expect(segmenter.getEnergyThreshold()).toBe(0.002);

    const softVoice = new Float32Array(1600).fill(0.004);
    expect(segmenter.push(softVoice)).toBeNull();

    const flushed = segmenter.flush();
    expect(flushed).not.toBeNull();
    expect(flushed!.length).toBe(1600);
    expect(segmenter.flush()).toBeNull();
  });

  it('reprend automatiquement un AudioContext suspendu au démarrage', async () => {
    const resumeSpy = vi.fn().mockResolvedValue(undefined);
    const closeSpy = vi.fn().mockResolvedValue(undefined);
    const stopTrackSpy = vi.fn();

    const originalMediaDevices = navigator.mediaDevices;
    const originalAudioWorkletNode = globalThis.AudioWorkletNode;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [
            { label: 'Test Mic', readyState: 'live', muted: false, stop: stopTrackSpy },
          ],
          getTracks: () => [{ stop: stopTrackSpy }],
        }),
      },
    });

    const mockContext = {
      state: 'suspended',
      sampleRate: 48000,
      destination: {},
      resume: resumeSpy,
      close: closeSpy,
      createMediaStreamSource: () => ({ connect: vi.fn() }),
      createGain: () => ({ gain: { value: 0 }, connect: vi.fn() }),
      audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
    } as unknown as AudioContext;

    class MockWorkletNode {
      port = {
        addEventListener: vi.fn(),
        start: vi.fn(),
      };
      connect = vi.fn();
      disconnect = vi.fn();
    }

    (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = MockWorkletNode;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();

    try {
      const { MicrophoneSegmentRecorder } = await import('../audioCapture');
      const recorder = new MicrophoneSegmentRecorder();
      await recorder.start({ onSegment: vi.fn() }, mockContext);

      expect(resumeSpy).toHaveBeenCalledTimes(1);

      recorder.stop();
      expect(stopTrackSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
      });
      (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode =
        originalAudioWorkletNode;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
