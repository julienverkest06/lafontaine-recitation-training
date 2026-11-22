import type { CSSProperties } from 'react';

interface TitleProps {
  text: string;
}

export function Title({ text }: TitleProps) {
  return (
    <header className="text-center mb-4">
      <h1 className="elegant-title text-xl md:text-4xl" aria-label={text}>
        {text.split('').map((char, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block mx-[0.02em]"
            style={{ '--char-index': i } as CSSProperties}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </header>
  );
}
