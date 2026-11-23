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

  it('affiche la définition d’un mot annoté au survol et la masque à la sortie ou avec Échap', () => {
    const poem = fables.find((f) => f.Slug === 'le-loup-et-le-chien')!;

    render(
      <FableReader
        poem={poem}
        poems={fables}
        preferences={{ showLineNumbers: true, fontSize: 'md', view: 'single' }}
        isCompleted={false}
        onPreferencesChange={vi.fn()}
        onSelectPoem={vi.fn()}
        onStartRecitation={vi.fn()}
      />
    );

    const dogueTerm = screen.getByText('Dogue');
    expect(dogueTerm).toHaveAttribute('data-terme', 'Dogue');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseOver(dogueTerm);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Dogue');
    expect(tooltip).toHaveTextContent('Grand chien de garde puissant.');

    fireEvent.mouseOut(dogueTerm);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Épinglage au clic puis fermeture via Échap
    fireEvent.click(dogueTerm);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Grand chien de garde puissant.');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('gère les termes imbriqués dans la dédicace À Monseigneur le Dauphin', () => {
    const poem = fables.find((f) => f.Slug === 'a-monseigneur-le-dauphin')!;

    render(
      <FableReader
        poem={poem}
        poems={fables}
        preferences={{ showLineNumbers: false, fontSize: 'md', view: 'single' }}
        isCompleted={false}
        onPreferencesChange={vi.fn()}
        onSelectPoem={vi.fn()}
        onStartRecitation={vi.fn()}
      />
    );

    const esopeTerm = screen.getByText('Esope');
    fireEvent.mouseOver(esopeTerm);
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Fabuliste grec/i);
  });
});
