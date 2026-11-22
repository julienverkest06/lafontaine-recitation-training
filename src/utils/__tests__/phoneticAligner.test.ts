import { describe, expect, it } from 'vitest';
import {
  alignTranscriptToPoem,
  matchWordToTarget,
  toFrenchPhonetic,
} from '../phoneticAligner';

describe('toFrenchPhonetic', () => {
  it('rapproche les homophones français courants', () => {
    expect(toFrenchPhonetic('encor')).toBe(toFrenchPhonetic('encore'));
    expect(toFrenchPhonetic('ver')).toBe(toFrenchPhonetic('vers'));
    expect(toFrenchPhonetic('chantais')).toBe(toFrenchPhonetic('chantait'));
    expect(toFrenchPhonetic('saisit')).toBe(toFrenchPhonetic('saisi'));
    expect(toFrenchPhonetic('phénix')).toBe(toFrenchPhonetic('fénix'));
  });
});

describe('matchWordToTarget', () => {
  it('valide les variantes phonétiques quel que soit le niveau', () => {
    expect(matchWordToTarget('encore', 'encor', 'hard')).toBe(true);
    expect(matchWordToTarget('payerai', 'paierai', 'medium')).toBe(true);
  });

  it('rejette des mots totalement différents', () => {
    expect(matchWordToTarget('renard', 'corbeau', 'easy')).toBe(false);
    expect(matchWordToTarget('fromage', 'plumage', 'medium')).toBe(false);
  });
});

describe('alignTranscriptToPoem', () => {
  const corbeauVerses = [
    'Maître Corbeau, sur un arbre perché,',
    'Tenait en son bec un fromage.',
    "Maître Renard, par l'odeur alléché,",
  ];

  it('valide un vers récité avec hésitation et auto-correction', () => {
    const result = alignTranscriptToPoem(
      [
        'Euh Maître Renard oh non je recommence je me suis trompé Maître Corbeau sur un arbre perché',
      ],
      corbeauVerses,
      0,
      'easy'
    );

    expect(result.restartDetected).toBe(true);
    expect(result.matchedVersesCount).toBe(1);
    expect(result.remainingTranscript).toBe('');
  });

  it('valide plusieurs vers récités en continu sans pause', () => {
    const result = alignTranscriptToPoem(
      ['Maître Corbeau sur un arbre perché tenait en son bec un fromage'],
      corbeauVerses,
      0,
      'medium'
    );

    expect(result.matchedVersesCount).toBe(2);
    expect(result.remainingTranscript).toBe('');
  });

  it('reconnaît les archaïsmes La Fontaine (l’Oût, nenni, vermisseau)', () => {
    const cigale = [
      "Avant l'Oût, foi d'animal,",
      'De mouche ou de vermisseau.',
    ];
    const outResult = alignTranscriptToPoem(
      ["avant l'août foi d'animal"],
      cigale,
      0,
      'medium'
    );
    expect(outResult.matchedVersesCount).toBe(1);

    const grenouille = ["- Nenni. - M'y voici donc ? - Point du tout. - M'y voilà ?"];
    const nenniResult = alignTranscriptToPoem(
      ["n'est ni m'y voici donc point du tout m'y voilà"],
      grenouille,
      0,
      'medium'
    );
    expect(nenniResult.matchedVersesCount).toBe(1);
  });

  it('choisit automatiquement la meilleure hypothèse parmi plusieurs alternatives STT', () => {
    const result = alignTranscriptToPoem(
      [
        'mettre corbeau sur un arbre percher',
        'Maître Corbeau sur un arbre perché',
      ],
      corbeauVerses,
      0,
      'hard'
    );

    expect(result.matchedVersesCount).toBe(1);
  });

  it('ne valide pas un vers incomplet et renvoie le statut mot à mot', () => {
    const result = alignTranscriptToPoem(
      ['Maître Corbeau sur'],
      corbeauVerses,
      0,
      'easy'
    );

    expect(result.matchedVersesCount).toBe(0);
    expect(result.currentLineWordStatuses.slice(0, 3)).toEqual([
      'matched',
      'matched',
      'matched',
    ]);
    expect(result.currentLineWordStatuses[3]).toBe('pending');
  });
});
