import type { Poem } from '../types/poetry';
import { normalizeText } from '../utils/validation';

/**
 * Multi-word or spelling variants frequently produced by French STT engines
 * when transcribing 17th-century La Fontaine vocabulary.
 * Keys are normalized canonical words/expressions as found in the fables;
 * values are normalized STT variants to accept ONLY when the key appears in the target verse.
 */
export const ARCHAIC_VARIANTS_BY_CANONICAL: Record<string, string[]> = {
  lout: ['laout', 'l aout', 'lou', 'aout', 'out'],
  out: ['aout', 'ou'],
  nenni: ['nest ni', 'n est ni', 'neni', 'ne nie', 'nany', 'nani'],
  encor: ['encore'],
  vermisseau: ['vernisso', 'vermisso', 'vermiceau', 'ver mis haut'],
  esope: ['ezop', 'isope', 'esop'],
  gabelle: ['gabel', 'ga belle'],
  phenix: ['fenix', 'phoenix'],
  simonide: ['simon ide', 'simonides'],
  paierai: ['payerai', 'pererai', 'paierez'],
  alleche: ['aleche', 'a lecher'],
  belette: ['bellette', 'belete'],
  frelons: ['frelon', 'freulons'],
  harangue: ['arangue', 'hareng'],
  meunier: ['menier', 'munier'],
  ramage: ['ramages'],
  emprunteuse: ['emprunteuses'],
  preteuse: ['preteuses'],
  deplaise: ['deplaises', 'de plaire'],
  saisit: ['saisi', 'saisis'],
  bise: ['bises', 'biz'],
  chapon: ['chapons'],
  ciron: ['sirons', 'ciron'],
};

const FRENCH_STOPWORDS = new Set([
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'et',
  'ou',
  'en',
  'au',
  'aux',
  'ce',
  'cet',
  'cette',
  'ces',
  'mon',
  'ton',
  'son',
  'ma',
  'ta',
  'sa',
  'mes',
  'tes',
  'ses',
  'nos',
  'vos',
  'leur',
  'leurs',
  'qui',
  'que',
  'quoi',
  'dont',
  'je',
  'tu',
  'il',
  'elle',
  'nous',
  'vous',
  'ils',
  'elles',
  'on',
  'me',
  'te',
  'se',
  'lui',
  'ne',
  'pas',
  'plus',
  'pour',
  'par',
  'sur',
  'sous',
  'dans',
  'avec',
  'sans',
  'mais',
  'car',
  'donc',
  'est',
  'sont',
  'fut',
  'etait',
  'etre',
  'avoir',
  'tout',
  'tous',
  'toute',
  'toutes',
  'bien',
  'comme',
  'dit',
  'fait',
  'point',
  'peu',
  'tres',
  'si',
  'a',
  'y',
]);

/**
 * Replaces multi-word STT artifacts (e.g., "n'est ni" -> "nenni") ONLY when the
 * corresponding canonical term actually exists in the target verse.
 */
export function applyContextualLexicon(spokenNormalized: string, targetNormalized: string): string {
  let result = spokenNormalized;

  for (const [canonical, variants] of Object.entries(ARCHAIC_VARIANTS_BY_CANONICAL)) {
    const canonicalPattern = new RegExp(`(^|\\s)${escapeRegex(canonical)}(?=\\s|$)`);
    if (!canonicalPattern.test(targetNormalized)) {
      continue;
    }

    for (const variant of variants) {
      const variantPattern = new RegExp(`(^|\\s)${escapeRegex(variant)}(?=\\s|$)`, 'g');
      result = result.replace(variantPattern, `$1${canonical}`);
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts distinctive vocabulary (proper nouns, archaic terms, long words)
 * from a fable to feed STT vocabulary biasing (Whisper initial_prompt, Voxtral/Deepgram hints).
 */
export function extractFableGlossary(poem: Poem, maxTerms: number = 18): string[] {
  const candidates = new Map<string, number>();

  for (const line of poem.content) {
    const rawTokens = line.match(/[A-Za-zÀ-ÖØ-öø-ÿœŒæÆ'-]+/g) ?? [];

    for (let i = 0; i < rawTokens.length; i++) {
      const raw = rawTokens[i].replace(/^['-]+|['-]+$/g, '');
      if (raw.length < 3) continue;

      const norm = normalizeText(raw);
      if (!norm || FRENCH_STOPWORDS.has(norm)) continue;

      let score = 0;
      if (norm in ARCHAIC_VARIANTS_BY_CANONICAL) score += 10;
      // Mid-line capitalized words are often character/proper names in La Fontaine
      if (i > 0 && /^[A-ZÀ-ÖØ-Þ]/.test(raw)) score += 6;
      if (raw.length >= 7) score += 3;
      if (/[œæîûïëô]/.test(raw.toLowerCase())) score += 2;

      if (score > 0) {
        const currentScore = candidates.get(raw) ?? 0;
        if (score > currentScore) {
          candidates.set(raw, score);
        }
      }
    }
  }

  return Array.from(candidates.entries())
    .toSorted((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxTerms)
    .map(([word]) => word);
}

/**
 * Builds a hallucination-safe Whisper initial_prompt:
 * includes author, fable title, rare glossary words, and at most the last 2
 * ALREADY-VALIDATED verses (never future unvalidated verses).
 */
export function buildWhisperInitialPrompt(
  poem: Poem,
  validatedLines: string[] = []
): string {
  const glossary = extractFableGlossary(poem, 14);
  const parts = [`Fable de Jean de La Fontaine : ${poem.title}.`];

  if (glossary.length > 0) {
    parts.push(`Vocabulaire : ${glossary.join(', ')}.`);
  }

  const recentValidated = validatedLines.slice(-2).filter(Boolean);
  if (recentValidated.length > 0) {
    parts.push(recentValidated.join(' '));
  }

  return parts.join(' ');
}
