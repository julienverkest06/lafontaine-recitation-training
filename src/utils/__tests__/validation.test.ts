import { describe, expect, it } from 'vitest';
import { compareCharacters, normalizeText, validateLine, validateRecitation } from '../validation';

describe('normalizeText', () => {
  it('supprime la casse, les accents, la ponctuation et normalise les ligatures', () => {
    expect(normalizeText('Maître Corbeau, sur un arbre perché,')).toBe(
      'maitre corbeau sur un arbre perche'
    );
    expect(normalizeText('Œuvre de cœur : « bonjour ! »')).toBe('oeuvre de coeur bonjour');
  });

  it('normalise les espaces multiples', () => {
    expect(normalizeText('  Tout   l’été  ;  ')).toBe('tout l’ete');
  });
});

describe('validateLine', () => {
  it('valide un vers sans accents ni ponctuation', () => {
    expect(
      validateLine(
        'Maitre Corbeau sur un arbre perche',
        'Maître Corbeau, sur un arbre perché,'
      )
    ).toBe(true);
  });

  it('valide la saisie oe pour une ligature œ', () => {
    expect(validateLine('un boeuf', 'un bœuf')).toBe(true);
  });

  it('rejette un vers vide ou incomplet', () => {
    expect(validateLine('', '')).toBe(false);
    expect(validateLine('Maître Corbeau', 'Maître Corbeau, sur un arbre perché,')).toBe(false);
  });
});

describe('validateRecitation', () => {
  it('valide chaque vers indépendamment', () => {
    const original = ['La Cigale, ayant chanté', "Tout l'été,"];
    expect(validateRecitation(['la cigale ayant chante', 'tout'], original)).toEqual([
      true,
      false,
    ]);
  });
});

describe('compareCharacters', () => {
  it('marque les caractères non encore tapés comme pending (jamais incorrect)', () => {
    const statuses = compareCharacters('', 'Bonjour');
    expect(statuses).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('tolère les accents et les ligatures en temps réel', () => {
    const statuses = compareCharacters('Maitre', 'Maître !');
    expect(statuses.slice(0, 6)).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);

    const ligature = compareCharacters('boeuf', 'bœuf');
    expect(ligature).toEqual(['correct', 'correct', 'correct', 'correct']);
  });

  it('signale les erreurs de frappe en incorrect', () => {
    const statuses = compareCharacters('Bx', 'Bonjour');
    expect(statuses[0]).toBe('correct');
    expect(statuses[1]).toBe('incorrect');
    expect(statuses[2]).toBe('pending');
  });
});
