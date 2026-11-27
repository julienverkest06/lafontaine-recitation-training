import { BookOpen } from 'lucide-react';

interface StatsProps {
  versesCount: number;
}

export function Stats({ versesCount }: StatsProps) {
  return (
    <div className="bg-indigo-50 rounded-lg p-4 flex items-center gap-3">
      <BookOpen className="w-6 h-6 text-indigo-600" />
      <div>
        <div className="text-sm text-indigo-900/80 font-medium">Total des vers récités</div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{versesCount}</div>
      </div>
    </div>
  );
}
