import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { fables } from '../../data/fables';
import { FableReader } from '../reader/FableReader';

describe('FableReader', () => {
  it('affiche tous les vers de la fable et permet de lancer la récitation', () => {
    const poem = fables.find((f) => f.Slug === 'le-corbeau-et-le-renard')!;
    const onStartRecitation = vi.fn();

    render(
      <FableReader
        poem={poem}
        poems={fables}
        preferences={{ showLineNumbers: true, fontSize: 'md', view: 'single' }}
        isCompleted={false}
        onPreferencesChange={vi.fn()}
        onSelectPoem={vi.fn()}
        onStartRecitation={onStartRecitation}
      />
    );

    expect(screen.getByRole('heading', { name: poem.title })).toBeInTheDocument();
    expect(screen.getByText(poem.content[0])).toBeInTheDocument();
    expect(screen.getByText(poem.content[poem.content.length - 1])).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /S'entraîner sur cette fable/i }));
    expect(onStartRecitation).toHaveBeenCalledWith(poem);
  });
});
