import { ChevronDown } from 'lucide-react';
import { Stats } from '../Stats';
import type { RecitedVersesMap } from '../../types/poetry';
import { cn } from '../../lib/utils';

interface RecitedVersesListProps {
  versesCount: number;
  recitedVerses: RecitedVersesMap;
  isPoemCompleted: (poemId: string) => boolean;
}

export function RecitedVersesList({
  versesCount,
  recitedVerses,
  isPoemCompleted,
}: RecitedVersesListProps) {
  const entries = Object.entries(recitedVerses);

  return (
    <div className="space-y-4">
      <Stats versesCount={versesCount} />

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center italic text-sm">
            Aucun vers récité pour le moment
          </p>
        ) : (
          entries.map(([poemId, verses]) => {
            const isCompleted = isPoemCompleted(poemId);
            return (
              <details
                key={poemId}
                className={cn(
                  'group rounded-lg overflow-hidden',
                  isCompleted ? 'bg-green-50 ring-1 ring-green-200' : 'bg-gray-50'
                )}
              >
                <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-green-100/50 transition-colors">
                  <span className="text-xl" aria-hidden="true">
                    {isCompleted ? '🎭' : '📝'}
                  </span>
                  <span
                    className={cn(
                      'font-medium flex-grow text-sm',
                      isCompleted ? 'text-green-800' : 'text-gray-800'
                    )}
                  >
                    {verses.poemTitle}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {verses.lines.length} vers
                  </span>
                  <ChevronDown
                    className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 shrink-0"
                    aria-hidden="true"
                  />
                </summary>
                <div className="px-4 py-2 space-y-1 border-t border-gray-200">
                  {verses.lines.map((line, index) => (
                    <div key={index} className="flex items-start gap-2 py-1 text-sm">
                      <span
                        className={cn(
                          'font-medium min-w-[1.5rem] text-right',
                          isCompleted ? 'text-green-500' : 'text-indigo-500'
                        )}
                      >
                        {index + 1}.
                      </span>
                      <p className="text-gray-600 leading-relaxed">{line}</p>
                    </div>
                  ))}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
