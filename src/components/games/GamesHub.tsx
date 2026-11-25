import { Gamepad2, Trophy } from 'lucide-react';
import { GAMES_CATALOG, type GameHighScoreMap, type GameId } from '../../types/games';
import type { Poem } from '../../types/poetry';
import { cn } from '../../lib/utils';
import { CorbeauRenardGame } from './CorbeauRenardGame';

interface GamesHubProps {
  selectedGameId: GameId;
  highScores: GameHighScoreMap;
  poems: Poem[];
  onSelectGame: (gameId: GameId) => void;
  onHighScoreChange: (gameId: GameId, score: number) => void;
  onReadPoem: (poem: Poem) => void;
  onStartRecitation: (poem: Poem) => void;
}

export function GamesHub({
  selectedGameId,
  highScores,
  poems,
  onSelectGame,
  onHighScoreChange,
  onReadPoem,
  onStartRecitation,
}: GamesHubProps) {
  const corbeauPoem = poems.find((p) => p.Slug === 'le-corbeau-et-le-renard');

  return (
    <div className="space-y-6">
      {/* Games shelf selector (ready for more fable mini-games!) */}
      <div className="bg-white/80 backdrop-blur-xs rounded-xl shadow-xs border border-indigo-100 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-indigo-950">
              Jeux des Fables
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {GAMES_CATALOG.length} {GAMES_CATALOG.length > 1 ? 'jeux disponibles' : 'jeu disponible'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GAMES_CATALOG.map((game) => {
            const isSelected = selectedGameId === game.id;
            const best = highScores[game.id] ?? 0;
            return (
              <button
                type="button"
                key={game.id}
                aria-label={`Sélectionner le jeu ${game.title}`}
                onClick={() => onSelectGame(game.id)}
                className={cn(
                  'text-left p-3.5 rounded-xl border transition-all',
                  isSelected
                    ? 'bg-amber-50/90 border-amber-400 shadow-xs'
                    : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {game.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-semibold text-gray-900">
                        {game.title}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 shrink-0">
                        {game.techBadge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {game.description}
                    </p>
                    {best > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                        <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                        Meilleur score : {best}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Game Stage */}
      {selectedGameId === 'corbeau-renard' && (
        <CorbeauRenardGame
          bestScore={highScores['corbeau-renard'] ?? 0}
          onHighScoreChange={(score) => onHighScoreChange('corbeau-renard', score)}
          onOpenFableReader={corbeauPoem ? () => onReadPoem(corbeauPoem) : undefined}
          onStartFableRecitation={corbeauPoem ? () => onStartRecitation(corbeauPoem) : undefined}
        />
      )}
    </div>
  );
}
