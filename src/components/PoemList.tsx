import { useState } from 'react';
import { BookOpen, Search, Filter, CheckCircle2 } from 'lucide-react';
import type { PoemListProps } from '../types/poetry';
import { searchFables, sortFablesByBookOrder } from '../data/fablesQueries';
import { cn } from '../lib/utils';

type SortOrder = 'book' | 'title' | 'length';

const SORT_LABELS: Record<SortOrder, string> = {
  book: 'Recueil',
  title: 'Titre',
  length: 'Longueur',
};

const NEXT_SORT: Record<SortOrder, SortOrder> = {
  book: 'title',
  title: 'length',
  length: 'book',
};

export function PoemList({
  poems,
  onSelectPoem,
  selectedPoemId,
  completedPoemIds,
}: PoemListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('book');

  const filtered = searchFables(poems, searchTerm);
  const filteredAndSortedPoems =
    sortBy === 'book'
      ? sortFablesByBookOrder(filtered)
      : filtered.toSorted((a, b) => {
          if (sortBy === 'length') {
            return b.content.length - a.content.length;
          }
          return a.title.localeCompare(b.title, 'fr');
        });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher une fable..."
            aria-label="Rechercher une fable à réciter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
          />
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </div>

        <button
          type="button"
          onClick={() => setSortBy(NEXT_SORT[sortBy])}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-indigo-600 transition-colors bg-white rounded-lg border border-gray-200 hover:border-indigo-500 shrink-0"
          title={`Tri actuel : ${SORT_LABELS[sortBy]}`}
        >
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          {SORT_LABELS[sortBy]}
        </button>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredAndSortedPoems.map((poem) => {
          const isSelected = selectedPoemId === String(poem.id);
          const isCompleted = completedPoemIds?.has(String(poem.id)) ?? false;

          return (
            <button
              type="button"
              key={poem.id}
              onClick={() => onSelectPoem(poem)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all border',
                isSelected
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-transparent'
              )}
            >
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-green-600 shrink-0"
                    aria-label="Fable maîtrisée"
                  />
                ) : (
                  <BookOpen
                    className="w-4 h-4 text-indigo-600 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className="flex-grow min-w-0">
                  <h3 className="font-serif text-sm font-medium text-gray-800 line-clamp-1">
                    {poem.title}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Livre {poem.livre} · {poem.content.length} vers
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-gray-500">
        {filteredAndSortedPoems.length} fable{filteredAndSortedPoems.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
