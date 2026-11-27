import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Difficulty } from '../../../types/poetry';
import Card from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Tooltip } from '../../ui/Tooltip';
import { DifficultySelector } from '../DifficultySelector';
import { ProgressBar } from '../ProgressBar';
import { VerseProgressList } from '../VerseProgressList';
import { Toolbar } from '../toolbar/Toolbar';
import { ToolbarButton } from '../toolbar/ToolbarButton';
import { ToolbarSeparator } from '../toolbar/ToolbarSeparator';
import { cn } from '../../../lib/utils';

type PendingActionType = 'restart' | 'mode-switch' | 'difficulty';

interface PendingAction {
  type: PendingActionType;
  callback: () => void;
}

const CONFIRM_CONTENT: Record<PendingActionType, { title: string; message: string }> = {
  restart: {
    title: 'Recommencer la récitation ?',
    message: 'Votre progression actuelle sera perdue. Voulez-vous vraiment recommencer ?',
  },
  'mode-switch': {
    title: 'Changer de mode de récitation ?',
    message: 'Votre progression actuelle sera perdue. Voulez-vous vraiment changer de mode ?',
  },
  difficulty: {
    title: 'Changer le niveau de difficulté ?',
    message:
      'Votre progression actuelle sera réinitialisée pour ce nouveau niveau. Voulez-vous continuer ?',
  },
};

const BLUR_AMOUNT: Record<Difficulty, string> = {
  easy: 'backdrop-blur-[2px]',
  medium: 'backdrop-blur-[3px]',
  hard: 'backdrop-blur-[4px]',
};

interface RecitationShellProps {
  heading: string;
  isFocused: boolean;
  isDirty: boolean;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onModeSwitch: () => void;
  onRestart: () => void;
  modeSwitchTitle: string;
  modeSwitchIcon: ReactNode;
  modeSwitchTooltip: ReactNode;
  totalVerses: number;
  completedVerses: number;
  sectionLines: boolean[];
  currentSection: number;
  versesPerSection: number;
  getOpacity: (index: number) => number;
  children: ReactNode;
}

export function RecitationShell({
  heading,
  isFocused,
  isDirty,
  difficulty,
  onDifficultyChange,
  onModeSwitch,
  onRestart,
  modeSwitchTitle,
  modeSwitchIcon,
  modeSwitchTooltip,
  totalVerses,
  completedVerses,
  sectionLines,
  currentSection,
  versesPerSection,
  getOpacity,
  children,
}: RecitationShellProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const runOrConfirm = (type: PendingActionType, callback: () => void) => {
    if (isDirty) {
      setPendingAction({ type, callback });
      setShowConfirmDialog(true);
    } else {
      callback();
    }
  };

  const progress = totalVerses > 0 ? (completedVerses / totalVerses) * 100 : 0;
  const dialogCopy = pendingAction
    ? CONFIRM_CONTENT[pendingAction.type]
    : { title: '', message: '' };

  return (
    <>
      {isFocused && (
        <div
          className={cn(
            'fixed inset-0 bg-black/20 transition-all duration-300 ease-in-out z-10',
            BLUR_AMOUNT[difficulty]
          )}
          aria-hidden="true"
        />
      )}

      <Card
        className={cn(
          'w-full transition-all duration-500 relative z-20 shadow-md border border-gray-200',
          isFocused && 'ring-4 ring-indigo-100'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h2 className="text-base font-serif font-semibold text-gray-900 whitespace-nowrap">
              {heading}
            </h2>
            <Toolbar>
              <Tooltip content={modeSwitchTooltip} className="left-full ml-2">
                <ToolbarButton
                  onClick={() => runOrConfirm('mode-switch', onModeSwitch)}
                  title={modeSwitchTitle}
                  icon={modeSwitchIcon}
                />
              </Tooltip>
              <ToolbarSeparator />
              <DifficultySelector
                difficulty={difficulty}
                onChange={(newDifficulty) =>
                  runOrConfirm('difficulty', () => {
                    onRestart();
                    onDifficultyChange(newDifficulty);
                  })
                }
              />
              <ToolbarSeparator />
              <ToolbarButton
                onClick={() => runOrConfirm('restart', onRestart)}
                title="Recommencer"
                icon={<RotateCcw className="w-4 h-4" />}
              />
            </Toolbar>
          </div>
          <ProgressBar
            progress={progress}
            totalVerses={totalVerses}
            completedVerses={completedVerses}
          />
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">{children}</div>
          <VerseProgressList
            validatedLines={sectionLines}
            currentSection={currentSection}
            versesPerSection={versesPerSection}
            getOpacity={getOpacity}
          />
        </div>
      </Card>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          pendingAction?.callback();
        }}
        title={dialogCopy.title}
        message={dialogCopy.message}
      />
    </>
  );
}
