export type EnrichedSegment =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'term';
      terme: string;
      definition: string;
      rawTerme: string;
      rawDefinition: string;
      children: EnrichedSegment[];
    };

export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const SPAN_TAG_REGEX = /(<span\b[^>]*>|<\/span>)/gi;
const ATTR_REGEX = /data-(terme|definition)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

function extractTermAttributes(openTag: string): {
  rawTerme: string;
  rawDefinition: string;
} | null {
  let rawTerme: string | null = null;
  let rawDefinition: string | null = null;

  ATTR_REGEX.lastIndex = 0;
  let match = ATTR_REGEX.exec(openTag);
  while (match !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? '';
    if (attrName === 'terme') {
      rawTerme = attrValue;
    } else if (attrName === 'definition') {
      rawDefinition = attrValue;
    }
    match = ATTR_REGEX.exec(openTag);
  }

  if (rawTerme === null || rawDefinition === null) {
    return null;
  }

  return { rawTerme, rawDefinition };
}

/**
 * Safely parses a verse containing `<span data-terme="..." data-definition="...">`
 * annotations (including nested spans) into a structured segment tree without using
 * `dangerouslySetInnerHTML`.
 */
export function parseEnrichedVerse(verse: string): EnrichedSegment[] {
  if (!verse.includes('<span')) {
    return [{ type: 'text', text: verse }];
  }

  const root: EnrichedSegment[] = [];
  const stack: Array<{ children: EnrichedSegment[]; isTerm: boolean }> = [
    { children: root, isTerm: false },
  ];

  let lastIndex = 0;
  SPAN_TAG_REGEX.lastIndex = 0;
  let match = SPAN_TAG_REGEX.exec(verse);

  while (match !== null) {
    if (match.index > lastIndex) {
      const textChunk = verse.slice(lastIndex, match.index);
      stack[stack.length - 1].children.push({ type: 'text', text: textChunk });
    }

    const token = match[0];
    if (token.toLowerCase().startsWith('</span')) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else {
      const attrs = extractTermAttributes(token);
      if (attrs) {
        const node: EnrichedSegment = {
          type: 'term',
          terme: safeDecodeURIComponent(attrs.rawTerme),
          definition: safeDecodeURIComponent(attrs.rawDefinition),
          rawTerme: attrs.rawTerme,
          rawDefinition: attrs.rawDefinition,
          children: [],
        };
        stack[stack.length - 1].children.push(node);
        stack.push({ children: node.children, isTerm: true });
      } else {
        stack.push({ children: stack[stack.length - 1].children, isTerm: false });
      }
    }

    lastIndex = SPAN_TAG_REGEX.lastIndex;
    match = SPAN_TAG_REGEX.exec(verse);
  }

  if (lastIndex < verse.length) {
    stack[stack.length - 1].children.push({
      type: 'text',
      text: verse.slice(lastIndex),
    });
  }

  return root;
}

export function countEnrichedTerms(verses?: string[]): number {
  if (!verses || verses.length === 0) return 0;
  let count = 0;
  for (const verse of verses) {
    const matches = verse.match(/data-terme\s*=/gi);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}
