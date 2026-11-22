import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRecitedVerse,
  getLastSelectedPoem,
  getReaderPreferences,
  getRecitedVerses,
  getVersesCount,
  hasVisitedBefore,
  incrementVersesCount,
  saveLastSelectedPoem,
  saveReaderPreferences,
} from '../localStorage';

describe('localStorage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gère le compteur de vers récités', () => {
    expect(getVersesCount()).toBe(0);
    expect(incrementVersesCount(3)).toBe(3);
    expect(incrementVersesCount()).toBe(4);
    expect(getVersesCount()).toBe(4);
  });

  it('ajoute des vers récités sans doublons et résiste au JSON corrompu', () => {
    localStorage.setItem('recitedVersesDetails', '{not valid json');
    expect(getRecitedVerses()).toEqual({});

    addRecitedVerse('291', 'La Cigale et la Fourmi', 'La Cigale, ayant chanté');
    addRecitedVerse('291', 'La Cigale et la Fourmi', 'La Cigale, ayant chanté');
    addRecitedVerse('291', 'La Cigale et la Fourmi', "Tout l'été,");

    expect(getRecitedVerses()).toEqual({
      '291': {
        poemTitle: 'La Cigale et la Fourmi',
        lines: ['La Cigale, ayant chanté', "Tout l'été,"],
      },
    });
  });

  it('sauvegarde la dernière fable sélectionnée et le statut de visite', () => {
    expect(hasVisitedBefore()).toBe(false);
    expect(getLastSelectedPoem()).toBeNull();

    saveLastSelectedPoem(292);
    expect(hasVisitedBefore()).toBe(true);
    expect(getLastSelectedPoem()).toBe(292);
  });

  it('sauvegarde et valide les préférences de lecture', () => {
    expect(getReaderPreferences()).toEqual({
      showLineNumbers: true,
      fontSize: 'md',
      view: 'single',
    });

    saveReaderPreferences({ showLineNumbers: false, fontSize: 'lg', view: 'anthology' });
    expect(getReaderPreferences()).toEqual({
      showLineNumbers: false,
      fontSize: 'lg',
      view: 'anthology',
    });
  });
});
