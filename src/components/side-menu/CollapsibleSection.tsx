import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CollapsibleSectionProps {
  title: string;
  emoji: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  emoji,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group"
      >
        <span className="font-serif text-lg text-indigo-900 flex items-center gap-2">
          <span
            className="text-xl opacity-80 group-hover:scale-110 transition-transform"
            aria-hidden="true"
          >
            {emoji}
          </span>
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-indigo-600 transition-transform',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[2000px]' : 'max-h-0'
        )}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
