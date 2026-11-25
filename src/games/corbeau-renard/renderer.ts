import {
  GROUND_Y,
  type CorbeauRenardState,
} from './engine';
import {
  createConeMesh,
  createCylinderMesh,
  createQuadMesh,
  createSphereMesh,
  type MeshData,
} from './geometry';
import {
  createHtmlTextureSlot,
  detectNativeHtmlInCanvas,
  tryUploadNativeElementTexture,
  uploadBubbleCompatTexture,
  uploadHudCompatTexture,
  type HtmlInCanvasMode,
  type HtmlTextureSlot,
} from './htmlInCanvasBridge';
import {
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4TRS,
  type Mat4,
} from './math3d';

interface GpuMesh {
  vao: WebGLVertexArrayObject;
  indexCount: number;
}

interface DrawStyle {
  color: readonly [number, number, number];
  outline?: number;
  barkStripes?: boolean;
  highlight?: number;
}

const PARCHMENT_VS = `#version 300 es
precision highp float;
const vec2 POS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.999, 1.0);
}
`;

const PARCHMENT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  // Warm antique French storybook paper palette inspired by the illustration
  vec3 centerPaper = vec3(0.962, 0.922, 0.822);
  vec3 edgePaper   = vec3(0.902, 0.836, 0.688);

  float d = length((vUv - 0.5) * vec2(1.15, 1.05));
  vec3 col = mix(centerPaper, edgePaper, smoothstep(0.18, 0.82, d));

  // Fine organic paper grain & subtle fiber mottling
  float coarse = valueNoise(vUv * 14.0);
  float fine = valueNoise(vUv * 120.0);
  float specks = hash(floor(vUv * 360.0));
  col += (coarse - 0.5) * 0.04;
  col += (fine - 0.5) * 0.028;
  if (specks > 0.994) {
    col -= vec3(0.06, 0.05, 0.04);
  }

  // Soft warm sunlight bloom from upper right
  float glow = exp(-length(vUv - vec2(0.72, 0.78)) * 2.2) * (0.03 + 0.008 * sin(uTime * 1.2));
  col += vec3(glow * 1.0, glow * 0.85, glow * 0.45);

  fragColor = vec4(col, 1.0);
}
`;

const TOON_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uOutline;

out vec3 vNormal;
out vec2 vUv;
out vec3 vWorldPos;

void main() {
  vec3 displaced = aPosition + aNormal * uOutline;
  vec4 worldPos = uModel * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  vUv = aUv;
  gl_Position = uViewProj * worldPos;
}
`;

const TOON_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
in vec3 vWorldPos;

uniform vec3 uColor;
uniform float uIsOutline;
uniform float uBarkStripes;
uniform float uHighlight;

out vec4 fragColor;

void main() {
  if (uIsOutline > 0.5) {
    // Rich charcoal ink outline from the hand-drawn illustration
    fragColor = vec4(0.09, 0.075, 0.065, 1.0);
    return;
  }

  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.42, 0.72, 0.65));
  float ndl = dot(n, lightDir);

  // Soft vintage woodblock 2-band shading
  float band = smoothstep(-0.18, 0.08, ndl) * 0.24 + 0.78;
  float rim = pow(1.0 - max(0.0, n.z), 2.5) * uHighlight;

  vec3 col = uColor * band + vec3(0.98, 0.93, 0.76) * rim;

  // Vertical hand-inked bark strokes on the tree trunk
  if (uBarkStripes > 0.5) {
    float stripeA = sin(vUv.x * 48.0 + sin(vUv.y * 8.0) * 0.9);
    float stripeB = sin(vUv.x * 84.0 - vUv.y * 5.0);
    float inkLine = smoothstep(0.82, 0.95, stripeA) * 0.45 + smoothstep(0.88, 0.97, stripeB) * 0.3;
    col = mix(col, vec3(0.11, 0.09, 0.08), clamp(inkLine, 0.0, 0.65));
  }

  fragColor = vec4(col, 1.0);
}
`;

const HTML_QUAD_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec2 aUv;

uniform mat4 uViewProj;
uniform mat4 uModel;
out vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
}
`;

const HTML_QUAD_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
uniform float uAlpha;
out vec4 fragColor;

void main() {
  vec4 tex = texture(uTexture, vUv);
  if (tex.a < 0.02) discard;
  fragColor = vec4(tex.rgb * uAlpha, tex.a * uAlpha);
}
`;

interface CanopyCluster {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: readonly [number, number, number];
  phase: number;
}

const CANOPY_CLUSTERS: readonly CanopyCluster[] = [
  // Left crown above trunk
  { x: -4.45, y: 2.7, z: 0.12, sx: 1.05, sy: 0.88, sz: 0.78, color: [0.56, 0.72, 0.2], phase: 0.0 },
  { x: -3.55, y: 3.15, z: -0.08, sx: 1.25, sy: 0.92, sz: 0.85, color: [0.62, 0.76, 0.25], phase: 0.6 },
  { x: -2.4, y: 3.35, z: 0.16, sx: 1.32, sy: 0.88, sz: 0.82, color: [0.54, 0.7, 0.19], phase: 1.2 },
  { x: -1.1, y: 3.4, z: -0.05, sx: 1.38, sy: 0.85, sz: 0.86, color: [0.6, 0.75, 0.24], phase: 1.8 },
  { x: 0.25, y: 3.38, z: 0.14, sx: 1.32, sy: 0.82, sz: 0.82, color: [0.53, 0.69, 0.19], phase: 2.4 },
  { x: 1.55, y: 3.32, z: -0.18, sx: 1.36, sy: 0.78, sz: 0.85, color: [0.61, 0.75, 0.24], phase: 3.0 },
  { x: 2.8, y: 3.15, z: -0.12, sx: 1.24, sy: 0.76, sz: 0.78, color: [0.55, 0.71, 0.2], phase: 3.6 },
  { x: 3.75, y: 2.75, z: 0.06, sx: 0.98, sy: 0.68, sz: 0.72, color: [0.59, 0.74, 0.23], phase: 4.1 },
  // Drooping sculpted leaf fronds matching the illustration's hanging boughs
  { x: -2.7, y: 2.25, z: 0.28, sx: 0.88, sy: 0.56, sz: 0.62, color: [0.57, 0.73, 0.21], phase: 0.9 },
  { x: -2.05, y: 1.72, z: 0.34, sx: 0.72, sy: 0.48, sz: 0.54, color: [0.63, 0.77, 0.26], phase: 1.5 },
  { x: -0.75, y: 2.45, z: 0.22, sx: 0.95, sy: 0.55, sz: 0.64, color: [0.51, 0.67, 0.18], phase: 2.1 },
  { x: 0.35, y: 2.65, z: -0.25, sx: 1.05, sy: 0.58, sz: 0.68, color: [0.58, 0.74, 0.22], phase: 2.7 },
  { x: 2.6, y: 2.38, z: 0.24, sx: 0.76, sy: 0.44, sz: 0.56, color: [0.57, 0.73, 0.21], phase: 3.3 },
  // Iconic side bough halfway up the left tree trunk
  { x: -3.72, y: 0.32, z: 0.12, sx: 0.68, sy: 0.44, sz: 0.52, color: [0.57, 0.73, 0.21], phase: 0.4 },
  { x: -3.38, y: 0.62, z: 0.18, sx: 0.48, sy: 0.36, sz: 0.42, color: [0.63, 0.78, 0.26], phase: 1.1 },
  { x: -5.05, y: -0.35, z: -0.08, sx: 0.46, sy: 0.32, sz: 0.4, color: [0.55, 0.7, 0.2], phase: 2.0 },
];

const GRASS_TUFTS: readonly { x: number; z: number; h: number; tilt: number }[] = Array.from(
  { length: 26 },
  (_, i) => ({
    x: -4.9 + i * 0.41,
    z: i % 2 === 0 ? 0.45 : -0.32,
    h: 0.34 + (i % 4) * 0.08,
    tilt: ((i % 5) - 2) * 0.14,
  })
);

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown link error';
    gl.deleteProgram(program);
    throw new Error(info);
  }
  return program;
}

function uploadMesh(gl: WebGL2RenderingContext, mesh: MeshData): GpuMesh {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Unable to create VAO');
  gl.bindVertexArray(vao);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const normBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return { vao, indexCount: mesh.indices.length };
}

export class CorbeauRenardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext | null;
  private readonly ctx2d: CanvasRenderingContext2D | null;
  public readonly mode: HtmlInCanvasMode;

  private parchmentProgram: WebGLProgram | null = null;
  private toonProgram: WebGLProgram | null = null;
  private htmlQuadProgram: WebGLProgram | null = null;
  private emptyVao: WebGLVertexArrayObject | null = null;

  private sphereMesh: GpuMesh | null = null;
  private cylinderMesh: GpuMesh | null = null;
  private taperedMesh: GpuMesh | null = null;
  private coneMesh: GpuMesh | null = null;
  private quadMesh: GpuMesh | null = null;

  private hudSlot: HtmlTextureSlot | null = null;
  private bubbleSlot: HtmlTextureSlot | null = null;

  private toonUniforms: {
    uViewProj: WebGLUniformLocation | null;
    uModel: WebGLUniformLocation | null;
    uOutline: WebGLUniformLocation | null;
    uColor: WebGLUniformLocation | null;
    uIsOutline: WebGLUniformLocation | null;
    uBarkStripes: WebGLUniformLocation | null;
    uHighlight: WebGLUniformLocation | null;
  } | null = null;

  private htmlUniforms: {
    uViewProj: WebGLUniformLocation | null;
    uModel: WebGLUniformLocation | null;
    uTexture: WebGLUniformLocation | null;
    uAlpha: WebGLUniformLocation | null;
  } | null = null;

  private parchmentTimeLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      gl = null;
    }

    if (gl) {
      this.gl = gl;
      this.ctx2d = null;
      this.mode = detectNativeHtmlInCanvas(canvas, gl)
        ? 'native-html-in-canvas'
        : 'webgl2-compat';
      this.initWebGL(gl);
    } else {
      this.gl = null;
      this.ctx2d = canvas.getContext('2d');
      this.mode = 'canvas2d-fallback';
    }
  }

  private initWebGL(gl: WebGL2RenderingContext): void {
    this.parchmentProgram = createProgram(gl, PARCHMENT_VS, PARCHMENT_FS);
    this.toonProgram = createProgram(gl, TOON_VS, TOON_FS);
    this.htmlQuadProgram = createProgram(gl, HTML_QUAD_VS, HTML_QUAD_FS);
    this.emptyVao = gl.createVertexArray();

    this.parchmentTimeLoc = gl.getUniformLocation(this.parchmentProgram, 'uTime');

    this.toonUniforms = {
      uViewProj: gl.getUniformLocation(this.toonProgram, 'uViewProj'),
      uModel: gl.getUniformLocation(this.toonProgram, 'uModel'),
      uOutline: gl.getUniformLocation(this.toonProgram, 'uOutline'),
      uColor: gl.getUniformLocation(this.toonProgram, 'uColor'),
      uIsOutline: gl.getUniformLocation(this.toonProgram, 'uIsOutline'),
      uBarkStripes: gl.getUniformLocation(this.toonProgram, 'uBarkStripes'),
      uHighlight: gl.getUniformLocation(this.toonProgram, 'uHighlight'),
    };

    this.htmlUniforms = {
      uViewProj: gl.getUniformLocation(this.htmlQuadProgram, 'uViewProj'),
      uModel: gl.getUniformLocation(this.htmlQuadProgram, 'uModel'),
      uTexture: gl.getUniformLocation(this.htmlQuadProgram, 'uTexture'),
      uAlpha: gl.getUniformLocation(this.htmlQuadProgram, 'uAlpha'),
    };

    this.sphereMesh = uploadMesh(gl, createSphereMesh(14, 18));
    this.cylinderMesh = uploadMesh(gl, createCylinderMesh(20, 1, 1));
    this.taperedMesh = uploadMesh(gl, createCylinderMesh(18, 0.72, 1.0));
    this.coneMesh = uploadMesh(gl, createConeMesh(14));
    this.quadMesh = uploadMesh(gl, createQuadMesh());

    this.hudSlot = createHtmlTextureSlot(gl, 520, 200);
    this.bubbleSlot = createHtmlTextureSlot(gl, 540, 128);
  }

  public resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const clampedDpr = Math.min(2, Math.max(1, dpr));
    const width = Math.max(320, Math.round(cssWidth * clampedDpr));
    const height = Math.max(240, Math.round(cssHeight * clampedDpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private drawMesh(
    gl: WebGL2RenderingContext,
    mesh: GpuMesh,
    model: Mat4,
    style: DrawStyle
  ): void {
    if (!this.toonUniforms) return;
    const u = this.toonUniforms;
    const outlineWidth = style.outline ?? 0.045;

    gl.bindVertexArray(mesh.vao);
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform1f(u.uBarkStripes, style.barkStripes ? 1 : 0);
    gl.uniform1f(u.uHighlight, style.highlight ?? 0.14);

    // Pass 1: Inverted-hull hand-inked charcoal outline
    if (outlineWidth > 0) {
      gl.cullFace(gl.FRONT);
      gl.uniform1f(u.uOutline, outlineWidth);
      gl.uniform1f(u.uIsOutline, 1);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Pass 2: Storybook toon fill
    gl.cullFace(gl.BACK);
    gl.uniform1f(u.uOutline, 0);
    gl.uniform1f(u.uIsOutline, 0);
    gl.uniform3f(u.uColor, style.color[0], style.color[1], style.color[2]);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  public render(
    state: CorbeauRenardState,
    hudElement: HTMLElement | null,
    bubbleElement: HTMLElement | null
  ): void {
    if (!this.gl) {
      this.renderCanvas2DFallback(state);
      return;
    }

    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.95, 0.91, 0.81, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Draw vintage parchment paper backdrop
    if (this.parchmentProgram && this.emptyVao) {
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.parchmentProgram);
      gl.uniform1f(this.parchmentTimeLoc, state.elapsedTime);
      gl.bindVertexArray(this.emptyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 2. Setup 3D perspective camera with subtle diorama parallax following the fox
    const aspect = width / Math.max(1, height);
    const proj = mat4Perspective((38 * Math.PI) / 180, aspect, 0.5, 40);
    const camX = 0.05 + state.foxX * 0.085;
    const camY = 0.15 + Math.sin(state.elapsedTime * 0.7) * 0.03;
    const view = mat4LookAt([camX, camY, 11.4], [0.05, 0.18, 0], [0, 1, 0]);
    const viewProj = mat4Multiply(proj, view);

    // 3. Draw 3D storybook diorama (Tree, Grass, Crow, Cheeses, Fox, Particles)
    if (
      this.toonProgram &&
      this.toonUniforms &&
      this.sphereMesh &&
      this.cylinderMesh &&
      this.taperedMesh &&
      this.coneMesh
    ) {
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.useProgram(this.toonProgram);
      gl.uniformMatrix4fv(this.toonUniforms.uViewProj, false, viewProj);

      this.drawTree(gl, state);
      this.drawMeadow(gl, state);
      this.drawCrow(gl, state);
      this.drawCheeses(gl, state);
      this.drawFox(gl, state);
      this.drawParticlesAndLeaves(gl, state);
    }

    // 4. Draw live HTML-in-Canvas 3D textured UI planes (HUD plaque & Speech Bubble)
    this.drawHtmlInCanvasPlanes(gl, viewProj, state, hudElement, bubbleElement);
  }

  private drawTree(gl: WebGL2RenderingContext, state: CorbeauRenardState): void {
    if (!this.taperedMesh || !this.sphereMesh) return;
    const barkColor: readonly [number, number, number] = [0.54, 0.47, 0.44];
    const t = state.elapsedTime;
    const windSway = state.wind * 0.06;

    // Tall slender trunk rising on the left and gently curving rightward like the illustration
    const trunkSegments = [
      { x: -4.45, y: -1.65, z: -0.1, rz: -0.04, sx: 0.44, sy: 2.35, sz: 0.42 },
      { x: -4.34, y: 0.55, z: -0.1, rz: -0.07, sx: 0.36, sy: 2.3, sz: 0.36 },
      { x: -4.12, y: 2.35, z: -0.08, rz: -0.22, sx: 0.3, sy: 1.55, sz: 0.32 },
      // Arched upper bough hidden beneath the canopy supporting Maître Corbeau
      { x: -2.6, y: 2.9, z: -0.18, rz: -1.35, sx: 0.22, sy: 2.8, sz: 0.24 },
      { x: 0.25, y: 2.95, z: -0.22, rz: -1.56, sx: 0.19, sy: 3.1, sz: 0.2 },
      { x: 2.4, y: 2.75, z: -0.2, rz: -1.78, sx: 0.15, sy: 2.1, sz: 0.17 },
      // Small side branch jutting right halfway up the trunk
      { x: -4.05, y: 0.22, z: -0.02, rz: -1.05, sx: 0.12, sy: 0.9, sz: 0.12 },
    ];

    for (const seg of trunkSegments) {
      this.drawMesh(
        gl,
        this.taperedMesh,
        mat4TRS(seg.x, seg.y, seg.z, 0, 0, seg.rz, seg.sx, seg.sy, seg.sz),
        { color: barkColor, outline: 0.055, barkStripes: true, highlight: 0.08 }
      );
    }

    // Lush sculpted leaf clusters forming the iconic arched green canopy
    for (const c of CANOPY_CLUSTERS) {
      const swayX = Math.sin(t * 1.4 + c.phase) * 0.045 + windSway;
      const swayY = Math.cos(t * 1.1 + c.phase) * 0.025;
      this.drawMesh(
        gl,
        this.sphereMesh,
        mat4TRS(c.x + swayX, c.y + swayY, c.z, 0, 0, swayX * 0.4, c.sx, c.sy, c.sz),
        { color: c.color, outline: 0.048, highlight: 0.12 }
      );
    }
  }

  private drawMeadow(gl: WebGL2RenderingContext, state: CorbeauRenardState): void {
    if (!this.sphereMesh || !this.coneMesh) return;
    const grassMain: readonly [number, number, number] = [0.52, 0.69, 0.17];
    const grassBright: readonly [number, number, number] = [0.58, 0.74, 0.2];

    // Undulating 3D meadow floor mounds
    const mounds = [
      { x: -2.8, y: GROUND_Y - 0.52, z: 0.05, sx: 3.4, sy: 0.72, sz: 1.85 },
      { x: 0.4, y: GROUND_Y - 0.56, z: 0.1, sx: 3.9, sy: 0.72, sz: 1.95 },
      { x: 3.4, y: GROUND_Y - 0.52, z: 0.05, sx: 3.1, sy: 0.7, sz: 1.85 },
    ];
    for (const m of mounds) {
      this.drawMesh(
        gl,
        this.sphereMesh,
        mat4TRS(m.x, m.y, m.z, 0, 0, 0, m.sx, m.sy, m.sz),
        { color: grassMain, outline: 0.032, highlight: 0.1 }
      );
    }

    // Iconic jagged ink-outlined grass tufts along the meadow edge
    for (const tuft of GRASS_TUFTS) {
      const sway =
        Math.sin(state.elapsedTime * 2.1 + tuft.x * 1.3) * 0.08 + state.wind * 0.12;
      this.drawMesh(
        gl,
        this.coneMesh,
        mat4TRS(
          tuft.x,
          GROUND_Y + tuft.h * 0.25,
          tuft.z,
          0,
          0,
          tuft.tilt + sway,
          0.11,
          tuft.h,
          0.1
        ),
        { color: grassBright, outline: 0.055, highlight: 0.06 }
      );
    }
  }

  private drawCrow(gl: WebGL2RenderingContext, state: CorbeauRenardState): void {
    if (!this.sphereMesh || !this.coneMesh || !this.cylinderMesh) return;

    const bob = Math.sin(state.crowBobPhase) * (0.05 + state.crowExcitement * 0.06);
    const telegraphShake =
      state.crowTelegraphTimer > 0 ? Math.sin(state.elapsedTime * 42) * 0.06 : 0;
    const cx = state.crowX + telegraphShake;
    const cy = state.crowY - 0.1 + bob;
    const cz = 0.72;
    const crowBlack: readonly [number, number, number] = [0.1, 0.1, 0.13];
    const wingSheen: readonly [number, number, number] = [0.76, 0.78, 0.83];

    // Crow body leaning down proudly from the foliage
    const puff = 1 + state.crowExcitement * 0.12;
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(cx - 0.16, cy + 0.12, cz, 0.15, 0.2, -0.45, 0.56 * puff, 0.36 * puff, 0.34),
      { color: crowBlack, outline: 0.045, highlight: 0.24 }
    );

    // Wing + subtle silver crescent accent inspired by the woodblock crow
    const wingFlap = Math.sin(state.crowBobPhase * 1.4) * (0.14 + state.crowExcitement * 0.35);
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(cx - 0.22, cy + 0.18, cz + 0.16, 0, 0, -0.35 + wingFlap, 0.42, 0.22, 0.15),
      { color: crowBlack, outline: 0.04, highlight: 0.22 }
    );
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(cx - 0.18, cy + 0.21, cz + 0.27, 0, 0, -0.35 + wingFlap, 0.21, 0.06, 0.06),
      { color: wingSheen, outline: 0, highlight: 0.05 }
    );

    // Head angled downward toward Maître Renard
    const headPitch = -0.35 + state.crowBeakOpen * 0.22;
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(cx + 0.2, cy - 0.04, cz + 0.12, 0, 0, headPitch, 0.27, 0.25, 0.25),
      { color: crowBlack, outline: 0.045, highlight: 0.22 }
    );

    // Bright eye
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(cx + 0.26, cy - 0.01, cz + 0.34, 0, 0, 0, 0.055, 0.055, 0.055),
      { color: [0.96, 0.94, 0.86], outline: 0, highlight: 0 }
    );

    // Hinged upper & lower beak
    const openAngle = state.crowBeakOpen * 0.52;
    this.drawMesh(
      gl,
      this.coneMesh,
      mat4TRS(cx + 0.34, cy - 0.22, cz + 0.14, 0, 0, -2.55 + openAngle, 0.09, 0.32, 0.08),
      { color: [0.14, 0.14, 0.16], outline: 0.04, highlight: 0.15 }
    );
    this.drawMesh(
      gl,
      this.coneMesh,
      mat4TRS(cx + 0.28, cy - 0.26, cz + 0.14, 0, 0, -2.75 - openAngle, 0.07, 0.28, 0.07),
      { color: [0.16, 0.15, 0.17], outline: 0.04, highlight: 0.15 }
    );

    // Visible cheese held in the crow's beak before dropping!
    if (state.crowBeakOpen < 0.72) {
      const heldColor: readonly [number, number, number] =
        state.crowHoldingCheese === 'phoenix'
          ? [1.0, 0.86, 0.28]
          : state.crowHoldingCheese === 'swift'
            ? [0.99, 0.9, 0.54]
            : [0.96, 0.77, 0.25];
      const scale =
        state.crowHoldingCheese === 'swift'
          ? 0.24
          : state.crowHoldingCheese === 'phoenix'
            ? 0.33
            : 0.29;
      this.drawMesh(
        gl,
        this.cylinderMesh,
        mat4TRS(
          cx + 0.32,
          cy - 0.45,
          cz + 0.16,
          Math.PI / 2,
          0.35 + Math.sin(state.elapsedTime * 3) * 0.15,
          0,
          scale,
          scale * 0.6,
          scale
        ),
        { color: heldColor, outline: 0.06, highlight: 0.28 }
      );
    }
  }

  private drawCheeses(gl: WebGL2RenderingContext, state: CorbeauRenardState): void {
    if (!this.cylinderMesh || !this.sphereMesh) return;

    for (const cheese of state.cheeses) {
      const faceColor: readonly [number, number, number] =
        cheese.kind === 'phoenix'
          ? [1.0, 0.87, 0.28]
          : cheese.kind === 'swift'
            ? [0.99, 0.9, 0.56]
            : [0.96, 0.77, 0.25];
      const rindColor: readonly [number, number, number] =
        cheese.kind === 'phoenix'
          ? [0.92, 0.56, 0.12]
          : [0.85, 0.61, 0.16];

      const r = cheese.radius;

      // Outer cheese rind wheel
      this.drawMesh(
        gl,
        this.cylinderMesh,
        mat4TRS(
          cheese.x,
          cheese.y,
          cheese.z,
          Math.PI / 2 + cheese.rotX * 0.35,
          cheese.rotY,
          cheese.rotZ,
          r,
          r * 0.56,
          r
        ),
        { color: rindColor, outline: 0.065, highlight: 0.24 }
      );

      // Inner bright creamy face
      this.drawMesh(
        gl,
        this.cylinderMesh,
        mat4TRS(
          cheese.x,
          cheese.y,
          cheese.z,
          Math.PI / 2 + cheese.rotX * 0.35,
          cheese.rotY,
          cheese.rotZ,
          r * 0.82,
          r * 0.6,
          r * 0.82
        ),
        { color: faceColor, outline: 0, highlight: 0.32 }
      );

      // Radiant golden aura orbs around the rare Phoenix cheese
      if (cheese.kind === 'phoenix') {
        for (let k = 0; k < 4; k++) {
          const a = state.elapsedTime * 5 + (k * Math.PI) / 2;
          this.drawMesh(
            gl,
            this.sphereMesh,
            mat4TRS(
              cheese.x + Math.cos(a) * (r + 0.16),
              cheese.y + Math.sin(a) * (r + 0.16),
              cheese.z + 0.15,
              0,
              0,
              0,
              0.07,
              0.07,
              0.07
            ),
            { color: [1.0, 0.95, 0.55], outline: 0.03, highlight: 0.4 }
          );
        }
      }
    }
  }

  private drawFox(gl: WebGL2RenderingContext, state: CorbeauRenardState): void {
    if (!this.sphereMesh || !this.taperedMesh || !this.coneMesh) return;

    const hopOffset =
      state.foxHopTimer > 0
        ? Math.sin((state.foxHopTimer / 0.28) * Math.PI) * 0.42
        : 0;
    const hurtShake =
      state.foxHurtTimer > 0 ? Math.sin(state.elapsedTime * 50) * 0.09 : 0;

    const fx = state.foxX + hurtShake;
    const fy = GROUND_Y + 0.68 + hopOffset;
    const fz = 0.32;
    const lean = -state.foxLean;

    const foxRed: readonly [number, number, number] =
      state.foxHurtTimer > 0 ? [0.82, 0.22, 0.15] : [0.68, 0.2, 0.12];
    const foxCream: readonly [number, number, number] = [0.95, 0.89, 0.76];
    const noseBlack: readonly [number, number, number] = [0.09, 0.08, 0.08];

    // Iconic rear-upward seated/running silhouette from the illustration!
    // Upright tapered torso
    this.drawMesh(
      gl,
      this.taperedMesh,
      mat4TRS(fx, fy, fz, 0.08, 0, lean, 0.44, 1.05, 0.38),
      { color: foxRed, outline: 0.055, highlight: 0.14 }
    );

    // Lower haunches resting near the grass
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(fx, fy - 0.36, fz - 0.04, 0, 0, lean, 0.46, 0.38, 0.4),
      { color: foxRed, outline: 0.05, highlight: 0.12 }
    );

    // Head gazing upward toward Maître Corbeau
    const hx = fx - lean * 0.55;
    const hy = fy + 0.68;
    const headYaw = state.foxLean * 0.9;
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(hx, hy, fz + 0.03, -0.35, headYaw, lean * 0.6, 0.34, 0.31, 0.31),
      { color: foxRed, outline: 0.055, highlight: 0.16 }
    );

    // Pointed triangular fox ears
    this.drawMesh(
      gl,
      this.coneMesh,
      mat4TRS(hx - 0.24, hy + 0.24, fz + 0.05, 0, 0, 0.48 + lean, 0.14, 0.38, 0.11),
      { color: foxRed, outline: 0.06, highlight: 0.14 }
    );
    this.drawMesh(
      gl,
      this.coneMesh,
      mat4TRS(hx + 0.24, hy + 0.24, fz + 0.05, 0, 0, -0.48 + lean, 0.14, 0.38, 0.11),
      { color: foxRed, outline: 0.06, highlight: 0.14 }
    );

    // Upturned pointed snout looking skyward (matching the illustration!)
    this.drawMesh(
      gl,
      this.coneMesh,
      mat4TRS(hx, hy + 0.32, fz - 0.04, -0.25, headYaw, lean * 0.5, 0.15, 0.34, 0.15),
      { color: foxRed, outline: 0.055, highlight: 0.18 }
    );
    // Cream cheek highlight & crisp black nose tip
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(hx, hy + 0.46, fz - 0.08, 0, 0, 0, 0.068, 0.06, 0.065),
      { color: foxCream, outline: 0, highlight: 0.1 }
    );
    this.drawMesh(
      gl,
      this.sphereMesh,
      mat4TRS(hx, hy + 0.51, fz - 0.09, 0, 0, 0, 0.058, 0.058, 0.058),
      { color: noseBlack, outline: 0, highlight: 0.1 }
    );

    // Long sweeping bushy tail curving left (and swishing dynamically with movement!)
    const tailDir = state.foxVx > 1.2 ? -1 : state.foxVx < -1.2 ? 1 : -1;
    const wag = Math.sin(state.foxTailPhase) * 0.1;
    for (let seg = 0; seg < 5; seg++) {
      const frac = (seg + 1) / 5;
      const tx = fx + tailDir * (0.24 + frac * 1.18);
      const ty = fy - 0.56 - Math.sin(frac * Math.PI * 0.6) * 0.08 + wag * frac;
      const tz = fz + 0.16 + frac * 0.1;
      const radius = 0.22 - frac * 0.035;
      this.drawMesh(
        gl,
        this.sphereMesh,
        mat4TRS(tx, ty, tz, 0, 0, tailDir * -0.18 + wag, radius * 1.45, radius * 0.78, radius),
        { color: foxRed, outline: 0.055, highlight: 0.12 }
      );
    }
  }

  private drawParticlesAndLeaves(
    gl: WebGL2RenderingContext,
    state: CorbeauRenardState
  ): void {
    if (!this.sphereMesh) return;

    // Drifting canopy leaves
    for (const leaf of state.leaves) {
      this.drawMesh(
        gl,
        this.sphereMesh,
        mat4TRS(
          leaf.x,
          leaf.y,
          leaf.z,
          leaf.phase * 0.6,
          leaf.phase,
          Math.sin(leaf.phase) * 0.7,
          0.14 * leaf.scale,
          0.07 * leaf.scale,
          0.04 * leaf.scale
        ),
        { color: [0.56, 0.73, 0.21], outline: 0.05, highlight: 0.1 }
      );
    }

    // Golden catch crumb / sparkle particles
    for (const p of state.particles) {
      const scale = p.size * Math.max(0.2, p.life / p.maxLife);
      this.drawMesh(
        gl,
        this.sphereMesh,
        mat4TRS(p.x, p.y, p.z, 0, 0, 0, scale, scale, scale),
        { color: p.color, outline: 0.035, highlight: 0.3 }
      );
    }
  }

  private drawHtmlInCanvasPlanes(
    gl: WebGL2RenderingContext,
    viewProj: Mat4,
    state: CorbeauRenardState,
    hudElement: HTMLElement | null,
    bubbleElement: HTMLElement | null
  ): void {
    if (!this.htmlQuadProgram || !this.htmlUniforms || !this.quadMesh) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.depthMask(false);
    gl.useProgram(this.htmlQuadProgram);
    gl.uniformMatrix4fv(this.htmlUniforms.uViewProj, false, viewProj);
    gl.bindVertexArray(this.quadMesh.vao);

    // 1. Floating 3D HTML-in-Canvas HUD parchment plaque (top-left/center-right clear sky)
    if (this.hudSlot && state.status !== 'idle') {
      const uploadedNatively =
        this.mode === 'native-html-in-canvas' &&
        tryUploadNativeElementTexture(gl, this.hudSlot, hudElement);
      if (!uploadedNatively) {
        uploadHudCompatTexture(gl, this.hudSlot, state);
      }

      const tiltY = 0.08 + Math.sin(state.elapsedTime * 1.1) * 0.025;
      const bobY = Math.cos(state.elapsedTime * 1.4) * 0.02;
      const hudModel = mat4TRS(-1.72, 1.54 + bobY, 0.95, 0.03, tiltY, -0.01, 2.22, 0.86, 1);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.hudSlot.texture);
      gl.uniform1i(this.htmlUniforms.uTexture, 0);
      gl.uniformMatrix4fv(this.htmlUniforms.uModel, false, hudModel);
      gl.uniform1f(this.htmlUniforms.uAlpha, 0.94);
      gl.drawElements(gl.TRIANGLES, this.quadMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // 2. Dynamic 3D HTML-in-Canvas Speech Bubble (La Fontaine verses / Crow croaks)
    if (this.bubbleSlot && state.speechBubble) {
      const uploadedNatively =
        this.mode === 'native-html-in-canvas' &&
        tryUploadNativeElementTexture(gl, this.bubbleSlot, bubbleElement);
      if (!uploadedNatively) {
        uploadBubbleCompatTexture(gl, this.bubbleSlot, state);
      }

      const bubble = state.speechBubble;
      const fadeIn = Math.min(1, (bubble.maxTtl - bubble.ttl) * 6);
      const fadeOut = Math.min(1, bubble.ttl * 3);
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

      const targetX =
        bubble.speaker === 'fox'
          ? Math.max(-2.1, Math.min(2.3, state.foxX))
          : Math.max(-1.8, Math.min(2.1, state.crowX));
      const targetY = bubble.speaker === 'fox' ? 0.22 : 1.42;
      const tilt = bubble.speaker === 'fox' ? 0.06 : -0.07;

      const bubbleModel = mat4TRS(
        targetX,
        targetY + (1 - fadeIn) * -0.12,
        1.45,
        0.03,
        tilt,
        0,
        3.5,
        0.84,
        1
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bubbleSlot.texture);
      gl.uniform1i(this.htmlUniforms.uTexture, 0);
      gl.uniformMatrix4fv(this.htmlUniforms.uModel, false, bubbleModel);
      gl.uniform1f(this.htmlUniforms.uAlpha, alpha);
      gl.drawElements(gl.TRIANGLES, this.quadMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  /**
   * Safety fallback when WebGL2 itself is unavailable (e.g. headless software contexts).
   */
  private renderCanvas2DFallback(state: CorbeauRenardState): void {
    const ctx = this.ctx2d;
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.fillStyle = '#f4e9cf';
    ctx.fillRect(0, 0, width, height);

    // Tree trunk & canopy
    ctx.fillStyle = '#8b7970';
    ctx.strokeStyle = '#171311';
    ctx.lineWidth = 4;
    ctx.fillRect(width * 0.08, height * 0.14, width * 0.05, height * 0.74);
    ctx.strokeRect(width * 0.08, height * 0.14, width * 0.05, height * 0.74);

    ctx.fillStyle = '#8eb832';
    ctx.beginPath();
    ctx.ellipse(width * 0.45, height * 0.14, width * 0.42, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Grass
    ctx.fillStyle = '#7ea827';
    ctx.fillRect(0, height * 0.84, width, height * 0.16);

    const toPxX = (wx: number) => ((wx + 5) / 10) * width;
    const toPxY = (wy: number) => ((3.8 - wy) / 7) * height;

    // Crow
    ctx.fillStyle = '#15141a';
    ctx.beginPath();
    ctx.arc(toPxX(state.crowX), toPxY(state.crowY), width * 0.032, 0, Math.PI * 2);
    ctx.fill();

    // Cheeses
    for (const c of state.cheeses) {
      ctx.fillStyle = c.kind === 'phoenix' ? '#ffdd47' : '#f5c542';
      ctx.beginPath();
      ctx.arc(toPxX(c.x), toPxY(c.y), width * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Fox
    ctx.fillStyle = '#ab311d';
    ctx.beginPath();
    ctx.ellipse(toPxX(state.foxX), toPxY(GROUND_Y + 0.55), width * 0.036, height * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  public dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.parchmentProgram) gl.deleteProgram(this.parchmentProgram);
    if (this.toonProgram) gl.deleteProgram(this.toonProgram);
    if (this.htmlQuadProgram) gl.deleteProgram(this.htmlQuadProgram);
    if (this.hudSlot) gl.deleteTexture(this.hudSlot.texture);
    if (this.bubbleSlot) gl.deleteTexture(this.bubbleSlot.texture);
  }
}
