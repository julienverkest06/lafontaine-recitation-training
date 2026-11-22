import type { EngineDebugLogEvent, VoiceTelemetry } from './types';

export const TARGET_SAMPLE_RATE = 16000;
export const DEFAULT_VAD_THRESHOLD = 0.006;

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
  energyThreshold: DEFAULT_VAD_THRESHOLD,
  silenceDurationMs: 750,
  minSpeechDurationMs: 300,
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
 * Computes peak absolute amplitude of an audio chunk.
 */
export function computePeak(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
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
  private options: Required<VadOptions>;
  private preRollChunks: Float32Array[] = [];
  private activeChunks: Float32Array[] = [];
  private isSpeaking = false;
  private speechSamples = 0;
  private silenceSamples = 0;
  // ~8 chunks of ~42ms = ~340ms pre-roll so initial consonants aren't clipped
  private readonly preRollMaxChunks = 8;

  constructor(options: VadOptions = {}) {
    this.options = { ...DEFAULT_VAD, ...options };
  }

  getEnergyThreshold(): number {
    return this.options.energyThreshold;
  }

  setEnergyThreshold(threshold: number): void {
    this.options = {
      ...this.options,
      energyThreshold: Math.max(0.0005, Math.min(0.2, threshold)),
    };
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

/**
 * Buffers ~2048 samples (~42 ms at 48 kHz) inside the AudioWorklet thread
 * before posting to the main thread for stable RMS estimation and low overhead.
 */
const WORKLET_PROCESSOR_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      const channel = input[0];
      let readOffset = 0;
      while (readOffset < channel.length) {
        const remaining = this.bufferSize - this.offset;
        const toCopy = Math.min(remaining, channel.length - readOffset);
        this.buffer.set(channel.subarray(readOffset, readOffset + toCopy), this.offset);
        this.offset += toCopy;
        readOffset += toCopy;
        if (this.offset >= this.bufferSize) {
          this.port.postMessage(this.buffer.slice());
          this.offset = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

export interface RecorderCallbacks {
  onSegment: (pcm16k: Float32Array) => void;
  onVoiceActivity?: (isSpeech: boolean) => void;
  onTelemetry?: (telemetry: VoiceTelemetry) => void;
  onDebugLog?: (event: EngineDebugLogEvent) => void;
}

export class MicrophoneSegmentRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletUrl: string | null = null;
  private readonly segmenter: SpeechSegmenter;
  private segmentsEmitted = 0;
  private onSegmentRef: ((pcm16k: Float32Array) => void) | null = null;
  private onDebugLogRef: ((event: EngineDebugLogEvent) => void) | null = null;

  constructor(vadOptions?: VadOptions) {
    this.segmenter = new SpeechSegmenter(vadOptions);
  }

  setEnergyThreshold(threshold: number): void {
    this.segmenter.setEnergyThreshold(threshold);
    this.onDebugLogRef?.({
      level: 'info',
      source: 'vad',
      message: `Seuil VAD ajusté à ${this.segmenter.getEnergyThreshold().toFixed(4)}`,
    });
  }

  forceFlush(): boolean {
    const segment = this.segmenter.flush();
    if (!segment || !this.onSegmentRef) return false;
    this.segmentsEmitted += 1;
    const durationSec = (segment.length / TARGET_SAMPLE_RATE).toFixed(2);
    this.onDebugLogRef?.({
      level: 'info',
      source: 'vad',
      message: `Flush manuel déclenché (${durationSec}s, ${segment.length} éch.)`,
    });
    this.onSegmentRef(segment);
    return true;
  }

  async start(
    callbacks: RecorderCallbacks,
    existingContext?: AudioContext | null
  ): Promise<void> {
    this.stop();
    this.segmentsEmitted = 0;
    this.onSegmentRef = callbacks.onSegment;
    this.onDebugLogRef = callbacks.onDebugLog ?? null;

    callbacks.onDebugLog?.({
      level: 'info',
      source: 'audio',
      message: 'Demande d’accès au microphone (getUserMedia)…',
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioTrack = stream.getAudioTracks()[0];
    callbacks.onDebugLog?.({
      level: 'info',
      source: 'audio',
      message: `Microphone ouvert : ${audioTrack?.label || 'Micro par défaut'}`,
      details: {
        readyState: audioTrack?.readyState,
        muted: audioTrack?.muted,
        settings: audioTrack?.getSettings?.(),
      },
    });

    const audioContext = existingContext ?? new AudioContext();
    if (audioContext.state === 'suspended') {
      callbacks.onDebugLog?.({
        level: 'warn',
        source: 'audio',
        message: 'AudioContext suspendu — reprise explicite via resume()…',
      });
      await audioContext.resume();
    }

    callbacks.onDebugLog?.({
      level: 'info',
      source: 'audio',
      message: `AudioContext prêt (${audioContext.state}, ${audioContext.sampleRate} Hz → 16000 Hz)`,
    });

    const source = audioContext.createMediaStreamSource(stream);

    const blob = new Blob([WORKLET_PROCESSOR_SOURCE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(workletUrl);

    const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor');
    let lastSpeechFlag = false;
    let lastTelemetryTime = 0;

    workletNode.port.addEventListener('message', (event: MessageEvent<Float32Array>) => {
      const pcm16k = downsampleTo16kHz(event.data, audioContext.sampleRate);
      const rms = computeRms(pcm16k);
      const peak = computePeak(pcm16k);
      const threshold = this.segmenter.getEnergyThreshold();
      const isVoice = rms >= threshold;

      if (isVoice !== lastSpeechFlag) {
        lastSpeechFlag = isVoice;
        callbacks.onVoiceActivity?.(isVoice);
      }

      const now = performance.now();
      if (now - lastTelemetryTime >= 100) {
        lastTelemetryTime = now;
        callbacks.onTelemetry?.({
          rms,
          peak,
          threshold,
          isVoice,
          sampleRate: audioContext.sampleRate,
          contextState: audioContext.state,
          segmentsEmitted: this.segmentsEmitted,
        });
      }

      const segment = this.segmenter.push(pcm16k);
      if (segment) {
        this.segmentsEmitted += 1;
        const durationSec = (segment.length / TARGET_SAMPLE_RATE).toFixed(2);
        callbacks.onDebugLog?.({
          level: 'info',
          source: 'vad',
          message: `Segment vocal détecté (${durationSec}s, RMS=${rms.toFixed(4)}) → envoi au worker`,
        });
        callbacks.onSegment(segment);
      }
    });
    workletNode.port.start();

    source.connect(workletNode);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioContext.destination);

    this.stream = stream;
    this.audioContext = audioContext;
    this.workletNode = workletNode;
    this.workletUrl = workletUrl;
  }

  stop(flushPending: boolean = false): void {
    if (flushPending) {
      this.forceFlush();
    } else {
      this.segmenter.reset();
    }

    this.onSegmentRef = null;
    this.onDebugLogRef = null;

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

export interface MicProbeResult {
  success: boolean;
  deviceLabel: string;
  sampleRate: number;
  maxRms: number;
  maxPeak: number;
  error?: string;
}

/**
 * Independent 1.5s microphone hardware check for the Debug Panel:
 * verifies getUserMedia + AudioContext + actual signal amplitude without loading Whisper.
 */
export async function runQuickMicProbe(durationMs: number = 1500): Promise<MicProbeResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      success: false,
      deviceLabel: 'Indisponible',
      sampleRate: 0,
      maxRms: 0,
      maxPeak: 0,
      error: 'navigator.mediaDevices.getUserMedia indisponible (HTTPS requis).',
    };
  }

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks()[0];
    audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    let maxRms = 0;
    let maxPeak = 0;

    await new Promise<void>((resolve) => {
      const start = performance.now();
      const sample = () => {
        analyser.getFloatTimeDomainData(buffer);
        const rms = computeRms(buffer);
        const peak = computePeak(buffer);
        if (rms > maxRms) maxRms = rms;
        if (peak > maxPeak) maxPeak = peak;

        if (performance.now() - start >= durationMs) {
          resolve();
        } else {
          window.setTimeout(sample, 60);
        }
      };
      sample();
    });

    return {
      success: true,
      deviceLabel: track?.label || 'Microphone par défaut',
      sampleRate: audioContext.sampleRate,
      maxRms,
      maxPeak,
    };
  } catch (error) {
    return {
      success: false,
      deviceLabel: 'Erreur',
      sampleRate: 0,
      maxRms: 0,
      maxPeak: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (audioContext) {
      void audioContext.close();
    }
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
  }
}
