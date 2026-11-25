import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Info,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  createInitialState,
  getScoreMultiplier,
  getTempoProfile,
  startNewGame,
  stepGame,
  type CorbeauRenardState,
  type GameStatus,
} from '../../games/corbeau-renard/engine';
import type { HtmlInCanvasMode } from '../../games/corbeau-renard/htmlInCanvasBridge';
import { CorbeauRenardRenderer } from '../../games/corbeau-renard/renderer';
import { StorybookAudio } from '../../games/corbeau-renard/sound';
import { cn } from '../../lib/utils';

interface CorbeauRenardGameProps {
  bestScore: number;
  onHighScoreChange: (score: number) => void;
  onOpenFableReader?: () => void;
  onStartFableRecitation?: () => void;
}

interface UiSnapshot {
  status: GameStatus;
  score: number;
  bestScore: number;
  lives: number;
  maxLives: number;
  caughtCount: number;
  combo: number;
  maxCombo: number;
  vanity: number;
  tempoLevel: number;
  tempoTitle: string;
  multiplier: number;
  flatterReady: boolean;
  flatterCooldown: number;
  speechSpeaker: 'fox' | 'crow' | null;
  speechText: string;
  speechSubtext: string;
  scorePopup: string;
}

function toSnapshot(state: CorbeauRenardState): UiSnapshot {
  const tempo = getTempoProfile(state.vanity, state.caughtCount);
  return {
    status: state.status,
    score: state.score,
    bestScore: state.bestScore,
    lives: state.lives,
    maxLives: state.maxLives,
    caughtCount: state.caughtCount,
    combo: state.combo,
    maxCombo: state.maxCombo,
    vanity: Math.round(state.vanity),
    tempoLevel: tempo.level,
    tempoTitle: tempo.title,
    multiplier: getScoreMultiplier(state.combo, state.flatterBoostTimer),
    flatterReady: state.flatterCooldown <= 0.01 && state.status === 'playing',
    flatterCooldown: Math.ceil(state.flatterCooldown),
    speechSpeaker: state.speechBubble?.speaker ?? null,
    speechText: state.speechBubble?.text ?? '',
    speechSubtext: state.speechBubble?.subtext ?? '',
    scorePopup: state.lastScorePopup?.text ?? '',
  };
}

export function CorbeauRenardGame({
  bestScore,
  onHighScoreChange,
  onOpenFableReader,
  onStartFableRecitation,
}: CorbeauRenardGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudDomRef = useRef<HTMLDivElement | null>(null);
  const bubbleDomRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<CorbeauRenardState>(createInitialState(bestScore));
  const inputRef = useRef({ left: false, right: false, flatterQueued: false });
  const audioRef = useRef<StorybookAudio | null>(null);
  const onHighScoreRef = useRef(onHighScoreChange);

  const [snapshot, setSnapshot] = useState<UiSnapshot>(() =>
    toSnapshot(createInitialState(bestScore))
  );
  const [renderMode, setRenderMode] = useState<HtmlInCanvasMode>('webgl2-compat');
  const [isMuted, setIsMuted] = useState(false);
  const [showTechInfo, setShowTechInfo] = useState(false);

  useEffect(() => {
    onHighScoreRef.current = onHighScoreChange;
  }, [onHighScoreChange]);

  // Sync external high score updates
  useEffect(() => {
    if (bestScore > stateRef.current.bestScore) {
      stateRef.current.bestScore = bestScore;
      setSnapshot(toSnapshot(stateRef.current));
    }
  }, [bestScore]);

  // Ref callbacks to set WICG HTML-in-Canvas experimental DOM attributes cleanly
  const setCanvasElement = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node) {
      node.setAttribute('layoutsubtree', '');
      node.setAttribute('content', 'drawable');
    }
  }, []);

  const setHudElement = useCallback((node: HTMLDivElement | null) => {
    hudDomRef.current = node;
    if (node) {
      node.setAttribute('drawable', '');
    }
  }, []);

  const setBubbleElement = useCallback((node: HTMLDivElement | null) => {
    bubbleDomRef.current = node;
    if (node) {
      node.setAttribute('drawable', '');
    }
  }, []);

  const handleStartOrRestart = useCallback(() => {
    const currentBest = Math.max(bestScore, stateRef.current.bestScore);
    stateRef.current = startNewGame(currentBest);
    inputRef.current = { left: false, right: false, flatterQueued: false };
    setSnapshot(toSnapshot(stateRef.current));
  }, [bestScore]);

  const handleTogglePause = useCallback(() => {
    const st = stateRef.current;
    if (st.status === 'playing') {
      st.status = 'paused';
      setSnapshot(toSnapshot(st));
    } else if (st.status === 'paused') {
      st.status = 'playing';
      setSnapshot(toSnapshot(st));
    }
  }, []);

  const handleFlatter = useCallback(() => {
    if (stateRef.current.status === 'playing') {
      inputRef.current.flatterQueued = true;
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Keyboard controls (ArrowLeft / ArrowRight + ArrowUp to flatter + Space to pause/start)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' || event.key === 'q' || event.key === 'Q') {
        event.preventDefault();
        inputRef.current.left = true;
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        inputRef.current.right = true;
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === 'z' || event.key === 'Z') {
        if (stateRef.current.status === 'playing') {
          event.preventDefault();
          inputRef.current.flatterQueued = true;
        }
        return;
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        const status = stateRef.current.status;
        if (status === 'idle' || status === 'gameover') {
          handleStartOrRestart();
        } else {
          handleTogglePause();
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' || event.key === 'q' || event.key === 'Q') {
        inputRef.current.left = false;
      }
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        inputRef.current.right = false;
      }
    };

    const onBlur = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleStartOrRestart, handleTogglePause]);

  // Main 3D WebGL2 + HTML-in-Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audio = new StorybookAudio();
    audioRef.current = audio;

    const renderer = new CorbeauRenardRenderer(canvas);
    setRenderMode(renderer.mode);

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
      }
    };
    syncCanvasSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncCanvasSize);
      resizeObserver.observe(canvas);
    }

    let disposed = false;
    let rafId = 0;
    let lastTimestamp = performance.now();
    let uiAccumulator = 0;
    let reportedBest = stateRef.current.bestScore;

    const tickAndRender = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      const flatterPressed = inputRef.current.flatterQueued;
      inputRef.current.flatterQueued = false;

      const events = stepGame(stateRef.current, dt, {
        left: inputRef.current.left,
        right: inputRef.current.right,
        flatterPressed,
      });

      for (const ev of events) {
        if (ev.type === 'catch') audio.playCatch(ev.combo ?? 1);
        else if (ev.type === 'phoenix') audio.playPhoenix();
        else if (ev.type === 'drop') audio.playDrop();
        else if (ev.type === 'flatter') audio.playFlatter();
        else if (ev.type === 'miss' || ev.type === 'gameover') audio.playMiss();
      }

      if (stateRef.current.bestScore > reportedBest) {
        reportedBest = stateRef.current.bestScore;
        onHighScoreRef.current(reportedBest);
      }

      renderer.render(stateRef.current, hudDomRef.current, bubbleDomRef.current);

      uiAccumulator += dt;
      if (events.length > 0 || uiAccumulator >= 0.1) {
        uiAccumulator = 0;
        setSnapshot(toSnapshot(stateRef.current));
      }
    };

    if (renderer.mode === 'native-html-in-canvas' && typeof canvas.requestPaint === 'function') {
      // Native WICG HTML-in-Canvas paint-synchronized loop
      canvas.onpaint = () => {
        tickAndRender(performance.now());
        if (!disposed) {
          canvas.requestPaint?.();
        }
      };
      canvas.requestPaint();
    } else {
      const frame = (now: number) => {
        tickAndRender(now);
        if (!disposed) {
          rafId = window.requestAnimationFrame(frame);
        }
      };
      rafId = window.requestAnimationFrame(frame);
    }

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (canvas.onpaint) canvas.onpaint = null;
      resizeObserver?.disconnect();
      renderer.dispose();
      audio.dispose();
    };
  }, []);

  const vanityPercent = Math.min(100, Math.round((snapshot.vanity / 150) * 100));

  return (
    <section
      aria-label="Jeu 3D Le Corbeau et le Renard"
      className="bg-white/85 backdrop-blur-xs rounded-2xl shadow-lg border border-amber-200/80 overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#f7eed4] via-[#f4e6c2] to-[#efe0b4] border-b border-amber-300/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2b1f14]">
              Le Corbeau et le Renard
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1d1713] text-[#f7d86b]">
              3D · HTML-in-Canvas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5e4933] mt-0.5">
            Attrapez les fromages avec <kbd className="px-1.5 py-0.5 rounded bg-white/80 border border-amber-300 text-[#2b1f14] font-mono text-xs">←</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/80 border border-amber-300 text-[#2b1f14] font-mono text-xs">→</kbd>{' '}
            — plus sa vanité monte, plus Maître Corbeau lâche vite !
          </p>
        </div>

        <div className="flex items-center gap-2">
          {snapshot.status === 'playing' || snapshot.status === 'paused' ? (
            <button
              type="button"
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/80 hover:bg-white text-[#2b1f14] border border-amber-300 transition-colors"
              aria-label={snapshot.status === 'paused' ? 'Reprendre la partie' : 'Mettre en pause'}
            >
              {snapshot.status === 'paused' ? (
                <>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Reprendre
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  Pause
                </>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-lg bg-white/80 hover:bg-white text-[#2b1f14] border border-amber-300 transition-colors"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Compact accessible metrics strip */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#fbf6e7] border-b border-amber-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
          <span className="text-xs uppercase tracking-wide text-[#6b543b] font-semibold">
            Score
          </span>
          <span className="font-serif text-lg font-bold text-[#1f1610]" data-testid="game-score">
            {snapshot.score}
          </span>
          {snapshot.multiplier > 1 && (
            <span className="px-1.5 py-0.5 rounded bg-[#b83721] text-white text-xs font-bold">
              ×{snapshot.multiplier}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
          <span className="text-xs uppercase tracking-wide text-[#6b543b] font-semibold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            Record
          </span>
          <span className="font-serif text-lg font-bold text-[#1f1610]" data-testid="game-best-score">
            {snapshot.bestScore}
          </span>
        </div>

        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
          <span className="text-xs uppercase tracking-wide text-[#6b543b] font-semibold shrink-0">
            Vanité Niv.{snapshot.tempoLevel}
          </span>
          <progress
            className="sr-only"
            aria-label="Jauge de vanité du Corbeau"
            value={vanityPercent}
            max={100}
          />
          <div
            className="flex-1 h-2.5 rounded-full bg-amber-200/70 border border-[#2b1f14]/40 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full transition-all duration-200 bg-gradient-to-r from-[#8fb834] via-[#f2b82e] to-[#b83721]"
              style={{ width: `${vanityPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 col-span-2 sm:col-span-1" aria-label={`Vies restantes : ${snapshot.lives} sur ${snapshot.maxLives}`}>
          {Array.from({ length: snapshot.maxLives }, (_, index) => (
            <span
              key={index}
              className={cn(
                'w-5 h-5 rounded-full border-2 inline-block transition-all',
                index < snapshot.lives
                  ? 'bg-[#f6c53c] border-[#1f1610] scale-100 shadow-xs'
                  : 'bg-amber-900/15 border-amber-900/30 scale-90'
              )}
              title={index < snapshot.lives ? 'Fromage restant' : 'Chance perdue'}
            />
          ))}
        </div>
      </div>

      {/* 3D HTML-in-Canvas Stage */}
      <div className="relative bg-[#f4e9cf] select-none">
        <canvas
          ref={setCanvasElement}
          aria-label="Scène 3D interactive Le Corbeau et le Renard"
          className="block w-full aspect-[4/3] max-h-[640px] touch-none"
        >
          {/* Live HTML-in-Canvas subtrees rendered into 3D WebGL2 textures via texElementSubImage2D */}
          <div
            ref={setHudElement}
            id="hic-hud-card"
            style={{
              width: '520px',
              height: '200px',
              padding: '20px 26px',
              background: 'rgba(250, 241, 217, 0.94)',
              border: '5px solid #1b1613',
              borderRadius: '18px',
              fontFamily: 'Lora, Georgia, serif',
              color: '#1a1410',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#5a432a' }}>SCORE</div>
                <div style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.05 }}>
                  {snapshot.score}{' '}
                  <span
                    style={{
                      fontSize: '20px',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      background: snapshot.multiplier >= 3 ? '#b83721' : '#7ea827',
                      color: '#fff9e8',
                      border: '2px solid #1b1613',
                    }}
                  >
                    ×{snapshot.multiplier}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Array.from({ length: snapshot.maxLives }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '9999px',
                      display: 'inline-block',
                      background: i < snapshot.lives ? '#f6c53c' : 'rgba(130, 114, 92, 0.25)',
                      border: '2.5px solid #1b1613',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 600, color: '#473624' }}>
              Vanité · Niv.{snapshot.tempoLevel} ({snapshot.tempoTitle})
            </div>
            <div
              style={{
                marginTop: '6px',
                height: '16px',
                borderRadius: '9px',
                border: '2.5px solid #1b1613',
                background: 'rgba(138, 115, 86, 0.24)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${vanityPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8fb834, #f2b82e, #b83721)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '16px',
                fontStyle: 'italic',
                fontWeight: 600,
                color: snapshot.scorePopup ? '#a62e1c' : '#5f4d39',
              }}
            >
              {snapshot.scorePopup || `Record : ${snapshot.bestScore} · Série : ${snapshot.combo}`}
            </div>
          </div>

          <div
            ref={setBubbleElement}
            id="hic-bubble-card"
            style={{
              width: '540px',
              height: '128px',
              padding: '18px 24px',
              background:
                snapshot.speechSpeaker === 'crow'
                  ? 'rgba(28, 25, 32, 0.94)'
                  : 'rgba(255, 249, 232, 0.96)',
              border: `4.5px solid ${snapshot.speechSpeaker === 'crow' ? '#f5c542' : '#a62e1c'}`,
              borderRadius: '20px',
              textAlign: 'center',
              fontFamily: 'Lora, Georgia, serif',
              color: snapshot.speechSpeaker === 'crow' ? '#fdf4d7' : '#1c1510',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '23px', fontWeight: 700, fontStyle: 'italic' }}>
              {snapshot.speechText}
            </div>
            {snapshot.speechSubtext && (
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: snapshot.speechSpeaker === 'crow' ? '#f5c542' : '#9e321e',
                }}
              >
                {snapshot.speechSubtext}
              </div>
            )}
          </div>
        </canvas>

        {/* Idle / Start overlay */}
        {snapshot.status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#f4e9cf]/35 backdrop-blur-[1px]">
            <div className="max-w-md w-full bg-[#fbf4df]/95 border-2 border-[#1f1610] rounded-2xl shadow-xl p-6 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9c321c]">
                  Fable interactive en 3D
                </p>
                <h3 className="font-serif text-2xl font-bold text-[#1f1610]">
                  Le Corbeau et le Renard
                </h3>
                <p className="text-sm text-[#4f3d2b] leading-relaxed">
                  Chaque fromage rattrapé flatte la vanité de Maître Corbeau : son ramage s’emballe et les fromages pleuvent toujours plus vite !
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-[#3b2c1d] bg-[#f3e5c0]/80 rounded-xl p-2.5 border border-amber-300/80">
                <div>
                  <div className="font-bold">← / →</div>
                  <div className="text-[#665038]">Déplacer le renard</div>
                </div>
                <div>
                  <div className="font-bold">↑ Flatter</div>
                  <div className="text-[#665038]">Accélérer & ×+1</div>
                </div>
                <div>
                  <div className="font-bold">Fromage d’Or</div>
                  <div className="text-[#665038]">+50 pts & +1 vie</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOrRestart}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-base bg-[#a62e1c] hover:bg-[#8f2515] text-[#fff8e7] border-2 border-[#1f1610] shadow-md transition-transform active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" aria-hidden="true" />
                Commencer la partie
              </button>
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {snapshot.status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#1f1610]/35 backdrop-blur-[2px]">
            <div className="max-w-xs w-full bg-[#fbf4df]/95 border-2 border-[#1f1610] rounded-2xl shadow-xl p-6 text-center space-y-4">
              <h3 className="font-serif text-2xl font-bold text-[#1f1610]">Pause</h3>
              <p className="text-sm text-[#54402d]">
                Maître Corbeau reprend son souffle sur sa branche.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-[#7ea827] hover:bg-[#6f9620] text-white border-2 border-[#1f1610]"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={handleStartOrRestart}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-amber-50 text-[#2b1f14] border border-amber-300"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Recommencer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {snapshot.status === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#1f1610]/45 backdrop-blur-[2px]">
            <div className="max-w-md w-full bg-[#fbf4df]/96 border-2 border-[#1f1610] rounded-2xl shadow-xl p-6 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#a62e1c]">
                  Fin de la partie
                </p>
                <h3 className="font-serif text-2xl font-bold text-[#1f1610]">
                  « Cette leçon vaut bien un fromage ! »
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#f3e5c0] rounded-xl p-3 border border-amber-300">
                <div>
                  <div className="text-xs text-[#665038]">Score</div>
                  <div className="font-serif text-xl font-bold text-[#1f1610]">{snapshot.score}</div>
                </div>
                <div>
                  <div className="text-xs text-[#665038]">Fromages</div>
                  <div className="font-serif text-xl font-bold text-[#1f1610]">{snapshot.caughtCount}</div>
                </div>
                <div>
                  <div className="text-xs text-[#665038]">Meilleure série</div>
                  <div className="font-serif text-xl font-bold text-[#1f1610]">{snapshot.maxCombo}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOrRestart}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-[#a62e1c] hover:bg-[#8f2515] text-[#fff8e7] border-2 border-[#1f1610] shadow-md transition-transform active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Rejouer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch & Pointer Controls Bar */}
      <div className="px-4 sm:px-6 py-3 bg-[#f7eed4] border-t border-amber-300/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <button
            type="button"
            onPointerDown={() => {
              inputRef.current.left = true;
            }}
            onPointerUp={() => {
              inputRef.current.left = false;
            }}
            onPointerLeave={() => {
              inputRef.current.left = false;
            }}
            onPointerCancel={() => {
              inputRef.current.left = false;
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-[#1f1610] font-medium border-2 border-[#1f1610] shadow-xs select-none touch-none"
            aria-label="Déplacer le renard à gauche"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Gauche
          </button>

          <button
            type="button"
            onClick={handleFlatter}
            disabled={!snapshot.flatterReady}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold border-2 transition-colors text-sm',
              snapshot.flatterReady
                ? 'bg-[#f6c53c] hover:bg-[#eab626] text-[#1f1610] border-[#1f1610] shadow-xs'
                : 'bg-amber-100/60 text-[#8a7558] border-amber-300 cursor-not-allowed'
            )}
            title="Flatter Maître Corbeau pour accélérer ses lâchers et gagner ×+1 (touche ↑)"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {snapshot.flatterReady
              ? 'Flatter (↑)'
              : snapshot.status === 'playing' && snapshot.flatterCooldown > 0
                ? `Flatter (${snapshot.flatterCooldown}s)`
                : 'Flatter (↑)'}
          </button>

          <button
            type="button"
            onPointerDown={() => {
              inputRef.current.right = true;
            }}
            onPointerUp={() => {
              inputRef.current.right = false;
            }}
            onPointerLeave={() => {
              inputRef.current.right = false;
            }}
            onPointerCancel={() => {
              inputRef.current.right = false;
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-[#1f1610] font-medium border-2 border-[#1f1610] shadow-xs select-none touch-none"
            aria-label="Déplacer le renard à droite"
          >
            Droite
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenFableReader && (
            <button
              type="button"
              onClick={onOpenFableReader}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              Lire la fable
            </button>
          )}
          {onStartFableRecitation && (
            <button
              type="button"
              onClick={onStartFableRecitation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
              Réciter
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTechInfo((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5a4530] bg-white/75 hover:bg-white border border-amber-300 transition-colors"
            aria-expanded={showTechInfo}
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            {renderMode === 'native-html-in-canvas'
              ? 'HTML-in-Canvas natif actif'
              : 'WebGL2 · Pont HTML-in-Canvas'}
          </button>
        </div>
      </div>

      {showTechInfo && (
        <div className="px-4 sm:px-6 py-3 bg-[#fbf6e7] border-t border-amber-200/70 text-xs text-[#4f3d2b] leading-relaxed">
          <strong>Architecture 3D HTML-in-Canvas :</strong> la scène 3D (arbre gravé, prairie, Maître Corbeau, fromages et Maître Renard en rendu cel-shading encré WebGL2) embarque des sous-arbres DOM vivants dans{' '}
          <code className="px-1 py-0.5 rounded bg-amber-100">&lt;canvas layoutsubtree content=&quot;drawable&quot;&gt;</code>{' '}
          pour projeter le tableau de score et les bulles de flatterie sur des plans 3D via{' '}
          <code className="px-1 py-0.5 rounded bg-amber-100">texElementSubImage2D</code> /{' '}
          <code className="px-1 py-0.5 rounded bg-amber-100">texElementImage2D</code> et{' '}
          <code className="px-1 py-0.5 rounded bg-amber-100">onpaint</code>.{' '}
          {renderMode === 'native-html-in-canvas' ? (
            <span className="font-semibold text-green-800">
              Votre navigateur exécute actuellement l’API HTML-in-Canvas native !
            </span>
          ) : (
            <span>
              Sur les navigateurs sans le drapeau expérimental Chrome{' '}
              <code className="px-1 py-0.5 rounded bg-amber-100">chrome://flags/#canvas-draw-element</code>, un pont de compatibilité WebGL2 rasterise automatiquement ces textures 3D.
            </span>
          )}
        </div>
      )}
    </section>
  );
}
