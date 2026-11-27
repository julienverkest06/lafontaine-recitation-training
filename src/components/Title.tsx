interface TitleProps {
  text: string;
}

export function Title({ text }: TitleProps) {
  return (
    <header className="text-center mb-4">
      <h1 className="bookplate-title">
        <span className="bookplate-title-rule" aria-hidden="true">
          <span className="bookplate-title-line" />
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
            <rect x="4" y="0.5" width="4.95" height="4.95" transform="rotate(45 4 0.5)" />
          </svg>
        </span>
        <span>{text}</span>
        <span className="bookplate-title-rule" aria-hidden="true">
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
            <rect x="4" y="0.5" width="4.95" height="4.95" transform="rotate(45 4 0.5)" />
          </svg>
          <span className="bookplate-title-line" />
        </span>
      </h1>
    </header>
  );
}
