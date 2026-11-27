import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PenLine,
} from 'lucide-react';
import type { Poem, ReaderFontSize, ReaderPreferences } from '../../types/poetry';
import { getAdjacentFables, toRomanNumeral } from '../../data/fablesQueries';
import { countEnrichedTerms } from '../../utils/enrichedText';
import Card from '../ui/Card';
import { EnrichedVerses } from './EnrichedVerses';
import { ReaderControls } from './ReaderControls';

interface FableReaderProps {
  poem: Poem;
  poems: Poem[];
  preferences: ReaderPreferences;
  isCompleted: boolean;
  onPreferencesChange: (next: ReaderPreferences) => void;
  onSelectPoem: (poem: Poem) => void;
  onStartRecitation: (poem: Poem) => void;
}

const FONT_SIZE_CLASSES: Record<ReaderFontSize, string> = {
  sm: 'text-lg leading-relaxed',
  md: 'text-xl leading-relaxed',
  lg: 'text-2xl leading-loose',
};

export function FableReader({
  poem,
  poems,
  preferences,
  isCompleted,
  onPreferencesChange,
  onSelectPoem,
  onStartRecitation,
}: FableReaderProps) {
  const { prev, next } = getAdjacentFables(poems, poem.id);
  const definitionsCount = countEnrichedTerms(poem.enrichedContent);

  return (
    <div className="space-y-6">
      <Card className="w-full border border-indigo-100/80">
        <div className="flex flex-col gap-4 pb-6 mb-6 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReaderControls
              preferences={preferences}
              onChange={onPreferencesChange}
            />

            <button
              type="button"
              onClick={() => onStartRecitation(poem)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <PenLine className="w-4 h-4" aria-hidden="true" />
              S'entraîner sur cette fable
            </button>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-serif font-semibold text-gray-900">
                  {poem.title}
                </h2>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Récitée
                  </span>
                )}
              </div>
              <p className="text-base text-gray-600 mt-1">
                {poem.author} · Livre {toRomanNumeral(poem.livre)}, fable {poem.number}
                {poem.year ? ` (${poem.year})` : ''} · {poem.content.length} vers
              </p>
              {definitionsCount > 0 && (
                <p className="text-xs text-indigo-700 mt-1">
                  Survolez ou touchez les mots soulignés en pointillés pour afficher leur définition ({definitionsCount} terme{definitionsCount > 1 ? 's' : ''}).
                </p>
              )}
            </div>
          </div>
        </div>

        <EnrichedVerses
          poem={poem}
          as="article"
          ariaLabel={poem.title}
          showLineNumbers={preferences.showLineNumbers}
          verseClassName={FONT_SIZE_CLASSES[preferences.fontSize]}
          containerClassName="space-y-2.5 px-1 sm:px-4"
          lineGapClassName="gap-4"
          lineNumberWidthClassName="w-7"
        />

        <nav
          aria-label="Navigation entre les fables"
          className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        >
          {prev ? (
            <button
              type="button"
              onClick={() => onSelectPoem(prev)}
              className="flex items-center gap-2 px-4 py-2.5 text-left rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Fable précédente</div>
                <div className="text-sm font-serif font-medium text-gray-800 truncate">
                  {prev.title}
                </div>
              </div>
            </button>
          ) : (
            <div />
          )}

          {next && (
            <button
              type="button"
              onClick={() => onSelectPoem(next)}
              className="flex items-center justify-end gap-2 px-4 py-2.5 text-right rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Fable suivante</div>
                <div className="text-sm font-serif font-medium text-gray-800 truncate">
                  {next.title}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
            </button>
          )}
        </nav>
      </Card>
    </div>
  );
}
