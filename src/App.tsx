import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Gamepad2, PenLine } from 'lucide-react';
import { PoemDisplay } from './components/PoemDisplay';
import { RecitationArea } from './components/recitation-area';
import { SideMenu } from './components/side-menu';
import { CountdownTimer } from './components/CountdownTimer';
import { Title } from './components/Title';
import { FableReader } from './components/reader/FableReader';
import { FableAnthology } from './components/reader/FableAnthology';
import { GamesHub } from './components/games/GamesHub';
import { fables } from './data/fables';
import { findFableBySlug, sortFablesByBookOrder } from './data/fablesQueries';
import { findGameBySlug, type GameHighScoreMap, type GameId } from './types/games';
import type {
  AppMode,
  Difficulty,
  Poem,
  ReaderPreferences,
  RecitedVersesMap,
  WordMatchStatus,
} from './types/poetry';
import {
  getVersesCount,
  incrementVersesCount,
  getRecitedVerses,
  saveLastSelectedPoem,
  getLastSelectedPoem,
  hasVisitedBefore,
  getReaderPreferences,
  saveReaderPreferences,
  getGameHighScores,
  saveGameHighScore,
} from './utils/localStorage';
import { cn } from './lib/utils';

interface HashRoute {
  mode: AppMode;
  view?: 'single' | 'anthology';
  slug?: string;
  gameId?: GameId;
}

function parseHashRoute(hash: string): HashRoute | null {
  const withoutQuery = hash.split('?')[0] ?? '';
  const cleaned = withoutQuery.replace(/^#\/?/, '');
  if (!cleaned) return null;

  const [section, slug] = cleaned.split('/');
  if (section === 'lire') {
    return slug ? { mode: 'read', view: 'single', slug } : { mode: 'read', view: 'anthology' };
  }
  if (section === 'reciter') {
    return { mode: 'recite', slug };
  }
  if (section === 'jeux') {
    const matched = findGameBySlug(slug);
    return { mode: 'games', gameId: matched?.id ?? 'corbeau-renard' };
  }
  return null;
}

function writeHash(hash: string): void {
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
}

function getInitialState(): {
  mode: AppMode;
  selectedPoem: Poem | null;
  selectedGameId: GameId;
  showCountdown: boolean;
  readerPreferences: ReaderPreferences;
} {
  const basePrefs = getReaderPreferences();
  const initialRoute = parseHashRoute(window.location.hash);

  if (initialRoute) {
    if (initialRoute.mode === 'games') {
      const lastPoemId = getLastSelectedPoem();
      const lastPoem = lastPoemId !== null ? fables.find((p) => p.id === lastPoemId) ?? null : null;
      return {
        mode: 'games',
        selectedPoem: lastPoem,
        selectedGameId: initialRoute.gameId ?? 'corbeau-renard',
        showCountdown: false,
        readerPreferences: basePrefs,
      };
    }

    if (initialRoute.mode === 'read') {
      const found = initialRoute.slug ? findFableBySlug(fables, initialRoute.slug) ?? null : null;
      return {
        mode: 'read',
        selectedPoem: found,
        selectedGameId: 'corbeau-renard',
        showCountdown: false,
        readerPreferences: {
          ...basePrefs,
          view: initialRoute.view ?? basePrefs.view,
        },
      };
    }

    const found = initialRoute.slug ? findFableBySlug(fables, initialRoute.slug) ?? null : null;
    return {
      mode: 'recite',
      selectedPoem: found,
      selectedGameId: 'corbeau-renard',
      showCountdown: false,
      readerPreferences: basePrefs,
    };
  }

  const lastPoemId = getLastSelectedPoem();
  if (lastPoemId !== null) {
    const lastPoem = fables.find((poem) => poem.id === lastPoemId) ?? null;
    return {
      mode: 'recite',
      selectedPoem: lastPoem,
      selectedGameId: 'corbeau-renard',
      showCountdown: false,
      readerPreferences: basePrefs,
    };
  }

  return {
    mode: 'recite',
    selectedPoem: null,
    selectedGameId: 'corbeau-renard',
    showCountdown: !hasVisitedBefore(),
    readerPreferences: basePrefs,
  };
}

function App() {
  const orderedFables = useMemo(() => sortFablesByBookOrder(fables), []);
  const [initial] = useState(getInitialState);

  const [mode, setMode] = useState<AppMode>(initial.mode);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(initial.selectedPoem);
  const [selectedGameId, setSelectedGameId] = useState<GameId>(initial.selectedGameId);
  const [gameHighScores, setGameHighScores] = useState<GameHighScoreMap>(() =>
    getGameHighScores()
  );
  const [validatedLines, setValidatedLines] = useState<boolean[]>([]);
  const [totalVersesCount, setTotalVersesCount] = useState<number>(() => getVersesCount());
  const [recitedVerses, setRecitedVerses] = useState<RecitedVersesMap>(() => getRecitedVerses());
  const [currentTypedText, setCurrentTypedText] = useState('');
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [spokenWordStatuses, setSpokenWordStatuses] = useState<WordMatchStatus[] | null>(null);
  const [showCountdown, setShowCountdown] = useState(initial.showCountdown);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isRecitationFocused, setIsRecitationFocused] = useState(false);
  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [readerPreferences, setReaderPreferences] = useState<ReaderPreferences>(
    initial.readerPreferences
  );

  const completedPoemIds = useMemo(() => {
    const completed = new Set<string>();
    for (const poem of fables) {
      const id = String(poem.id);
      const entry = recitedVerses[id];
      if (entry && entry.lines.length >= poem.content.length && poem.content.length > 0) {
        completed.add(id);
      }
    }
    return completed;
  }, [recitedVerses]);

  const applyHashRoute = useCallback(
    (route: HashRoute) => {
      setShowCountdown(false);
      setIsRecitationFocused(false);

      if (route.mode === 'games') {
        setMode('games');
        if (route.gameId) {
          setSelectedGameId(route.gameId);
        }
        return;
      }

      if (route.mode === 'read') {
        setMode('read');
        if (route.view === 'anthology') {
          setReaderPreferences((prev) => {
            const next = { ...prev, view: 'anthology' as const };
            saveReaderPreferences(next);
            return next;
          });
        } else if (route.slug) {
          const found = findFableBySlug(fables, route.slug);
          if (found) {
            setSelectedPoem(found);
            saveLastSelectedPoem(found.id);
          }
          setReaderPreferences((prev) => {
            const next = { ...prev, view: 'single' as const };
            saveReaderPreferences(next);
            return next;
          });
        }
        return;
      }

      setMode('recite');
      if (route.slug) {
        const found = findFableBySlug(fables, route.slug);
        if (found) {
          setSelectedPoem(found);
          setValidatedLines([]);
          setCurrentTypedText('');
          setCurrentLineIndex(0);
          saveLastSelectedPoem(found.id);
        }
      }
    },
    []
  );

  useEffect(() => {
    const handleHashChange = () => {
      const route = parseHashRoute(window.location.hash);
      if (route) {
        applyHashRoute(route);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [applyHashRoute]);

  const handlePoemSelect = useCallback((poem: Poem) => {
    setMode('recite');
    setSelectedPoem(poem);
    setValidatedLines([]);
    setCurrentTypedText('');
    setCurrentLineIndex(0);
    setSpokenWordStatuses(null);
    setShowCountdown(false);
    saveLastSelectedPoem(poem.id);
    writeHash(`#/reciter/${poem.Slug}`);
  }, []);

  const handleReadPoem = useCallback((poem: Poem) => {
    setMode('read');
    setSelectedPoem(poem);
    setShowCountdown(false);
    setIsRecitationFocused(false);
    saveLastSelectedPoem(poem.id);
    setReaderPreferences((prev) => {
      const next = { ...prev, view: 'single' as const };
      saveReaderPreferences(next);
      return next;
    });
    writeHash(`#/lire/${poem.Slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAnthology = useCallback(() => {
    setMode('read');
    setShowCountdown(false);
    setIsRecitationFocused(false);
    setReaderPreferences((prev) => {
      const next = { ...prev, view: 'anthology' as const };
      saveReaderPreferences(next);
      return next;
    });
    writeHash('#/lire');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReaderPreferencesChange = useCallback(
    (next: ReaderPreferences) => {
      setReaderPreferences(next);
      saveReaderPreferences(next);

      if (next.view === 'anthology') {
        writeHash('#/lire');
      } else {
        const target = selectedPoem ?? orderedFables[0];
        if (target) {
          setSelectedPoem(target);
          writeHash(`#/lire/${target.Slug}`);
        }
      }
    },
    [selectedPoem, orderedFables]
  );

  const handleRandomSelection = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * fables.length);
    const randomPoem = fables[randomIndex];
    if (randomPoem) {
      handlePoemSelect(randomPoem);
    }
  }, [handlePoemSelect]);

  const handleValidation = useCallback((newValidatedLines: boolean[]) => {
    setValidatedLines((previousLines) => {
      const previousCorrectCount = previousLines.filter(Boolean).length;
      const newCorrectCount = newValidatedLines.filter(Boolean).length;
      const newlyValidatedCount = newCorrectCount - previousCorrectCount;

      if (newlyValidatedCount > 0) {
        const newTotal = incrementVersesCount(newlyValidatedCount);
        setTotalVersesCount(newTotal);
      }

      return newValidatedLines;
    });
    setRecitedVerses(getRecitedVerses());
  }, []);

  const handleTextChange = useCallback((text: string, lineIndex: number) => {
    setCurrentTypedText(text);
    setCurrentLineIndex(lineIndex);
  }, []);

  const handleWordStatusesChange = useCallback(
    (statuses: WordMatchStatus[] | null, lineIndex: number) => {
      setSpokenWordStatuses(statuses);
      setCurrentLineIndex(lineIndex);
    },
    []
  );

  const handleResetProgress = useCallback(() => {
    setValidatedLines([]);
    setCurrentTypedText('');
    setCurrentLineIndex(0);
    setSpokenWordStatuses(null);
  }, []);

  const handleSelectGame = useCallback((gameId: GameId) => {
    setMode('games');
    setSelectedGameId(gameId);
    setShowCountdown(false);
    setIsRecitationFocused(false);
    writeHash(`#/jeux/${gameId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGameHighScoreChange = useCallback((gameId: GameId, score: number) => {
    setGameHighScores(saveGameHighScore(gameId, score));
  }, []);

  const activeReaderPoem = selectedPoem ?? orderedFables[0];

  return (
    <div className="min-h-screen">
      <div className="background-overlay" />

      <SideMenu
        poems={fables}
        recitedVerses={recitedVerses}
        completedPoemIds={completedPoemIds}
        mode={mode}
        readerView={readerPreferences.view}
        selectedPoemId={selectedPoem?.id.toString() ?? null}
        selectedGameId={selectedGameId}
        gameHighScores={gameHighScores}
        versesCount={totalVersesCount}
        isPinned={isMenuPinned}
        isFocused={isRecitationFocused}
        difficulty={difficulty}
        onPinnedChange={setIsMenuPinned}
        onSelectPoem={handlePoemSelect}
        onReadPoem={handleReadPoem}
        onOpenAnthology={handleOpenAnthology}
        onSelectGame={handleSelectGame}
      />

      <main
        className={cn(
          'container mx-auto px-4 py-10 transition-all duration-300',
          isMenuPinned && 'lg:pl-[400px]'
        )}
      >
        <Title text="Fables de La Fontaine" />

        <div className="max-w-4xl mx-auto mb-6 flex justify-center">
          <div
            className="inline-flex max-w-full rounded-xl bg-white/80 backdrop-blur-xs p-1 shadow-xs border border-indigo-100"
            role="tablist"
            aria-label="Mode de l'application"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'recite'}
              onClick={() => {
                setMode('recite');
                if (selectedPoem) {
                  writeHash(`#/reciter/${selectedPoem.Slug}`);
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                mode === 'recite'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-indigo-700'
              )}
            >
              <PenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
              Récitation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'read'}
              onClick={() => {
                if (readerPreferences.view === 'anthology') {
                  handleOpenAnthology();
                } else if (activeReaderPoem) {
                  handleReadPoem(activeReaderPoem);
                }
              }}
              className={cn(
                'inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                mode === 'read'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-indigo-700'
              )}
            >
              <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
              Lecture intégrale
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'games'}
              onClick={() => handleSelectGame(selectedGameId)}
              className={cn(
                'inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                mode === 'games'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-indigo-700'
              )}
            >
              <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              Jeux
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {mode === 'games' ? (
            <GamesHub
              selectedGameId={selectedGameId}
              highScores={gameHighScores}
              poems={fables}
              onSelectGame={handleSelectGame}
              onHighScoreChange={handleGameHighScoreChange}
              onReadPoem={handleReadPoem}
              onStartRecitation={handlePoemSelect}
            />
          ) : mode === 'read' ? (
            readerPreferences.view === 'anthology' ? (
              <FableAnthology
                poems={fables}
                preferences={readerPreferences}
                completedPoemIds={completedPoemIds}
                onPreferencesChange={handleReaderPreferencesChange}
                onOpenSinglePoem={handleReadPoem}
                onStartRecitation={handlePoemSelect}
              />
            ) : activeReaderPoem ? (
              <FableReader
                poem={activeReaderPoem}
                poems={fables}
                preferences={readerPreferences}
                isCompleted={completedPoemIds.has(String(activeReaderPoem.id))}
                onPreferencesChange={handleReaderPreferencesChange}
                onSelectPoem={handleReadPoem}
                onStartRecitation={handlePoemSelect}
              />
            ) : null
          ) : (
            <>
              <div className="w-full">
                <RecitationArea
                  poem={selectedPoem}
                  difficulty={difficulty}
                  onDifficultyChange={setDifficulty}
                  onValidation={handleValidation}
                  onTextChange={handleTextChange}
                  onWordStatusesChange={handleWordStatusesChange}
                  onFocusChange={setIsRecitationFocused}
                  onResetProgress={handleResetProgress}
                />
              </div>

              <div className="w-full">
                {selectedPoem ? (
                  <PoemDisplay
                    poem={selectedPoem}
                    validatedLines={validatedLines}
                    currentTypedText={currentTypedText}
                    currentLineIndex={currentLineIndex}
                    difficulty={difficulty}
                    spokenWordStatuses={spokenWordStatuses}
                  />
                ) : showCountdown ? (
                  <CountdownTimer seconds={7} onComplete={handleRandomSelection} />
                ) : (
                  <div className="bg-white/70 backdrop-blur-xs rounded-lg shadow-lg p-8 text-center space-y-4">
                    <p className="text-xl text-gray-600 font-serif">
                      Sélectionnez une fable dans le menu pour commencer la récitation
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAnthology}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                      Ou parcourir toutes les fables en lecture intégrale
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
