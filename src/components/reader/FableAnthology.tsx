import { useState } from 'react';
import { BookOpen, CheckCircle2, PenLine, Search } from 'lucide-react';
import type { Poem, ReaderFontSize, ReaderPreferences } from '../../types/poetry';
import {
  getAvailableBooks,
  groupFablesByBook,
  searchFables,
  toRomanNumeral,
} from '../../data/fablesQueries';
import { cn } from '../../lib/utils';
import Card from '../ui/Card';
import { EnrichedVerses } from './EnrichedVerses';
import { ReaderControls } from './ReaderControls';

interface FableAnthologyProps {
  poems: Poem[];
  preferences: ReaderPreferences;
  completedPoemIds: Set<string>;
  onPreferencesChange: (next: ReaderPreferences) => void;
  onOpenSinglePoem: (poem: Poem) => void;
  onStartRecitation: (poem: Poem) => void;
}

const FONT_SIZE_CLASSES: Record<ReaderFontSize, string> = {
  sm: 'text-base leading-relaxed',
  md: 'text-lg leading-relaxed',
  lg: 'text-xl leading-loose',
};

export function FableAnthology({
  poems,
  preferences,
  completedPoemIds,
  onPreferencesChange,
  onOpenSinglePoem,
  onStartRecitation,
}: FableAnthologyProps) {
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const books = getAvailableBooks(poems);
  const filtered = searchFables(poems, searchTerm, {
    book: selectedBook,
    includeContent: true,
  });
  const grouped = groupFablesByBook(filtered);
  const totalVerses = filtered.reduce((acc, p) => acc + p.content.length, 0);

  return (
    <div className="space-y-6">
      <Card className="w-full border border-indigo-100/80">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-gray-900">
                Recueil intégral des fables
              </h2>
              <p className="text-sm text-gray-600">
                {filtered.length} fable{filtered.length > 1 ? 's' : ''} · {totalVerses} vers à lire et mémoriser
              </p>
            </div>
            <ReaderControls
              preferences={preferences}
              onChange={onPreferencesChange}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un titre ou un vers (ex. fromage, bise, roseau)..."
                aria-label="Rechercher dans le recueil"
                className="w-full px-4 py-2 pl-10 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
              <Search
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
          </div>

          <fieldset className="flex flex-wrap gap-1.5 border-0 p-0 m-0" aria-label="Filtrer par Livre">
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                selectedBook === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Tous les livres
            </button>
            {books.map((book) => (
              <button
                type="button"
                key={book}
                onClick={() => setSelectedBook(book)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  selectedBook === book
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Livre {toRomanNumeral(book)}
              </button>
            ))}
          </fieldset>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 font-serif text-lg">
            Aucune fable ne correspond à votre recherche.
          </p>
        </Card>
      ) : (
        grouped.map((group) => (
          <section key={group.livre} className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <h3 className="text-xl font-serif font-semibold text-gray-900">
                Livre {toRomanNumeral(group.livre)}
              </h3>
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-medium">
                {group.poems.length} fable{group.poems.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-4">
              {group.poems.map((poem) => {
                const isCompleted = completedPoemIds.has(String(poem.id));

                return (
                  <Card key={poem.id} className="w-full border border-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-2xl font-serif font-semibold text-gray-900">
                            {poem.title}
                          </h4>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                              Récitée
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Fable {poem.number}
                          {poem.year ? ` (${poem.year})` : ''} · {poem.content.length} vers
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenSinglePoem(poem)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                          Lire seule
                        </button>
                        <button
                          type="button"
                          onClick={() => onStartRecitation(poem)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                          S'entraîner
                        </button>
                      </div>
                    </div>

                    <EnrichedVerses
                      poem={poem}
                      showLineNumbers={preferences.showLineNumbers}
                      verseClassName={FONT_SIZE_CLASSES[preferences.fontSize]}
                      containerClassName="space-y-1.5"
                      lineGapClassName="gap-3"
                      lineNumberWidthClassName="w-6"
                    />
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
