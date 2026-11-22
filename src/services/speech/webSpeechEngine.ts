import type { SpeechEngine, SpeechStartOptions, SpeechEngineStatus, TranscriptEvent } from './types';

function getSpeechRecognitionCtor(): typeof SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export class WebSpeechEngine implements SpeechEngine {
  readonly id = 'web-speech' as const;
  readonly label = 'Web Speech (Navigateur)';

  private recognition: SpeechRecognition | null = null;
  private shouldKeepListening = false;
  private restartTimer: number | undefined;
  private cleanupListeners: (() => void) | null = null;

  isSupported(): boolean {
    return Boolean(getSpeechRecognitionCtor());
  }

  start(
    options: SpeechStartOptions,
    callbacks: {
      onTranscript: (event: TranscriptEvent) => void;
      onStatusChange: (status: SpeechEngineStatus, error?: string) => void;
    }
  ): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      callbacks.onStatusChange(
        'error',
        "La reconnaissance vocale n'est pas supportée par votre navigateur."
      );
      return;
    }

    this.stop();
    this.shouldKeepListening = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = options.lang;

    const handleResult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];
      if (!lastResult || lastResult.length === 0) return;

      const alternatives: string[] = [];
      for (let i = 0; i < lastResult.length; i++) {
        const transcript = lastResult[i]?.transcript?.trim();
        if (transcript && !alternatives.includes(transcript)) {
          alternatives.push(transcript);
        }
      }

      if (alternatives.length === 0) return;

      callbacks.onTranscript({
        text: alternatives[0],
        alternatives,
        isFinal: lastResult.isFinal,
        confidence: lastResult[0]?.confidence,
      });
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is normal during hesitant recitation; let onend auto-resume
      if (event.error === 'no-speech' && this.shouldKeepListening) {
        return;
      }

      if (event.error === 'aborted' && !this.shouldKeepListening) {
        return;
      }

      this.shouldKeepListening = false;
      callbacks.onStatusChange('error', `Erreur reconnaissance vocale : ${event.error}`);
    };

    const handleEnd = () => {
      if (this.shouldKeepListening && this.recognition === recognition) {
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

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('end', handleEnd);

    this.cleanupListeners = () => {
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
      callbacks.onStatusChange('error', "Impossible de démarrer le microphone.");
    }
  }

  stop(): void {
    this.shouldKeepListening = false;
    window.clearTimeout(this.restartTimer);
    this.restartTimer = undefined;

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
