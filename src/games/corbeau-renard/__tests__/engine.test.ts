import { describe, expect, it } from 'vitest';
import {
  FOX_CATCH_Y,
  GROUND_Y,
  WORLD_MAX_X,
  WORLD_MIN_X,
  createInitialState,
  getScoreMultiplier,
  getTempoProfile,
  startNewGame,
  stepGame,
  triggerFlattery,
} from '../engine';

describe('Corbeau et le Renard — moteur de jeu', () => {
  it('déplace Maître Renard avec les flèches gauche et droite en respectant les bornes', () => {
    const state = startNewGame(0);
    const startX = state.foxX;

    for (let i = 0; i < 20; i++) {
      stepGame(state, 0.03, { left: false, right: true, flatterPressed: false }, () => 0.5);
    }
    expect(state.foxX).toBeGreaterThan(startX);

    for (let i = 0; i < 80; i++) {
      stepGame(state, 0.05, { left: false, right: true, flatterPressed: false }, () => 0.5);
    }
    expect(state.foxX).toBeLessThanOrEqual(WORLD_MAX_X);

    for (let i = 0; i < 120; i++) {
      stepGame(state, 0.05, { left: true, right: false, flatterPressed: false }, () => 0.5);
    }
    expect(state.foxX).toBeGreaterThanOrEqual(WORLD_MIN_X);
  });

  it('accélère progressivement le lâcher et la chute des fromages à mesure que la vanité monte', () => {
    const calm = getTempoProfile(0, 0);
    const flattered = getTempoProfile(50, 5);
    const frenzied = getTempoProfile(160, 20);

    expect(flattered.level).toBeGreaterThan(calm.level);
    expect(frenzied.level).toBeGreaterThan(flattered.level);
    expect(flattered.dropInterval).toBeLessThan(calm.dropInterval);
    expect(frenzied.dropInterval).toBeLessThan(flattered.dropInterval);
    expect(flattered.fallSpeed).toBeGreaterThan(calm.fallSpeed);
    expect(frenzied.fallSpeed).toBeGreaterThan(flattered.fallSpeed);
  });

  it('rattrape un fromage, incrémente score/combo/vanité et soigne avec le Fromage d’Or', () => {
    const state = startNewGame(0);
    state.lives = 2;
    state.foxX = 1.0;
    state.cheeses.push({
      id: 99,
      kind: 'phoenix',
      x: 1.05,
      y: FOX_CATCH_Y + 0.1,
      z: 0.1,
      vx: 0,
      vy: -2,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      spinX: 1,
      spinY: 1,
      radius: 0.42,
    });

    const events = stepGame(
      state,
      0.016,
      { left: false, right: false, flatterPressed: false },
      () => 0.5
    );

    expect(events.some((e) => e.type === 'phoenix')).toBe(true);
    expect(state.caughtCount).toBe(1);
    expect(state.combo).toBe(1);
    expect(state.score).toBe(50);
    expect(state.vanity).toBeGreaterThan(0);
    expect(state.lives).toBe(3);
  });

  it('permet de flatter activement Maître Corbeau pour booster la vanité et le multiplicateur', () => {
    const state = startNewGame(0);
    const beforeVanity = state.vanity;
    const beforeMult = getScoreMultiplier(state.combo, state.flatterBoostTimer);

    const triggered = triggerFlattery(state, () => 0.2);
    expect(triggered).toBe(true);
    expect(state.vanity).toBeGreaterThan(beforeVanity);
    expect(getScoreMultiplier(state.combo, state.flatterBoostTimer)).toBe(beforeMult + 1);
    expect(state.speechBubble?.speaker).toBe('fox');

    // Cooldown prevents spamming immediately
    expect(triggerFlattery(state, () => 0.2)).toBe(false);
  });

  it('retire une vie sur un fromage manqué et déclenche gameover à 0 vie', () => {
    const state = startNewGame(0);
    state.lives = 1;
    state.combo = 4;
    state.vanity = 60;
    state.foxX = -3.0;
    state.cheeses.push({
      id: 101,
      kind: 'classic',
      x: 2.5,
      y: GROUND_Y - 0.12,
      z: 0.1,
      vx: 0,
      vy: -3,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      spinX: 1,
      spinY: 1,
      radius: 0.37,
    });

    const events = stepGame(
      state,
      0.02,
      { left: false, right: false, flatterPressed: false },
      () => 0.5
    );

    expect(events.map((e) => e.type)).toContain('miss');
    expect(events.map((e) => e.type)).toContain('gameover');
    expect(state.lives).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.vanity).toBeLessThan(60);
    expect(state.status).toBe('gameover');
  });

  it('conserve le meilleur score initial lors de la création de l’état', () => {
    const state = createInitialState(420);
    expect(state.bestScore).toBe(420);
    expect(state.status).toBe('idle');
  });
});
