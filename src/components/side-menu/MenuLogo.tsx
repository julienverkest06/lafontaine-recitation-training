import { BookOpen, Feather } from 'lucide-react';

export function MenuLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative" aria-hidden="true">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg shadow-xs flex items-center justify-center">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center shadow-xs">
          <Feather className="w-3 h-3" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-serif font-bold text-gray-900 leading-tight">
          La Fontaine
        </span>
        <span className="text-xs text-indigo-700 font-medium tracking-wide">
          Lecture &amp; Récitation
        </span>
      </div>
    </div>
  );
}
