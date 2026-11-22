import { describe, expect, it } from 'vitest';
import {
  SpeechSegmenter,
  TARGET_SAMPLE_RATE,
  computeRms,
  downsampleTo16kHz,
} from '../audioCapture';

describe('audioCapture DSP & VAD', () => {
  it('calcule correctement le RMS d’un signal silencieux vs actif', () => {
    const silence = new Float32Array(1600).fill(0);
    const tone = new Float32Array(1600).fill(0.2);

    expect(computeRms(silence)).toBe(0);
    expect(computeRms(tone)).toBeCloseTo(0.2, 5);
  });

  it('rééchantillonne de 48 kHz vers 16 kHz', () => {
    const input48k = new Float32Array(4800).fill(0.5);
    const output16k = downsampleTo16kHz(input48k, 48000);

    expect(output16k.length).toBe(1600);
    expect(output16k[0]).toBeCloseTo(0.5, 5);
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
});
