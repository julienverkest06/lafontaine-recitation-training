import { describe, expect, it } from 'vitest';
import {
  countEnrichedTerms,
  parseEnrichedVerse,
  safeDecodeURIComponent,
} from '../enrichedText';

describe('enrichedText', () => {
  it('retourne un segment texte brut si aucune balise span n’est présente', () => {
    expect(parseEnrichedVerse('Maître Corbeau, sur un arbre perché,')).toEqual([
      { type: 'text', text: 'Maître Corbeau, sur un arbre perché,' },
    ]);
  });

  it('parse et décode les attributs data-terme et data-definition', () => {
    const verse =
      'Ce Loup rencontre un <span data-terme="Dogue" data-definition="Grand%20chien%20de%20garde%20puissant.">Dogue</span> aussi puissant que beau,';
    const segments = parseEnrichedVerse(verse);

    expect(segments).toEqual([
      { type: 'text', text: 'Ce Loup rencontre un ' },
      {
        type: 'term',
        terme: 'Dogue',
        definition: 'Grand chien de garde puissant.',
        rawTerme: 'Dogue',
        rawDefinition: 'Grand%20chien%20de%20garde%20puissant.',
        children: [{ type: 'text', text: 'Dogue' }],
      },
      { type: 'text', text: ' aussi puissant que beau,' },
    ]);
  });

  it('supporte les termes imbriqués (ex. Esope dans À Monseigneur le Dauphin)', () => {
    const verse =
      'Je chante les <span data-terme="h%C3%A9ros%20dont%20Esope%20est%20le%20p%C3%A8re" data-definition="Les%20personnages%20principaux.">héros dont <span data-terme="Esope" data-definition="Fabuliste%20grec.">Esope</span> est le père</span>,';
    const segments = parseEnrichedVerse(verse);

    expect(segments).toHaveLength(3);
    const outer = segments[1];
    expect(outer.type).toBe('term');
    if (outer.type === 'term') {
      expect(outer.terme).toBe('héros dont Esope est le père');
      expect(outer.definition).toBe('Les personnages principaux.');
      expect(outer.children).toHaveLength(3);
      expect(outer.children[1]).toEqual({
        type: 'term',
        terme: 'Esope',
        definition: 'Fabuliste grec.',
        rawTerme: 'Esope',
        rawDefinition: 'Fabuliste%20grec.',
        children: [{ type: 'text', text: 'Esope' }],
      });
    }
  });

  it('gère les séquences percent-encoded invalides sans lever d’erreur et compte les termes', () => {
    expect(safeDecodeURIComponent('100% pur')).toBe('100% pur');
    expect(
      countEnrichedTerms([
        'Sans terme',
        '<span data-terme="a" data-definition="b">a</span> et <span data-terme="c" data-definition="d">c</span>',
      ])
    ).toBe(2);
  });
});
