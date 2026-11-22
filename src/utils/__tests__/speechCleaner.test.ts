import { describe, expect, it } from 'vitest';
import { cleanSpokenTranscript } from '../speechCleaner';

describe('cleanSpokenTranscript', () => {
  it('supprime les mots parasites oraux sans toucher aux mots du vers', () => {
    const result = cleanSpokenTranscript(
      'Euh Maître hum Corbeau ben sur un arbre perché',
      'Maître Corbeau, sur un arbre perché,'
    );

    expect(result.cleanedText).toBe('maitre corbeau sur un arbre perche');
    expect(result.removedFillers).toEqual(['euh', 'hum', 'ben']);
    expect(result.restartDetected).toBe(false);
  });

  it('écarte la tentative précédente après une auto-correction orale', () => {
    const result = cleanSpokenTranscript(
      'Maître Renard oh non je recommence je me suis trompé Maître Corbeau sur un arbre perché',
      'Maître Corbeau, sur un arbre perché,'
    );

    expect(result.restartDetected).toBe(true);
    expect(result.cleanedText).toBe('maitre corbeau sur un arbre perche');
  });

  it('préserve les mots légitimes présents dans le vers cible (ex. bon, eh bien)', () => {
    const bonResult = cleanSpokenTranscript(
      'euh Le Renard s en saisit et dit Mon bon Monsieur',
      'Le Renard s\'en saisit, et dit : " Mon bon Monsieur,'
    );
    expect(bonResult.cleanedText).toContain('mon bon monsieur');
    expect(bonResult.removedFillers).toEqual(['euh']);
  });

  it('déduplique les faux départs et bégaiements', () => {
    const result = cleanSpokenTranscript(
      'Maître Maître Corbeau sur un sur un arbre perché',
      'Maître Corbeau, sur un arbre perché,'
    );
    expect(result.cleanedText).toBe('maitre corbeau sur un arbre perche');
  });

  it('détecte la commande explicite de redémarrage complet de la fable', () => {
    const result = cleanSpokenTranscript(
      'Attends je veux recommencer la fable',
      'Maître Corbeau, sur un arbre perché,'
    );
    expect(result.resetFableRequested).toBe(true);
  });
});
