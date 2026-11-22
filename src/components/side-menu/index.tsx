import { useState, useEffect } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { PoemList } from '../PoemList';
import type {
  AppMode,
  Difficulty,
  Poem,
  ReaderViewMode,
  RecitedVersesMap,
} from '../../types/poetry';
import { cn } from '../../lib/utils';
import { CollapsibleSection } from './CollapsibleSection';
import { MenuHeader } from './MenuHeader';
import { ReaderMenuSection } from './ReaderMenuSection';
import { RecitedVersesList } from './RecitedVersesList';

interface SideMenuProps {
  versesCount: number;
  poems: Poem[];
  recitedVerses: RecitedVersesMap;
  completedPoemIds: Set<string>;
  mode: AppMode;
  readerView: ReaderViewMode;
  selectedPoemId: string | null;
  isPinned: boolean;
  isFocused: boolean;
  difficulty: Difficulty;
  onPinnedChange: (pinned: boolean) => void;
  onSelectPoem: (poem: Poem) => void;
  onReadPoem: (poem: Poem) => void;
  onOpenAnthology: () => void;
}

const BLUR_AMOUNT: Record<Difficulty, string> = {
  easy: 'backdrop-blur-[2px]',
  medium: 'backdrop-blur-[3px]',
  hard: 'backdrop-blur-[4px]',
};

export function SideMenu({
  versesCount,
  poems,
  recitedVerses,
  completedPoemIds,
  mode,
  readerView,
  selectedPoemId,
  isPinned,
  isFocused,
  difficulty,
  onPinnedChange,
  onSelectPoem,
  onReadPoem,
  onOpenAnthology,
}: SideMenuProps) {
  const [isOpen, setIsOpen] = useState(isPinned);

  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsOpen(isLargeScreen);
      onPinnedChange(isLargeScreen);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onPinnedChange]);

  const closeIfDrawer = () => {
    if (!isPinned) setIsOpen(false);
  };

  return (
    <>
      {!isPinned && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed left-4 top-4 z-40 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors',
            isFocused && 'opacity-50'
          )}
          aria-label="Ouvrir le menu"
        >
          <MenuIcon className="w-6 h-6 text-indigo-600" />
        </button>
      )}

      {isOpen && !isPinned && (
        <div
          className={cn(
            'fixed inset-0 bg-black/20 z-40',
            isFocused && BLUR_AMOUNT[difficulty]
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navigation principale"
        className={cn(
          'fixed top-0 left-0 h-full w-full max-w-sm sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out',
          isPinned || isOpen ? 'translate-x-0' : '-translate-x-full',
          isFocused && 'opacity-50'
        )}
      >
        <div className="h-full flex flex-col">
          <MenuHeader
            isPinned={isPinned}
            setIsPinned={(nextPinned) => {
              onPinnedChange(nextPinned);
              setIsOpen(nextPinned);
            }}
            onClose={() => setIsOpen(false)}
          />

          <div className="flex-1 overflow-y-auto">
            <CollapsibleSection title="Récitez des fables" emoji="📚" defaultOpen={true}>
              <PoemList
                poems={poems}
                onSelectPoem={(poem) => {
                  onSelectPoem(poem);
                  closeIfDrawer();
                }}
                selectedPoemId={mode === 'recite' ? selectedPoemId : null}
                completedPoemIds={completedPoemIds}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Lire les fables" emoji="📖" defaultOpen={true}>
              <ReaderMenuSection
                poems={poems}
                mode={mode}
                readerView={readerView}
                selectedPoemId={selectedPoemId}
                completedPoemIds={completedPoemIds}
                onReadPoem={(poem) => {
                  onReadPoem(poem);
                  closeIfDrawer();
                }}
                onOpenAnthology={() => {
                  onOpenAnthology();
                  closeIfDrawer();
                }}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Vers récités" emoji="✨">
              <RecitedVersesList
                versesCount={versesCount}
                recitedVerses={recitedVerses}
                isPoemCompleted={(poemId: string) => completedPoemIds.has(poemId)}
              />
            </CollapsibleSection>
          </div>
        </div>
      </aside>
    </>
  );
}
