import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognitionCtor(): typeof SpeechRecognition | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function useVoiceRecognition(onTranscriptUpdate: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = Boolean(getSpeechRecognitionCtor());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const callbackRef = useRef(onTranscriptUpdate);

  useEffect(() => {
    callbackRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  useEffect(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    const handleResult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];
      const transcript = lastResult?.[0]?.transcript ?? '';

      if (transcript && transcript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = transcript;
        callbackRef.current(transcript);
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    const handleEnd = () => {
      setIsListening(false);
      lastTranscriptRef.current = '';
    };

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('end', handleEnd);

    recognitionRef.current = recognition;

    return () => {
      recognition.removeEventListener('result', handleResult);
      recognition.removeEventListener('error', handleError);
      recognition.removeEventListener('end', handleEnd);
      recognition.stop();
      recognitionRef.current = null;
      lastTranscriptRef.current = '';
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      lastTranscriptRef.current = '';
      setIsListening(false);
    }
  }, [isListening]);

  const toggleMicrophone = useCallback(() => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      lastTranscriptRef.current = '';
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    toggleMicrophone,
    stopListening,
  };
}
