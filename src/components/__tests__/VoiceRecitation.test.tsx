import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { fables } from '../../data/fables';
import { VoiceRecitation } from '../recitation-area/modes/voice/VoiceRecitation';

type Listener = (event: unknown) => void;

class MockSpeechRecognition {
  static latestInstance: MockSpeechRecognition | null = null;

  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = '';
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    MockSpeechRecognition.latestInstance = this;
  }

  addEventListener(type: string, listener: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  start() {
    this.emit('start', {});
    this.emit('audiostart', {});
  }

  stop() {
    this.emit('audioend', {});
    this.emit('end', {});
  }

  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function makeResults(entries: Array<{ transcript: string; isFinal: boolean }>) {
  const list = entries.map((entry) => {
    const item = [{ transcript: entry.transcript, confidence: 0.95 }] as unknown as SpeechRecognitionResult;
    Object.defineProperty(item, 'isFinal', { value: entry.isFinal });
    return item;
  });
  return list as unknown as SpeechRecognitionResultList;
}

describe('VoiceRecitation', () => {
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkit = window.webkitSpeechRecognition;

  beforeEach(() => {
    MockSpeechRecognition.latestInstance = null;
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      MockSpeechRecognition;
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
      undefined;
  });

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkit;
  });

  it('affiche immédiatement le texte dicté en direct et cumule les pauses au sein d’un vers', () => {
    const poem = fables.find((f) => f.Slug === 'le-corbeau-et-le-renard')!;
    const onValidation = vi.fn();

    render(
      <VoiceRecitation
        poem={poem}
        difficulty="easy"
        onDifficultyChange={vi.fn()}
        onValidation={onValidation}
        onTextChange={vi.fn()}
        onFocusChange={vi.fn()}
        onModeSwitch={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Commencer la dictée/i }));
    const instance = MockSpeechRecognition.latestInstance!;
    expect(instance).not.toBeNull();

    // Première moitié du vers (finalisée après une petite pause)
    act(() => {
      instance.emit('speechstart', {});
      instance.emit('result', {
        results: makeResults([{ transcript: 'Maître Corbeau', isFinal: true }]),
      });
    });

    expect(screen.getByText('Maître Corbeau')).toBeInTheDocument();
    expect(screen.getByText('Parole détectée')).toBeInTheDocument();
    expect(onValidation).not.toHaveBeenCalled();

    // Seconde moitié du vers après pause : cumulée avec la première -> valide le vers !
    act(() => {
      instance.emit('result', {
        results: makeResults([
          { transcript: 'Maître Corbeau', isFinal: true },
          { transcript: 'sur un arbre perché', isFinal: true },
        ]),
      });
    });

    expect(onValidation).toHaveBeenCalledWith([true]);
    expect(screen.getByText(`✓ ${poem.content[0]}`)).toBeInTheDocument();
  });

  it("conserve et affiche clairement l'erreur réseau même quand l'événement end suit immédiatement", () => {
    const poem = fables.find((f) => f.Slug === 'la-cigale-et-la-fourmi')!;

    render(
      <VoiceRecitation
        poem={poem}
        difficulty="easy"
        onDifficultyChange={vi.fn()}
        onValidation={vi.fn()}
        onTextChange={vi.fn()}
        onFocusChange={vi.fn()}
        onModeSwitch={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Commencer la dictée/i }));
    const instance = MockSpeechRecognition.latestInstance!;

    act(() => {
      instance.emit('error', { error: 'network' });
      instance.emit('end', {});
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/service Web Speech du navigateur est inaccessible/i);
  });
});
