export type GameId = 'corbeau-renard';

export interface GameDefinition {
  id: GameId;
  slug: string;
  title: string;
  subtitle: string;
  fableSlug: string;
  emoji: string;
  techBadge: string;
  description: string;
}

export type GameHighScoreMap = Partial<Record<GameId, number>>;

export const GAMES_CATALOG: readonly GameDefinition[] = [
  {
    id: 'corbeau-renard',
    slug: 'corbeau-renard',
    title: 'Le Corbeau et le Renard',
    subtitle: 'Rattrapez le fromage en 3D',
    fableSlug: 'le-corbeau-et-le-renard',
    emoji: '🦊',
    techBadge: '3D · HTML-in-Canvas',
    description:
      'Incarnez Maître Renard sous l’arbre gravé, flattez la vanité de Maître Corbeau et rattrapez ses fromages de plus en plus rapides !',
  },
] as const;

export function findGameBySlug(slug: string | undefined): GameDefinition | undefined {
  if (!slug) return undefined;
  return GAMES_CATALOG.find((game) => game.slug === slug);
}
