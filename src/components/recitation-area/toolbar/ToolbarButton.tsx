import type { ReactNode } from 'react';

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  icon: ReactNode;
}

export function ToolbarButton({ onClick, title, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-2 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors rounded"
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}
