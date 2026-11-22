import { BookOpen, Hash, Library, Minus, Plus } from 'lucide-react';
import type { ReaderFontSize, ReaderPreferences } from '../../types/poetry';
import { cn } from '../../lib/utils';

interface ReaderControlsProps {
  preferences: ReaderPreferences;
  onChange: (next: ReaderPreferences) => void;
}

const FONT_SIZES: ReaderFontSize[] = ['sm', 'md', 'lg'];

export function ReaderControls({ preferences, onChange }: ReaderControlsProps) {
  const fontIndex = FONT_SIZES.indexOf(preferences.fontSize);

  const stepFontSize = (delta: number) => {
    const nextIndex = Math.min(FONT_SIZES.length - 1, Math.max(0, fontIndex + delta));
    onChange({ ...preferences, fontSize: FONT_SIZES[nextIndex] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset
        className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 m-0"
        aria-label="Mode d'affichage de lecture"
      >
        <button
          type="button"
          onClick={() => onChange({ ...preferences, view: 'single' })}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            preferences.view === 'single'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Fable
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...preferences, view: 'anthology' })}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            preferences.view === 'anthology'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Library className="w-3.5 h-3.5" aria-hidden="true" />
          Recueil complet
        </button>
      </fieldset>

      <button
        type="button"
        onClick={() =>
          onChange({ ...preferences, showLineNumbers: !preferences.showLineNumbers })
        }
        aria-pressed={preferences.showLineNumbers}
        title="Afficher ou masquer la numérotation des vers"
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
          preferences.showLineNumbers
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        )}
      >
        <Hash className="w-3.5 h-3.5" aria-hidden="true" />
        Vers
      </button>

      <fieldset
        className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0 m-0"
        aria-label="Taille du texte"
      >
        <button
          type="button"
          onClick={() => stepFontSize(-1)}
          disabled={fontIndex === 0}
          aria-label="Réduire la taille du texte"
          title="Réduire la taille du texte"
          className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed rounded-l-lg transition-colors"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <span className="px-2 text-xs font-medium text-gray-600 select-none">Aa</span>
        <button
          type="button"
          onClick={() => stepFontSize(1)}
          disabled={fontIndex === FONT_SIZES.length - 1}
          aria-label="Agrandir la taille du texte"
          title="Agrandir la taille du texte"
          className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed rounded-r-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </fieldset>
    </div>
  );
}
