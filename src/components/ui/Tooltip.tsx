import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  const showTooltip = () => {
    window.clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap',
            className
          )}
          role="tooltip"
        >
          {content}
          <div
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -translate-y-1/2"
            style={{ top: '50%', left: '-4px' }}
          />
        </div>
      )}
    </div>
  );
}
