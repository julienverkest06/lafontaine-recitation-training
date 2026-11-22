import type {
  SpeechAudioState,
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechStartOptions,
} from './types';

function getSpeechRecognitionCtor(): typeof SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function formatSpeechError(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return "Accès au microphone refusé. Autorisez le micro dans la barre d'adresse du navigateur puis réessayez.";
    case 'audio-capture':
      return 'Aucun microphone détecté ou micro occupé par une autre application.';
    case 'network':
      return "Le service Web Speech du navigateur est inaccessible (erreur réseau — fréquent sur Chromium/Brave sous Linux sans clé Google). Essayez dans Google Chrome officiel ou testez le moteur local Whisper sur la branche feat/whisper-webgpu-stt.";
    case 'language-not-supported':
      return "La langue française (fr-FR) n'est pas prise en charge par le moteur vocal de ce navigateur.";
    default:
      return `Erreur de reconnaissance vocale (${errorCode}).`;
  }
}

export class WebSpeechEngine implements SpeechEngine {
  readonly id = 'web-speech' as const;
  readonly label = 'Web Speech (Navigateur)';

  private recognition: SpeechRecognition | null = null;
  private shouldKeepListening = false;
  private hasErrored = false;
  private restartTimer: number | undefined;
  private cleanupListeners: (() => void) | null = null;

  // Tracks already-validated speech results so pauses mid-verse accumulate cleanly
  // while validated verses are never re-submitted.
  private consumedResultIndex = 0;
  private latestResultCount = 0;
  private carriedFinalText = '';
  private lastUnconsumedFinalText = '';

  private audioState: SpeechAudioState = {
    micActive: false,
    soundDetected: false,
    speechDetected: false,
  };

  isSupported(): boolean {
    return Boolean(getSpeechRecognitionCtor());
  }

  resetTranscriptBuffer(): void {
    this.consumedResultIndex = this.latestResultCount;
    this.carriedFinalText = '';
    this.lastUnconsumedFinalText = '';
  }

  start(options: SpeechStartOptions, callbacks: SpeechEngineCallbacks): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      callbacks.onStatusChange(
        'error',
        "La reconnaissance vocale Web Speech n'est pas supportée par ce navigateur (ex. Firefox)."
      );
      return;
    }

    this.stop();
    this.shouldKeepListening = true;
    this.hasErrored = false;
    this.consumedResultIndex = 0;
    this.latestResultCount = 0;
    this.carriedFinalText = '';

    const emitAudioState = (patch: Partial<SpeechAudioState>) => {
      this.audioState = { ...this.audioState, ...patch };
      callbacks.onAudioStateChange?.(this.audioState);
    };

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = options.lang;

    const handleStart = () => {
      callbacks.onStatusChange('listening');
    };

    const handleAudioStart = () => emitAudioState({ micActive: true });
    const handleAudioEnd = () =>
      emitAudioState({ micActive: false, soundDetected: false, speechDetected: false });
    const handleSoundStart = () => emitAudioState({ soundDetected: true });
    const handleSoundEnd = () => emitAudioState({ soundDetected: false, speechDetected: false });
    const handleSpeechStart = () => emitAudioState({ soundDetected: true, speechDetected: true });
    const handleSpeechEnd = () => emitAudioState({ speechDetected: false });

    const handleResult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      this.latestResultCount = results.length;

      // Guard if the engine auto-restarted and reset event.results
      if (this.consumedResultIndex > results.length) {
        this.consumedResultIndex = 0;
      }

      const finalizedParts: string[] = this.carriedFinalText ? [this.carriedFinalText] : [];
      const interimParts: string[] = [];
      const lastAlternativeVariants: string[] = [];
      let isFinal = true;
      let confidence: number | undefined;

      for (let i = this.consumedResultIndex; i < results.length; i++) {
        const result = results[i];
        if (!result || result.length === 0) continue;

        const bestTranscript = result[0]?.transcript?.trim() ?? '';
        if (!bestTranscript) continue;

        if (result.isFinal) {
          finalizedParts.push(bestTranscript);
        } else {
          isFinal = false;
          interimParts.push(bestTranscript);
        }

        if (i === results.length - 1) {
          confidence = result[0]?.confidence;
          for (let altIdx = 0; altIdx < result.length; altIdx++) {
            const altText = result[altIdx]?.transcript?.trim();
            if (altText && !lastAlternativeVariants.includes(altText)) {
              lastAlternativeVariants.push(altText);
            }
          }
        }
      }

      const combinedPrimary = [...finalizedParts, ...interimParts].join(' ').trim();
      if (!combinedPrimary) return;
      this.lastUnconsumedFinalText = finalizedParts.join(' ').trim();

      // Build full-phrase alternatives by swapping only the latest segment's alternatives
      const prefixParts =
        isFinal && finalizedParts.length > 0
          ? finalizedParts.slice(0, -1)
          : [...finalizedParts, ...interimParts.slice(0, -1)];
      const prefix = prefixParts.join(' ').trim();

      const alternatives = [combinedPrimary];
      for (const variant of lastAlternativeVariants) {
        const candidate = prefix ? `${prefix} ${variant}` : variant;
        if (!alternatives.includes(candidate)) {
          alternatives.push(candidate);
        }
      }

      callbacks.onTranscript({
        text: combinedPrimary,
        alternatives,
        isFinal,
        confidence,
      });
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is normal during pauses; let handleEnd auto-resume
      if (event.error === 'no-speech' && this.shouldKeepListening) {
        return;
      }

      if (event.error === 'aborted' && !this.shouldKeepListening) {
        return;
      }

      this.shouldKeepListening = false;
      this.hasErrored = true;
      emitAudioState({ micActive: false, soundDetected: false, speechDetected: false });
      callbacks.onStatusChange('error', formatSpeechError(event.error));
    };

    const handleEnd = () => {
      emitAudioState({ micActive: false, soundDetected: false, speechDetected: false });

      // Never overwrite an error status with 'idle'
      if (this.hasErrored) {
        return;
      }

      if (this.shouldKeepListening && this.recognition === recognition) {
        // Carry over any unconsumed finalized text across transparent browser restarts
        this.carriedFinalText = this.lastUnconsumedFinalText;
        this.consumedResultIndex = 0;
        this.latestResultCount = 0;

        this.restartTimer = window.setTimeout(() => {
          if (this.shouldKeepListening && this.recognition === recognition) {
            try {
              recognition.start();
            } catch {
              this.shouldKeepListening = false;
              callbacks.onStatusChange('idle');
            }
          }
        }, 150);
        return;
      }

      callbacks.onStatusChange('idle');
    };

    recognition.addEventListener('start', handleStart);
    recognition.addEventListener('audiostart', handleAudioStart);
    recognition.addEventListener('audioend', handleAudioEnd);
    recognition.addEventListener('soundstart', handleSoundStart);
    recognition.addEventListener('soundend', handleSoundEnd);
    recognition.addEventListener('speechstart', handleSpeechStart);
    recognition.addEventListener('speechend', handleSpeechEnd);
    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('end', handleEnd);

    this.cleanupListeners = () => {
      recognition.removeEventListener('start', handleStart);
      recognition.removeEventListener('audiostart', handleAudioStart);
      recognition.removeEventListener('audioend', handleAudioEnd);
      recognition.removeEventListener('soundstart', handleSoundStart);
      recognition.removeEventListener('soundend', handleSoundEnd);
      recognition.removeEventListener('speechstart', handleSpeechStart);
      recognition.removeEventListener('speechend', handleSpeechEnd);
      recognition.removeEventListener('result', handleResult);
      recognition.removeEventListener('error', handleError);
      recognition.removeEventListener('end', handleEnd);
    };

    this.recognition = recognition;

    try {
      recognition.start();
      callbacks.onStatusChange('listening');
    } catch {
      this.shouldKeepListening = false;
      this.hasErrored = true;
      callbacks.onStatusChange('error', 'Impossible de démarrer le microphone.');
    }
  }

  stop(): void {
    this.shouldKeepListening = false;
    this.hasErrored = false;
    window.clearTimeout(this.restartTimer);
    this.restartTimer = undefined;
    this.consumedResultIndex = 0;
    this.latestResultCount = 0;
    this.carriedFinalText = '';

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if already stopped
      }
      this.cleanupListeners?.();
      this.cleanupListeners = null;
      this.recognition = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}
