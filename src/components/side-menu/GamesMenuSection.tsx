import { Gamepad2, Trophy } from 'lucide-react';
import { GAMES_CATALOG, type GameHighScoreMap, type GameId } from '../../types/games';
import type { AppMode } from '../../types/poetry';
import { cn } from '../../lib/utils';

interface GamesMenuSectionProps {
  mode: AppMode;
  selectedGameId: GameId;
  highScores: GameHighScoreMap;
  onSelectGame: (gameId: GameId) => void;
}

export function GamesMenuSection({
  mode,
  selectedGameId,
  highScores,
  onSelectGame,
}: GamesMenuSectionProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500 leading-relaxed">
        Redécouvrez les fables de Jean de La Fontaine en mini-jeux interactifs.
      </p>

      <div className="space-y-2">
        {GAMES_CATALOG.map((game) => {
          const isActive = mode === 'games' && selectedGameId === game.id;
          const bestScore = highScores[game.id] ?? 0;

          return (
            <button
              type="button"
              key={game.id}
              aria-label={`Jouer à ${game.title}`}
              onClick={() => onSelectGame(game.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all border',
                isActive
                  ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                  : 'bg-gray-50 hover:bg-gray-100 border-transparent'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5" aria-hidden="true">
                  {game.emoji}
                </span>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm font-semibold text-gray-800 truncate">
                      {game.title}
                    </span>
                    <Gamepad2
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-indigo-600' : 'text-gray-400'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{game.subtitle}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900">
                      {game.techBadge}
                    </span>
                    {bestScore > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700">
                        <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                        {bestScore}
                      </span>
                    )}
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
