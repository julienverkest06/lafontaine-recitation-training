import { getScoreMultiplier, getTempoProfile, type CorbeauRenardState } from './engine';

export type HtmlInCanvasMode =
  | 'native-html-in-canvas'
  | 'webgl2-compat'
  | 'canvas2d-fallback';

export interface HtmlTextureSlot {
  texture: WebGLTexture;
  width: number;
  height: number;
  fallbackCanvas: HTMLCanvasElement;
  fallbackCtx: CanvasRenderingContext2D | null;
  lastSignature: string;
}

/**
 * Detects whether the active browser exposes the WICG HTML-in-Canvas WebGL API
 * (`texElementSubImage2D` or `texElementImage2D` + `canvas.requestPaint`).
 */
export function detectNativeHtmlInCanvas(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext
): boolean {
  const hasTexElement =
    typeof gl.texElementSubImage2D === 'function' ||
    typeof gl.texElementImage2D === 'function';
  const hasPaintLoop = typeof canvas.requestPaint === 'function';
  return hasTexElement && hasPaintLoop;
}

export function createHtmlTextureSlot(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): HtmlTextureSlot | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = width;
  fallbackCanvas.height = height;
  const fallbackCtx = fallbackCanvas.getContext('2d');

  return {
    texture,
    width,
    height,
    fallbackCanvas,
    fallbackCtx,
    lastSignature: '',
  };
}

/**
 * Attempts to upload a live DOM child of `<canvas layoutsubtree content="drawable">`
 * directly to a WebGL2 texture via the WICG HTML-in-Canvas API.
 * Returns true if native upload succeeded.
 */
export function tryUploadNativeElementTexture(
  gl: WebGL2RenderingContext,
  slot: HtmlTextureSlot,
  element: HTMLElement | null
): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width || element.offsetWidth));
  const h = Math.max(1, Math.round(rect.height || element.offsetHeight));
  if (w < 4 || h < 4) return false;

  gl.bindTexture(gl.TEXTURE_2D, slot.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  try {
    if (typeof gl.texElementSubImage2D === 'function') {
      if (slot.width !== w || slot.height !== h) {
        slot.width = w;
        slot.height = h;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          w,
          h,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      }
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, element);
      return true;
    }

    if (typeof gl.texElementImage2D === 'function') {
      gl.texElementImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        element
      );
      slot.width = w;
      slot.height = h;
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Compatibility rasterizer that mirrors the exact visual design of the
 * `#hic-hud-card` HTML-in-Canvas subtree when native `texElementSubImage2D` is unavailable.
 */
export function uploadHudCompatTexture(
  gl: WebGL2RenderingContext,
  slot: HtmlTextureSlot,
  state: CorbeauRenardState
): void {
  const tempo = getTempoProfile(state.vanity, state.caughtCount);
  const multiplier = getScoreMultiplier(state.combo, state.flatterBoostTimer);
  const vanityPct = Math.min(100, Math.round((state.vanity / 150) * 100));
  const signature = `${state.score}|${state.bestScore}|${state.lives}|${state.combo}|${multiplier}|${tempo.level}|${vanityPct}|${state.lastScorePopup?.text ?? ''}`;

  if (signature === slot.lastSignature) return;
  slot.lastSignature = signature;

  const ctx = slot.fallbackCtx;
  if (!ctx) return;
  const { width, height } = slot.fallbackCanvas;
  ctx.clearRect(0, 0, width, height);

  // Vintage parchment ink-bordered card
  drawRoundedRect(ctx, 8, 8, width - 16, height - 16, 18);
  ctx.fillStyle = 'rgba(250, 241, 217, 0.94)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1b1613';
  ctx.stroke();

  // Inner ornamental hairline
  drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 12);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(138, 108, 66, 0.45)';
  ctx.stroke();

  // Score & Multiplier
  ctx.fillStyle = '#5a432a';
  ctx.font = '600 18px Georgia, serif';
  ctx.fillText('SCORE', 30, 46);

  ctx.fillStyle = '#1a1410';
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText(String(state.score), 30, 88);

  // Multiplier badge
  const badgeText = `×${multiplier}`;
  drawRoundedRect(ctx, 175, 48, 66, 36, 10);
  ctx.fillStyle = multiplier >= 3 ? '#b83721' : '#7ea827';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1b1613';
  ctx.stroke();
  ctx.fillStyle = '#fff9e8';
  ctx.font = '700 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, 208, 73);
  ctx.textAlign = 'left';

  // Lives (golden cheese icons on right)
  for (let i = 0; i < state.maxLives; i++) {
    const cx = width - 44 - i * 40;
    const cy = 58;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? '#f6c53c' : 'rgba(130, 114, 92, 0.25)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = i < state.lives ? '#1b1613' : 'rgba(90, 72, 52, 0.4)';
    ctx.stroke();
  }

  // Vanity gauge ("Vanité du Corbeau")
  ctx.fillStyle = '#473624';
  ctx.font = '600 17px Georgia, serif';
  ctx.fillText(`Vanité · Niv.${tempo.level} (${tempo.title})`, 30, 124);

  const barX = 30;
  const barY = 136;
  const barW = width - 60;
  const barH = 18;
  drawRoundedRect(ctx, barX, barY, barW, barH, 9);
  ctx.fillStyle = 'rgba(138, 115, 86, 0.24)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1b1613';
  ctx.stroke();

  const fillW = Math.max(0, ((barW - 4) * vanityPct) / 100);
  if (fillW > 2) {
    drawRoundedRect(ctx, barX + 2, barY + 2, fillW, barH - 4, 7);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#8fb834');
    grad.addColorStop(0.55, '#f2b82e');
    grad.addColorStop(1, '#b83721');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Bottom status line: record or score popup
  ctx.font = 'italic 600 17px Georgia, serif';
  if (state.lastScorePopup) {
    ctx.fillStyle = '#a62e1c';
    ctx.fillText(state.lastScorePopup.text, 30, 181);
  } else {
    ctx.fillStyle = '#5f4d39';
    ctx.fillText(`Record : ${state.bestScore} · Série : ${state.combo}`, 30, 181);
  }

  gl.bindTexture(gl.TEXTURE_2D, slot.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    slot.fallbackCanvas
  );
}

/**
 * Compatibility rasterizer for `#hic-bubble-card` 3D floating speech bubble.
 */
export function uploadBubbleCompatTexture(
  gl: WebGL2RenderingContext,
  slot: HtmlTextureSlot,
  state: CorbeauRenardState
): void {
  const bubble = state.speechBubble;
  const signature = bubble ? `${bubble.speaker}|${bubble.text}|${bubble.subtext ?? ''}` : 'empty';
  if (signature === slot.lastSignature) return;
  slot.lastSignature = signature;

  const ctx = slot.fallbackCtx;
  if (!ctx) return;
  const { width, height } = slot.fallbackCanvas;
  ctx.clearRect(0, 0, width, height);

  if (bubble) {
    drawRoundedRect(ctx, 10, 10, width - 20, height - 20, 20);
    ctx.fillStyle = bubble.speaker === 'fox' ? 'rgba(255, 249, 232, 0.96)' : 'rgba(28, 25, 32, 0.93)';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = bubble.speaker === 'fox' ? '#a62e1c' : '#f5c542';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = bubble.speaker === 'fox' ? '#1c1510' : '#fdf4d7';
    ctx.font = 'italic 700 24px Georgia, serif';
    ctx.fillText(bubble.text, width / 2, bubble.subtext ? 58 : 74, width - 56);

    if (bubble.subtext) {
      ctx.fillStyle = bubble.speaker === 'fox' ? '#9e321e' : '#f5c542';
      ctx.font = '600 17px Inter, sans-serif';
      ctx.fillText(bubble.subtext, width / 2, 92, width - 56);
    }
    ctx.textAlign = 'left';
  }

  gl.bindTexture(gl.TEXTURE_2D, slot.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    slot.fallbackCanvas
  );
}
