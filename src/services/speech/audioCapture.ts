export const TARGET_SAMPLE_RATE = 16000;

export interface VadOptions {
  /** RMS amplitude threshold above which audio is considered speech (0..1). */
  energyThreshold?: number;
  /** Silence duration (ms) after speech before emitting the completed segment. */
  silenceDurationMs?: number;
  /** Minimum speech duration (ms) required to emit a segment (filters clicks/coughs). */
  minSpeechDurationMs?: number;
  /** Maximum segment duration (ms) before forcing emission during long continuous recitation. */
  maxSegmentDurationMs?: number;
}

const DEFAULT_VAD: Required<VadOptions> = {
  energyThreshold: 0.015,
  silenceDurationMs: 750,
  minSpeechDurationMs: 350,
  maxSegmentDurationMs: 12000,
};

/**
 * Computes Root Mean Square (RMS) energy of an audio chunk.
 */
export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Linearly downsamples a mono PCM buffer to 16 kHz for Whisper input.
 */
export function downsampleTo16kHz(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (inputSampleRate === TARGET_SAMPLE_RATE || input.length === 0) {
    return input;
  }

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count += 1;
    }
    output[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
  }

  return output;
}

/**
 * Concatenates multiple Float32Array chunks into one contiguous buffer.
 */
export function concatFloat32Arrays(chunks: Float32Array[]): Float32Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/**
 * Stateful energy-based VAD segmenter operating on 16 kHz PCM frames.
 * Pure TypeScript (no DOM dependencies) so it can be unit-tested deterministically.
 */
export class SpeechSegmenter {
  private readonly options: Required<VadOptions>;
  private preRollChunks: Float32Array[] = [];
  private activeChunks: Float32Array[] = [];
  private isSpeaking = false;
  private speechSamples = 0;
  private silenceSamples = 0;
  private readonly preRollMaxChunks = 3;

  constructor(options: VadOptions = {}) {
    this.options = { ...DEFAULT_VAD, ...options };
  }

  /**
   * Feeds a 16 kHz mono chunk and returns a complete speech segment when
   * silence follows speech or when the max duration is reached.
   */
  push(chunk16k: Float32Array): Float32Array | null {
    const rms = computeRms(chunk16k);
    const isVoice = rms >= this.options.energyThreshold;
    const minSpeechSamples = (this.options.minSpeechDurationMs / 1000) * TARGET_SAMPLE_RATE;
    const maxSilenceSamples = (this.options.silenceDurationMs / 1000) * TARGET_SAMPLE_RATE;
    const maxSegmentSamples = (this.options.maxSegmentDurationMs / 1000) * TARGET_SAMPLE_RATE;

    if (isVoice) {
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.activeChunks = [...this.preRollChunks];
        this.preRollChunks = [];
      }
      this.activeChunks.push(chunk16k);
      this.speechSamples += chunk16k.length;
      this.silenceSamples = 0;

      if (this.speechSamples >= maxSegmentSamples) {
        return this.flush();
      }
      return null;
    }

    if (this.isSpeaking) {
      this.activeChunks.push(chunk16k);
      this.silenceSamples += chunk16k.length;

      if (this.silenceSamples >= maxSilenceSamples) {
        if (this.speechSamples >= minSpeechSamples) {
          return this.flush();
        }
        this.reset();
      }
      return null;
    }

    // Maintain a short pre-roll ring buffer so initial consonants aren't clipped
    this.preRollChunks.push(chunk16k);
    if (this.preRollChunks.length > this.preRollMaxChunks) {
      this.preRollChunks.shift();
    }
    return null;
  }

  flush(): Float32Array | null {
    if (this.activeChunks.length === 0) return null;
    const segment = concatFloat32Arrays(this.activeChunks);
    this.reset();
    return segment;
  }

  reset(): void {
    this.activeChunks = [];
    this.preRollChunks = [];
    this.isSpeaking = false;
    this.speechSamples = 0;
    this.silenceSamples = 0;
  }
}

const WORKLET_PROCESSOR_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

export class MicrophoneSegmentRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletUrl: string | null = null;
  private readonly segmenter: SpeechSegmenter;
  private readonly vadThreshold: number;

  constructor(vadOptions?: VadOptions) {
    this.segmenter = new SpeechSegmenter(vadOptions);
    this.vadThreshold = vadOptions?.energyThreshold ?? DEFAULT_VAD.energyThreshold;
  }

  async start(
    onSegment: (pcm16k: Float32Array) => void,
    onVoiceActivity?: (isSpeech: boolean) => void
  ): Promise<void> {
    this.stop();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    const blob = new Blob([WORKLET_PROCESSOR_SOURCE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(workletUrl);

    const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor');
    let lastSpeechFlag = false;
    workletNode.port.addEventListener('message', (event: MessageEvent<Float32Array>) => {
      const pcm16k = downsampleTo16kHz(event.data, audioContext.sampleRate);
      const isVoice = computeRms(pcm16k) >= (this.vadThreshold);
      if (isVoice !== lastSpeechFlag) {
        lastSpeechFlag = isVoice;
        onVoiceActivity?.(isVoice);
      }
      const segment = this.segmenter.push(pcm16k);
      if (segment) {
        onSegment(segment);
      }
    });
    workletNode.port.start();

    source.connect(workletNode);
    // Keep graph active without echoing microphone audio to speakers
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioContext.destination);

    this.stream = stream;
    this.audioContext = audioContext;
    this.workletNode = workletNode;
    this.workletUrl = workletUrl;
  }

  stop(): void {
    this.segmenter.reset();

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.workletUrl) {
      URL.revokeObjectURL(this.workletUrl);
      this.workletUrl = null;
    }
  }
}
