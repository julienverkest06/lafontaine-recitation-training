export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export type CheeseKind = 'classic' | 'swift' | 'phoenix';

export interface FallingCheese {
  id: number;
  kind: CheeseKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinX: number;
  spinY: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: [number, number, number];
}

export interface DriftingLeaf {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  phase: number;
  scale: number;
}

export interface SpeechBubbleState {
  speaker: 'fox' | 'crow';
  text: string;
  subtext?: string;
  ttl: number;
  maxTtl: number;
}

export interface TempoProfile {
  level: number;
  title: string;
  dropInterval: number;
  fallSpeed: number;
  crowMoveSpeed: number;
  telegraphDuration: number;
  windStrength: number;
  doubleDropChance: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  flatterPressed: boolean;
}

export type GameEventType = 'catch' | 'phoenix' | 'miss' | 'drop' | 'flatter' | 'gameover';

export interface GameStepEvent {
  type: GameEventType;
  points?: number;
  combo?: number;
}

export interface CorbeauRenardState {
  status: GameStatus;
  score: number;
  bestScore: number;
  lives: number;
  maxLives: number;
  caughtCount: number;
  combo: number;
  maxCombo: number;
  vanity: number;
  flatterBoostTimer: number;
  flatterCooldown: number;
  elapsedTime: number;

  // Maître Renard (player)
  foxX: number;
  foxVx: number;
  foxFacing: number; // -1 left, +1 right
  foxLean: number;
  foxHopTimer: number;
  foxHurtTimer: number;
  foxTailPhase: number;

  // Maître Corbeau (perched in canopy)
  crowX: number;
  crowY: number;
  crowTargetX: number;
  crowBeakOpen: number; // 0..1
  crowHoldingCheese: CheeseKind;
  crowDropTimer: number;
  crowTelegraphTimer: number;
  crowBobPhase: number;
  crowExcitement: number;
  pendingDoubleDropTimer: number;

  // Active falling items & ambience
  cheeses: FallingCheese[];
  particles: Particle[];
  leaves: DriftingLeaf[];
  wind: number;
  windTarget: number;
  windTimer: number;
  nextCheeseId: number;
  speechBubble: SpeechBubbleState | null;
  lastScorePopup: { text: string; ttl: number } | null;
}

export const WORLD_MIN_X = -3.7;
export const WORLD_MAX_X = 4.35;
export const CROW_MIN_X = -2.35;
export const CROW_MAX_X = 3.65;
export const GROUND_Y = -2.45;
export const FOX_CATCH_Y = -1.35;
export const FOX_MAX_SPEED = 7.9;
export const FOX_ACCEL = 42;
export const FOX_FRICTION = 26;
export const FOX_CATCH_HALF_WIDTH = 0.88;
export const MAX_LIVES = 3;
export const FLATTER_COOLDOWN_SECONDS = 3.5;
export const FLATTER_BOOST_SECONDS = 5.5;

const FLATTERY_VERSES: readonly string[] = [
  '« Hé ! bonjour, Monsieur du Corbeau ! »',
  '« Que vous êtes joli ! »',
  '« Que vous me semblez beau ! »',
  '« Sans mentir, si votre ramage… »',
  '« Se rapporte à votre plumage… »',
  '« Vous êtes le Phénix des hôtes de ces bois ! »',
  '« Ouvrez votre beau bec ! »',
];

const CROW_BRAGS: readonly string[] = [
  '« Croââ ! Écoutez ma belle voix ! »',
  '« Croââ ! Mon plumage brille ! »',
  '« Croââ ! Encore un refrain ! »',
];

const CROW_LAUGHS: readonly string[] = [
  '« Croââ ! Trop lent, Maître Renard ! »',
  '« Croââ ! Manqué ! »',
  '« Croââ ! Quel dommage ! »',
];

export function getCanopyArchY(x: number): number {
  // Mirrors the graceful left-to-right arched tree canopy from the illustration
  const normalized = (x - 0.5) / 4.2;
  return 2.68 - normalized * normalized * 0.42 - Math.max(0, x - 2.1) * 0.14;
}

export function getTempoProfile(vanity: number, caughtCount: number): TempoProfile {
  const effectiveVanity = vanity + caughtCount * 1.4;

  if (effectiveVanity < 20) {
    return {
      level: 1,
      title: 'Perchée timide',
      dropInterval: 1.85,
      fallSpeed: 2.35,
      crowMoveSpeed: 2.6,
      telegraphDuration: 0.44,
      windStrength: 0,
      doubleDropChance: 0,
    };
  }
  if (effectiveVanity < 44) {
    return {
      level: 2,
      title: 'Plumage flatté',
      dropInterval: 1.48,
      fallSpeed: 2.85,
      crowMoveSpeed: 3.4,
      telegraphDuration: 0.38,
      windStrength: 0.25,
      doubleDropChance: 0,
    };
  }
  if (effectiveVanity < 72) {
    return {
      level: 3,
      title: 'Ramage orgueilleux',
      dropInterval: 1.18,
      fallSpeed: 3.35,
      crowMoveSpeed: 4.3,
      telegraphDuration: 0.33,
      windStrength: 0.55,
      doubleDropChance: 0.12,
    };
  }
  if (effectiveVanity < 104) {
    return {
      level: 4,
      title: 'Phénix des bois',
      dropInterval: 0.94,
      fallSpeed: 3.9,
      crowMoveSpeed: 5.2,
      telegraphDuration: 0.29,
      windStrength: 0.85,
      doubleDropChance: 0.22,
    };
  }
  if (effectiveVanity < 142) {
    return {
      level: 5,
      title: 'Virtuose effréné',
      dropInterval: 0.76,
      fallSpeed: 4.45,
      crowMoveSpeed: 6.1,
      telegraphDuration: 0.25,
      windStrength: 1.1,
      doubleDropChance: 0.3,
    };
  }

  const extra = Math.min(1, (effectiveVanity - 142) / 140);
  return {
    level: 6,
    title: 'Extase lyrique',
    dropInterval: Math.max(0.54, 0.72 - extra * 0.18),
    fallSpeed: 4.7 + extra * 0.75,
    crowMoveSpeed: 6.6 + extra * 1.4,
    telegraphDuration: 0.22,
    windStrength: 1.25 + extra * 0.35,
    doubleDropChance: 0.36,
  };
}

export function getScoreMultiplier(combo: number, flatterBoostTimer: number): number {
  const base = Math.min(5, 1 + Math.floor(combo / 3));
  return flatterBoostTimer > 0 ? base + 1 : base;
}

function createInitialLeaves(): DriftingLeaf[] {
  return Array.from({ length: 8 }, (_, index) => ({
    x: -3.5 + index * 1.1,
    y: 1.4 + (index % 3) * 0.65,
    z: -0.6 + (index % 4) * 0.35,
    vx: 0.28 + (index % 3) * 0.12,
    vy: -0.25 - (index % 2) * 0.12,
    phase: index * 1.1,
    scale: 0.75 + (index % 3) * 0.2,
  }));
}

export function createInitialState(bestScore: number = 0): CorbeauRenardState {
  const initialCrowX = 1.65;
  return {
    status: 'idle',
    score: 0,
    bestScore,
    lives: MAX_LIVES,
    maxLives: MAX_LIVES,
    caughtCount: 0,
    combo: 0,
    maxCombo: 0,
    vanity: 0,
    flatterBoostTimer: 0,
    flatterCooldown: 0,
    elapsedTime: 0,

    foxX: 0.45,
    foxVx: 0,
    foxFacing: 1,
    foxLean: 0,
    foxHopTimer: 0,
    foxHurtTimer: 0,
    foxTailPhase: 0,

    crowX: initialCrowX,
    crowY: getCanopyArchY(initialCrowX),
    crowTargetX: initialCrowX,
    crowBeakOpen: 0,
    crowHoldingCheese: 'classic',
    crowDropTimer: 0.9,
    crowTelegraphTimer: 0,
    crowBobPhase: 0,
    crowExcitement: 0,
    pendingDoubleDropTimer: 0,

    cheeses: [],
    particles: [],
    leaves: createInitialLeaves(),
    wind: 0,
    windTarget: 0,
    windTimer: 4,
    nextCheeseId: 1,
    speechBubble: null,
    lastScorePopup: null,
  };
}

export function startNewGame(bestScore: number): CorbeauRenardState {
  const state = createInitialState(bestScore);
  state.status = 'playing';
  state.speechBubble = {
    speaker: 'fox',
    text: FLATTERY_VERSES[0] ?? '« Hé ! bonjour, Monsieur du Corbeau ! »',
    subtext: 'Attrapez le fromage !',
    ttl: 2.6,
    maxTtl: 2.6,
  };
  return state;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickNextCheeseKind(
  level: number,
  lives: number,
  maxLives: number,
  rng: () => number
): CheeseKind {
  const roll = rng();
  if (level >= 3 && lives < maxLives && roll < 0.14) {
    return 'phoenix';
  }
  if (level >= 4 && roll < 0.08) {
    return 'phoenix';
  }
  if (level >= 2 && roll < 0.34) {
    return 'swift';
  }
  return 'classic';
}

function pickNextCrowTargetX(
  currentCrowX: number,
  foxX: number,
  tempo: TempoProfile,
  rng: () => number
): number {
  // Keep every drop reachable by the fox given drop interval + fall duration
  const fallDuration = (getCanopyArchY(currentCrowX) - FOX_CATCH_Y) / tempo.fallSpeed;
  const maxReachableShift = Math.min(
    CROW_MAX_X - CROW_MIN_X,
    FOX_MAX_SPEED * (tempo.dropInterval * 0.65 + fallDuration * 0.55)
  );

  const desiredX = CROW_MIN_X + rng() * (CROW_MAX_X - CROW_MIN_X);
  const clampedToReach = clamp(
    desiredX,
    foxX - maxReachableShift * 0.82,
    foxX + maxReachableShift * 0.82
  );

  // Encourage lively lateral movement so the crow does not stay static in one spot
  let candidate = clamp(clampedToReach, CROW_MIN_X, CROW_MAX_X);
  if (Math.abs(candidate - currentCrowX) < 0.65) {
    const nudge = currentCrowX > 0.6 ? -1.4 : 1.4;
    candidate = clamp(currentCrowX + nudge, CROW_MIN_X, CROW_MAX_X);
  }
  return candidate;
}

function spawnCheese(
  state: CorbeauRenardState,
  kind: CheeseKind,
  tempo: TempoProfile,
  rng: () => number
): void {
  const speedFactor = kind === 'swift' ? 1.24 : kind === 'phoenix' ? 1.1 : 1.0;
  const radius = kind === 'swift' ? 0.31 : kind === 'phoenix' ? 0.42 : 0.37;

  state.cheeses.push({
    id: state.nextCheeseId++,
    kind,
    x: state.crowX + 0.08,
    y: state.crowY - 0.46,
    z: 0.12,
    vx: state.wind * 0.35,
    vy: -tempo.fallSpeed * speedFactor * 0.72,
    rotX: rng() * Math.PI,
    rotY: rng() * Math.PI,
    rotZ: 0,
    spinX: 1.6 + rng() * 1.8,
    spinY: 2.0 + rng() * 2.2,
    radius,
  });
}

function spawnBurst(
  state: CorbeauRenardState,
  x: number,
  y: number,
  color: [number, number, number],
  count: number,
  rng: () => number
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rng() * 0.4;
    const speed = 1.4 + rng() * 2.6;
    state.particles.push({
      x,
      y,
      z: 0.25 + (rng() - 0.5) * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 1.2,
      vz: (rng() - 0.5) * 1.2,
      life: 0.45 + rng() * 0.35,
      maxLife: 0.8,
      size: 0.09 + rng() * 0.08,
      color,
    });
  }
}

export function triggerFlattery(
  state: CorbeauRenardState,
  rng: () => number = Math.random
): boolean {
  if (state.status !== 'playing' || state.flatterCooldown > 0) {
    return false;
  }

  state.flatterCooldown = FLATTER_COOLDOWN_SECONDS;
  state.flatterBoostTimer = FLATTER_BOOST_SECONDS;
  state.vanity = Math.min(260, state.vanity + 18);
  state.crowExcitement = 1;
  state.foxHopTimer = 0.28;
  // Accelerate the crow's next drop immediately!
  state.crowDropTimer = Math.min(state.crowDropTimer, 0.28);

  const verseIndex = Math.floor(rng() * FLATTERY_VERSES.length);
  state.speechBubble = {
    speaker: 'fox',
    text: FLATTERY_VERSES[verseIndex] ?? FLATTERY_VERSES[0],
    subtext: 'Vanité du Corbeau +18 · Bonus ×+1 !',
    ttl: 2.3,
    maxTtl: 2.3,
  };
  spawnBurst(state, state.foxX, FOX_CATCH_Y + 0.3, [0.96, 0.78, 0.25], 8, rng);
  return true;
}

export function stepGame(
  state: CorbeauRenardState,
  dtRaw: number,
  input: GameInput,
  rng: () => number = Math.random
): GameStepEvent[] {
  const dt = Math.min(0.05, Math.max(0, dtRaw));
  const events: GameStepEvent[] = [];

  state.elapsedTime += dt;
  state.crowBobPhase += dt * (2.6 + state.crowExcitement * 3.0);
  state.foxTailPhase += dt * (3.2 + Math.abs(state.foxVx) * 1.15);

  // Always animate drifting background leaves even in idle/gameover for living storybook feel
  for (const leaf of state.leaves) {
    leaf.phase += dt * 2.1;
    leaf.x += (leaf.vx + state.wind * 0.9) * dt;
    leaf.y += (leaf.vy + Math.sin(leaf.phase) * 0.16) * dt;
    if (leaf.y < GROUND_Y - 0.3 || leaf.x > WORLD_MAX_X + 1.5 || leaf.x < WORLD_MIN_X - 2.0) {
      leaf.x = -3.8 + rng() * 7.6;
      leaf.y = 2.8 + rng() * 0.9;
      leaf.z = -0.7 + rng() * 1.1;
    }
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    if (!p) continue;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.vy -= 5.2 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }

  if (state.status !== 'playing') {
    state.crowY = getCanopyArchY(state.crowX);
    return events;
  }

  if (input.flatterPressed && triggerFlattery(state, rng)) {
    events.push({ type: 'flatter' });
  }

  const tempo = getTempoProfile(state.vanity, state.caughtCount);

  if (state.flatterCooldown > 0) {
    state.flatterCooldown = Math.max(0, state.flatterCooldown - dt);
  }
  if (state.flatterBoostTimer > 0) {
    state.flatterBoostTimer = Math.max(0, state.flatterBoostTimer - dt);
  }
  if (state.foxHopTimer > 0) {
    state.foxHopTimer = Math.max(0, state.foxHopTimer - dt);
  }
  if (state.foxHurtTimer > 0) {
    state.foxHurtTimer = Math.max(0, state.foxHurtTimer - dt);
  }
  if (state.crowExcitement > 0) {
    state.crowExcitement = Math.max(0, state.crowExcitement - dt * 0.65);
  }
  if (state.speechBubble) {
    state.speechBubble.ttl -= dt;
    if (state.speechBubble.ttl <= 0) {
      state.speechBubble = null;
    }
  }
  if (state.lastScorePopup) {
    state.lastScorePopup.ttl -= dt;
    if (state.lastScorePopup.ttl <= 0) {
      state.lastScorePopup = null;
    }
  }

  // Wind simulation at higher vanity levels
  state.windTimer -= dt;
  if (state.windTimer <= 0) {
    state.windTimer = 3.2 + rng() * 3.0;
    state.windTarget =
      tempo.windStrength > 0 ? (rng() * 2 - 1) * tempo.windStrength : 0;
  }
  state.wind += (state.windTarget - state.wind) * Math.min(1, dt * 1.4);

  // Fox movement (left / right arrow keys)
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (moveDir !== 0) {
    state.foxVx += moveDir * FOX_ACCEL * dt;
    state.foxVx = clamp(state.foxVx, -FOX_MAX_SPEED, FOX_MAX_SPEED);
    state.foxFacing = moveDir;
  } else {
    const decel = FOX_FRICTION * dt;
    if (Math.abs(state.foxVx) <= decel) {
      state.foxVx = 0;
    } else {
      state.foxVx -= Math.sign(state.foxVx) * decel;
    }
  }

  state.foxX = clamp(state.foxX + state.foxVx * dt, WORLD_MIN_X, WORLD_MAX_X);
  if (state.foxX === WORLD_MIN_X && state.foxVx < 0) state.foxVx = 0;
  if (state.foxX === WORLD_MAX_X && state.foxVx > 0) state.foxVx = 0;

  const targetLean = (state.foxVx / FOX_MAX_SPEED) * 0.24;
  state.foxLean += (targetLean - state.foxLean) * Math.min(1, dt * 12);

  // Crow movement along the upper arched canopy
  const crowDelta = state.crowTargetX - state.crowX;
  const maxCrowStep = tempo.crowMoveSpeed * dt;
  if (Math.abs(crowDelta) <= maxCrowStep) {
    state.crowX = state.crowTargetX;
  } else {
    state.crowX += Math.sign(crowDelta) * maxCrowStep;
  }
  state.crowY = getCanopyArchY(state.crowX);

  // Handle queued rhythmic double drop ("Trille lyrique")
  if (state.pendingDoubleDropTimer > 0) {
    state.pendingDoubleDropTimer -= dt;
    if (state.pendingDoubleDropTimer <= 0) {
      const swiftKind: CheeseKind = rng() < 0.55 ? 'swift' : 'classic';
      spawnCheese(state, swiftKind, tempo, rng);
      state.crowBeakOpen = 1;
      events.push({ type: 'drop' });
    }
  }

  // Crow drop telegraph and release loop
  if (state.crowTelegraphTimer > 0) {
    state.crowTelegraphTimer -= dt;
    const progress = 1 - Math.max(0, state.crowTelegraphTimer / tempo.telegraphDuration);
    state.crowBeakOpen = Math.min(1, progress * 1.15);

    if (state.crowTelegraphTimer <= 0) {
      spawnCheese(state, state.crowHoldingCheese, tempo, rng);
      events.push({ type: 'drop' });
      state.crowExcitement = Math.min(1, state.crowExcitement + 0.45);

      // Occasionally schedule a musical double-drop at higher vanity levels
      if (tempo.doubleDropChance > 0 && rng() < tempo.doubleDropChance) {
        state.pendingDoubleDropTimer = 0.38;
        const hopOffset = state.crowX > 0.5 ? -1.15 : 1.15;
        state.crowTargetX = clamp(state.crowX + hopOffset, CROW_MIN_X, CROW_MAX_X);
      } else {
        state.crowTargetX = pickNextCrowTargetX(state.crowX, state.foxX, tempo, rng);
      }

      state.crowHoldingCheese = pickNextCheeseKind(
        tempo.level,
        state.lives,
        state.maxLives,
        rng
      );
      const jitter = 0.88 + rng() * 0.24;
      state.crowDropTimer = tempo.dropInterval * jitter;
    }
  } else {
    state.crowBeakOpen = Math.max(0, state.crowBeakOpen - dt * 4.5);
    state.crowDropTimer -= dt;
    if (state.crowDropTimer <= 0 && Math.abs(state.crowTargetX - state.crowX) < 0.85) {
      state.crowTelegraphTimer = tempo.telegraphDuration;
      if (tempo.level >= 3 && !state.speechBubble && rng() < 0.28) {
        const brag = CROW_BRAGS[Math.floor(rng() * CROW_BRAGS.length)] ?? CROW_BRAGS[0];
        state.speechBubble = {
          speaker: 'crow',
          text: brag,
          ttl: 1.5,
          maxTtl: 1.5,
        };
      }
    }
  }

  // Update falling cheeses & check catch / miss collisions
  const gravity = 2.6 + tempo.level * 0.48;
  for (let i = state.cheeses.length - 1; i >= 0; i--) {
    const cheese = state.cheeses[i];
    if (!cheese) continue;

    cheese.vy -= gravity * dt;
    cheese.vx += state.wind * 0.72 * dt;
    cheese.vx = clamp(cheese.vx, -1.9, 1.9);
    cheese.x = clamp(cheese.x + cheese.vx * dt, WORLD_MIN_X + 0.15, WORLD_MAX_X - 0.15);
    cheese.y += cheese.vy * dt;
    cheese.rotX += cheese.spinX * dt;
    cheese.rotY += cheese.spinY * dt;
    cheese.rotZ += cheese.vx * 0.8 * dt;

    // Catch zone around Maître Renard's upturned snout & paws
    const inVerticalCatchZone =
      cheese.y <= FOX_CATCH_Y + cheese.radius * 0.9 &&
      cheese.y >= GROUND_Y + 0.15;
    const inHorizontalCatchZone =
      Math.abs(cheese.x - state.foxX) <= FOX_CATCH_HALF_WIDTH + cheese.radius * 0.45;

    if (inVerticalCatchZone && inHorizontalCatchZone) {
      state.cheeses.splice(i, 1);
      state.caughtCount += 1;
      state.combo += 1;
      if (state.combo > state.maxCombo) {
        state.maxCombo = state.combo;
      }

      const multiplier = getScoreMultiplier(state.combo, state.flatterBoostTimer);
      const basePoints =
        cheese.kind === 'phoenix' ? 50 : cheese.kind === 'swift' ? 20 : 10;
      const earned = basePoints * multiplier;
      state.score += earned;
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
      }

      const vanityGain =
        cheese.kind === 'phoenix' ? 18 : cheese.kind === 'swift' ? 14 : 10;
      state.vanity = Math.min(260, state.vanity + vanityGain);
      state.foxHopTimer = 0.26;
      state.crowExcitement = 1;

      if (cheese.kind === 'phoenix' && state.lives < state.maxLives) {
        state.lives += 1;
      }

      const burstColor: [number, number, number] =
        cheese.kind === 'phoenix' ? [1.0, 0.88, 0.28] : [0.97, 0.77, 0.25];
      spawnBurst(state, cheese.x, FOX_CATCH_Y + 0.15, burstColor, 12, rng);

      state.lastScorePopup = {
        text:
          cheese.kind === 'phoenix'
            ? `+${earned} · Fromage d'Or !`
            : multiplier > 1
              ? `+${earned} (×${multiplier})`
              : `+${earned}`,
        ttl: 1.25,
      };

      if (state.caughtCount % 3 === 1 || cheese.kind === 'phoenix') {
        const verse =
          FLATTERY_VERSES[(state.caughtCount - 1) % FLATTERY_VERSES.length] ??
          FLATTERY_VERSES[0];
        state.speechBubble = {
          speaker: 'fox',
          text: verse,
          subtext:
            cheese.kind === 'phoenix'
              ? 'Fromage d’Or ! +1 vie & ramage enflammé'
              : `Série ${state.combo} · Tempo ${getTempoProfile(state.vanity, state.caughtCount).title}`,
          ttl: 2.1,
          maxTtl: 2.1,
        };
      }

      events.push({
        type: cheese.kind === 'phoenix' ? 'phoenix' : 'catch',
        points: earned,
        combo: state.combo,
      });
      continue;
    }

    // Missed cheese hits the meadow floor
    if (cheese.y < GROUND_Y - 0.1) {
      state.cheeses.splice(i, 1);
      state.lives = Math.max(0, state.lives - 1);
      state.combo = 0;
      state.vanity = Math.max(0, state.vanity - 18);
      state.foxHurtTimer = 0.45;
      spawnBurst(state, cheese.x, GROUND_Y + 0.05, [0.85, 0.65, 0.22], 10, rng);

      const laugh = CROW_LAUGHS[Math.floor(rng() * CROW_LAUGHS.length)] ?? CROW_LAUGHS[0];
      state.speechBubble = {
        speaker: 'crow',
        text: laugh,
        subtext:
          state.lives > 0
            ? `${state.lives} ${state.lives > 1 ? 'chances restantes' : 'chance restante'}`
            : 'Partie terminée !',
        ttl: 2.0,
        maxTtl: 2.0,
      };

      events.push({ type: 'miss' });

      if (state.lives <= 0) {
        state.status = 'gameover';
        state.cheeses = [];
        events.push({ type: 'gameover' });
        break;
      }
    }
  }

  return events;
}
