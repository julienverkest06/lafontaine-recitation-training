import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { fables } from '../../../data/fables';
import { GamesHub } from '../GamesHub';

describe('Rubrique Jeux — GamesHub et Le Corbeau et le Renard 3D', () => {
  it('affiche le jeu 3D HTML-in-Canvas avec les attributs layoutsubtree/drawable et permet de démarrer', () => {
    const onReadPoem = vi.fn();
    const onStartRecitation = vi.fn();

    render(
      <GamesHub
        selectedGameId="corbeau-renard"
        highScores={{ 'corbeau-renard': 120 }}
        poems={fables}
        onSelectGame={vi.fn()}
        onHighScoreChange={vi.fn()}
        onReadPoem={onReadPoem}
        onStartRecitation={onStartRecitation}
      />
    );

    expect(screen.getByText('Jeux des Fables')).toBeInTheDocument();
    expect(screen.getByTestId('game-best-score')).toHaveTextContent('120');

    const canvas = screen.getByLabelText(/Scène 3D interactive Le Corbeau et le Renard/i);
    expect(canvas).toHaveAttribute('layoutsubtree', '');
    expect(canvas).toHaveAttribute('content', 'drawable');

    // Live HTML-in-Canvas subtrees inside <canvas>
    const hudNode = canvas.querySelector('#hic-hud-card');
    const bubbleNode = canvas.querySelector('#hic-bubble-card');
    expect(hudNode).not.toBeNull();
    expect(hudNode).toHaveAttribute('drawable', '');
    expect(bubbleNode).not.toBeNull();
    expect(bubbleNode).toHaveAttribute('drawable', '');

    // Start the game
    fireEvent.click(screen.getByRole('button', { name: /Commencer la partie/i }));
    expect(screen.getByRole('button', { name: /Mettre en pause/i })).toBeInTheDocument();

    // Pause via button
    fireEvent.click(screen.getByRole('button', { name: /Mettre en pause/i }));
    expect(screen.getByRole('heading', { name: 'Pause' })).toBeInTheDocument();

    // Navigation shortcuts back to the fable
    fireEvent.click(screen.getByRole('button', { name: /Lire la fable/i }));
    expect(onReadPoem).toHaveBeenCalledWith(
      expect.objectContaining({ Slug: 'le-corbeau-et-le-renard' })
    );

    fireEvent.click(screen.getByRole('button', { name: /Réciter/i }));
    expect(onStartRecitation).toHaveBeenCalledWith(
      expect.objectContaining({ Slug: 'le-corbeau-et-le-renard' })
    );
  });
});
