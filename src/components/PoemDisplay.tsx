import { Quote } from 'lucide-react';
import { VERSES_PER_SECTION } from '../constants/recitation';
import type { Difficulty, PoemDisplayProps } from '../types/poetry';
import { compareCharacters } from '../utils/validation';
import { cn } from '../lib/utils';
import Card from './ui/Card';

function maskForMediumDifficulty(line: string): string {
  return line.replace(/([A-Za-zÀ-ÖØ-öø-ÿœŒæÆ])([A-Za-zÀ-ÖØ-öø-ÿœŒæÆ']*)/g, (_match, first: string, rest: string) => {
    return first + '•'.repeat(rest.length);
  });
}

function renderHintedLine(
  line: string,
  absoluteIndex: number,
  validatedLines: boolean[],
  currentLineIndex: number,
  currentTypedText: string,
  difficulty: Difficulty
) {
  if (validatedLines[absoluteIndex]) {
    return line;
  }

  if (difficulty === 'hard') {
    if (absoluteIndex === currentLineIndex) {
      return (
        <span className="text-gray-400 italic text-base">
          Mode difficile : récitez le vers {absoluteIndex + 1} de mémoire...
        </span>
      );
    }
    return <span className="text-gray-300 select-none">••••••••••••</span>;
  }

  if (difficulty === 'medium') {
    return (
      <span className="text-gray-500 tracking-wide">
        {maskForMediumDifficulty(line)}
      </span>
    );
  }

  if (absoluteIndex !== currentLineIndex) {
    return <span className="text-gray-700">{line}</span>;
  }

  const charResults = compareCharacters(currentTypedText, line);

  return line.split('').map((char, i) => {
    const status = charResults[i] ?? 'pending';

    return (
      <span
        key={i}
        className={cn(
          'transition-colors',
          status === 'correct' && 'text-green-600 font-medium',
          status === 'pending' && 'text-gray-400',
          status === 'incorrect' && 'text-red-600'
        )}
      >
        {char}
      </span>
    );
  });
}

export function PoemDisplay({
  poem,
  validatedLines = [],
  currentTypedText = '',
  currentLineIndex = 0,
  difficulty = 'easy',
}: PoemDisplayProps) {
  const totalSections = Math.max(1, Math.ceil(poem.content.length / VERSES_PER_SECTION));
  const correctLines = validatedLines.filter(Boolean).length;
  const currentSection = Math.min(
    Math.floor(correctLines / VERSES_PER_SECTION),
    totalSections - 1
  );

  const start = currentSection * VERSES_PER_SECTION;
  const currentVerses = poem.content.slice(start, start + VERSES_PER_SECTION);

  return (
    <Card className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <Quote className="w-8 h-8 text-indigo-600 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-3xl font-serif text-gray-800">{poem.title}</h2>
          <p className="text-lg text-gray-600">
            Livre {poem.livre}, fable {poem.number}
            {poem.year ? ` (${poem.year})` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4 relative min-h-[200px]">
        {currentVerses.map((line, index) => {
          const absoluteIndex = start + index;
          const isValidated = Boolean(validatedLines[absoluteIndex]);

          return (
            <p
              key={absoluteIndex}
              className={cn(
                'text-xl font-serif leading-relaxed transition-all duration-300',
                isValidated &&
                  'text-gray-800 bg-green-50 scale-[1.01] pl-4 py-1 rounded-r border-l-4 border-green-500'
              )}
            >
              {renderHintedLine(
                line,
                absoluteIndex,
                validatedLines,
                currentLineIndex,
                currentTypedText,
                difficulty
              )}
            </p>
          );
        })}
      </div>

      {totalSections > 1 && (
        <div className="mt-4 text-sm text-gray-500">
          Section {currentSection + 1} / {totalSections}
        </div>
      )}
    </Card>
  );
}
