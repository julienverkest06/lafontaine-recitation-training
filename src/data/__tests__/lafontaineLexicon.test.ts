import { describe, expect, it } from 'vitest';
import { fables } from '../fables';
import {
  applyContextualLexicon,
  buildWhisperInitialPrompt,
  extractFableGlossary,
} from '../lafontaineLexicon';

describe('lafontaineLexicon', () => {
  it('extrait un glossaire pertinent pour chaque fable du corpus', () => {
    const cigale = fables.find((f) => f.Slug === 'la-cigale-et-la-fourmi')!;
    const glossary = extractFableGlossary(cigale);

    expect(glossary.length).toBeGreaterThan(0);
    expect(glossary.some((w) => w.toLowerCase().includes('vermisseau'))).toBe(true);
  });

  it('applique les équivalences archaïques uniquement si le mot canonique est dans le vers cible', () => {
    expect(applyContextualLexicon('nest ni my voici', 'nenni my voici')).toBe(
      'nenni my voici'
    );
    // Doit rester intact si "nenni" n'est pas attendu
    expect(applyContextualLexicon('nest ni bon ni mauvais', 'ni bon ni mauvais')).toBe(
      'nest ni bon ni mauvais'
    );
  });

  it('construit un initial_prompt sans révéler les vers futurs non validés', () => {
    const corbeau = fables.find((f) => f.Slug === 'le-corbeau-et-le-renard')!;
    const prompt = buildWhisperInitialPrompt(corbeau, [corbeau.content[0]]);

    expect(prompt).toContain('Jean de La Fontaine');
    expect(prompt).toContain(corbeau.title);
    expect(prompt).toContain(corbeau.content[0]);
    expect(prompt).not.toContain(corbeau.content[1]);
  });
});
