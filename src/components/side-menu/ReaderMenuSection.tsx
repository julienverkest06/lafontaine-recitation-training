import { useState } from 'react';
import { BookText, CheckCircle2, Library, Search } from 'lucide-react';
import type { AppMode, Poem, ReaderViewMode } from '../../types/poetry';
import {
  getAvailableBooks,
  searchFables,
  sortFablesByBookOrder,
  toRomanNumeral,
} from '../../data/fablesQueries';
import { cn } from '../../lib/utils';

interface ReaderMenuSectionProps {
  poems: Poem[];
  mode: AppMode;
  readerView: ReaderViewMode;
  selectedPoemId: string | null;
  completedPoemIds: Set<string>;
  onReadPoem: (poem: Poem) => void;
  onOpenAnthology: () => void;
}

export function ReaderMenuSection({
  poems,
  mode,
  readerView,
  selectedPoemId,
  completedPoemIds,
  onReadPoem,
  onOpenAnthology,
}: ReaderMenuSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<number | null>(null);

  const books = getAvailableBooks(poems);
  const filteredPoems = sortFablesByBookOrder(
    searchFables(poems, searchTerm, {
      book: selectedBook,
      includeContent: true,
    })
  );

  const isAnthologyActive = mode === 'read' && readerView === 'anthology';

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onOpenAnthology}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-colors',
          isAnthologyActive
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
        )}
      >
        <span className="flex items-center gap-2">
          <Library className="w-4 h-4 shrink-0" aria-hidden="true" />
          Lire tout le recueil
        </span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isAnthologyActive
              ? 'bg-white/20 text-white'
              : 'bg-white text-indigo-700'
          )}
        >
          {poems.length}
        </span>
      </button>

      <div className="relative">
        <input
          type="text"
          placeholder="Chercher un titre ou un vers..."
          aria-label="Rechercher une fable à lire"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1.5 pl-9 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
        />
        <Search
          className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>

      <fieldset className="flex flex-wrap gap-1 border-0 p-0 m-0" aria-label="Filtrer par livre">
        <button
          type="button"
          onClick={() => setSelectedBook(null)}
          className={cn(
            'px-2 py-0.5 text-xs rounded-full transition-colors',
            selectedBook === null
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Tous
        </button>
        {books.map((book) => (
          <button
            type="button"
            key={book}
            onClick={() => setSelectedBook(book)}
            className={cn(
              'px-2 py-0.5 text-xs rounded-full transition-colors',
              selectedBook === book
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            L.{toRomanNumeral(book)}
          </button>
        ))}
      </fieldset>

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {filteredPoems.map((poem) => {
          const isActive =
            mode === 'read' &&
            readerView === 'single' &&
            selectedPoemId === String(poem.id);
          const isCompleted = completedPoemIds.has(String(poem.id));

          return (
            <button
              type="button"
              key={poem.id}
              onClick={() => onReadPoem(poem)}
              className={cn(
                'w-full text-left p-2.5 rounded-lg transition-all border',
                isActive
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-transparent'
              )}
            >
              <div className="flex items-center gap-2.5">
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-green-600 shrink-0"
                    aria-label="Fable maîtrisée"
                  />
                ) : (
                  <BookText
                    className="w-4 h-4 text-indigo-500 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className="flex-grow min-w-0">
                  <div className="font-serif text-sm font-medium text-gray-800 line-clamp-1">
                    {poem.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    Livre {toRomanNumeral(poem.livre)} · {poem.content.length} vers
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
