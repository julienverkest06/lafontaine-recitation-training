interface ProgressBarProps {
  progress: number;
  totalVerses: number;
  completedVerses: number;
}

export function ProgressBar({ progress, totalVerses, completedVerses }: ProgressBarProps) {
  return (
    <div className="hidden md:flex items-center gap-4">
      <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 tabular-nums">
        {completedVerses}/{totalVerses}
      </span>
    </div>
  );
}
