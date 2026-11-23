import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Poem } from '../../types/poetry';
import { cn } from '../../lib/utils';
import {
  parseEnrichedVerse,
  safeDecodeURIComponent,
  type EnrichedSegment,
} from '../../utils/enrichedText';

interface PopoverState {
  terme: string;
  definition: string;
  x: number;
  y: number;
  above: boolean;
  pinned: boolean;
}

interface EnrichedVersesProps {
  poem: Poem;
  showLineNumbers: boolean;
  verseClassName: string;
  containerClassName?: string;
  lineGapClassName?: string;
  lineNumberWidthClassName?: string;
  as?: 'article' | 'div';
  ariaLabel?: string;
}

const POPOVER_MAX_WIDTH = 300;
const VIEWPORT_MARGIN = 16;

function renderSegments(segments: EnrichedSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    if (segment.type === 'text') {
      return segment.text;
    }

    return (
      <span
        key={key}
        data-terme={segment.rawTerme}
        data-definition={segment.rawDefinition}
        className="terme-annotation"
      >
        {renderSegments(segment.children, key)}
      </span>
    );
  });
}

function computePopoverPosition(el: HTMLElement): { x: number; y: number; above: boolean } {
  const rect = el.getBoundingClientRect();
  const above = rect.top > 160;
  const rawX = rect.left + rect.width / 2;

  const halfWidth = POPOVER_MAX_WIDTH / 2 + VIEWPORT_MARGIN;
  const viewportWidth = window.innerWidth;
  const x =
    viewportWidth > halfWidth * 2
      ? Math.min(Math.max(rawX, halfWidth), viewportWidth - halfWidth)
      : viewportWidth / 2;

  return {
    x,
    y: above ? rect.top - 10 : rect.bottom + 10,
    above,
  };
}

export function EnrichedVerses({
  poem,
  showLineNumbers,
  verseClassName,
  containerClassName,
  lineGapClassName = 'gap-4',
  lineNumberWidthClassName = 'w-7',
  as = 'div',
  ariaLabel,
}: EnrichedVersesProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const pinnedRef = useRef(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const setContainerNode = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  const parsedLines = useMemo(() => {
    const sourceLines =
      poem.enrichedContent && poem.enrichedContent.length === poem.content.length
        ? poem.enrichedContent
        : poem.content;

    return sourceLines.map((line) => parseEnrichedVerse(line));
  }, [poem.content, poem.enrichedContent]);

  const hide = useCallback(() => {
    activeElementRef.current = null;
    pinnedRef.current = false;
    setPopover(null);
  }, []);

  const show = useCallback((el: HTMLElement, pinned: boolean) => {
    const rawDefinition = el.dataset.definition;
    if (!rawDefinition) return;

    const rawTerme = el.dataset.terme ?? el.textContent ?? '';
    const { x, y, above } = computePopoverPosition(el);

    activeElementRef.current = el;
    pinnedRef.current = pinned;
    setPopover({
      terme: safeDecodeURIComponent(rawTerme),
      definition: safeDecodeURIComponent(rawDefinition),
      x,
      y,
      above,
      pinned,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-terme]');
      if (el && container.contains(el)) {
        show(el, false);
      }
    };

    const onMouseOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-terme]');
      if (!el) return;

      const related = (event.relatedTarget as HTMLElement | null)?.closest<HTMLElement>(
        '[data-terme]'
      );
      if (!related || !container.contains(related)) {
        if (!pinnedRef.current) {
          hide();
        }
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-terme]');
      if (el && container.contains(el)) {
        event.stopPropagation();
        if (activeElementRef.current === el && pinnedRef.current) {
          hide();
        } else {
          show(el, true);
        }
      }
    };

    container.addEventListener('mouseover', onMouseOver);
    container.addEventListener('mouseout', onMouseOut);
    container.addEventListener('click', onClick);

    return () => {
      container.removeEventListener('mouseover', onMouseOver);
      container.removeEventListener('mouseout', onMouseOut);
      container.removeEventListener('click', onClick);
    };
  }, [show, hide]);

  useEffect(() => {
    if (!popover) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-terme]')) {
        hide();
      }
    };

    const onScroll = () => hide();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('click', onDocumentClick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [popover, hide]);

  const versesContent = parsedLines.map((segments, index) => (
    <div key={index} className={cn('flex items-baseline', lineGapClassName)}>
      {showLineNumbers && (
        <span
          className={cn(
            'text-xs font-sans text-gray-400 select-none text-right shrink-0 tabular-nums',
            lineNumberWidthClassName
          )}
          aria-hidden="true"
        >
          {index + 1}
        </span>
      )}
      <p className={cn('font-serif text-gray-800', verseClassName)}>
        {renderSegments(segments, `v-${poem.id}-${index}`)}
      </p>
    </div>
  ));

  return (
    <>
      {as === 'article' ? (
        <article ref={setContainerNode} aria-label={ariaLabel} className={containerClassName}>
          {versesContent}
        </article>
      ) : (
        <div ref={setContainerNode} aria-label={ariaLabel} className={containerClassName}>
          {versesContent}
        </div>
      )}

      {popover && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: `${popover.x}px`,
            top: `${popover.y}px`,
            transform: popover.above
              ? 'translateX(-50%) translateY(-100%)'
              : 'translateX(-50%)',
            zIndex: 50,
            maxWidth: `${POPOVER_MAX_WIDTH}px`,
          }}
          className="terme-popover w-max bg-white border border-indigo-300 shadow-xl rounded-lg px-4 py-3 pointer-events-none"
        >
          {popover.terme && (
            <span className="block font-serif italic font-semibold text-indigo-700 text-sm mb-1">
              {popover.terme}
            </span>
          )}
          <p className="font-serif text-sm text-gray-700 leading-relaxed m-0">
            {popover.definition}
          </p>
        </div>
      )}
    </>
  );
}
