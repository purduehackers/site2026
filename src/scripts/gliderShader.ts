type GliderShaderOptions = {
  gridCols: number;
  gridRows: number;
  cellSize: number;
  speedMs: number;
  cellColor?: [number, number, number]; // 0..1
};

// gosper glider gun but shader heh
const GOSPER_GLIDER_GUN: Array<[number, number]> = [
  [1, 5],
  [1, 6],
  [2, 5],
  [2, 6],
  [11, 5],
  [11, 6],
  [11, 7],
  [12, 4],
  [12, 8],
  [13, 3],
  [13, 9],
  [14, 3],
  [14, 9],
  [15, 6],
  [16, 4],
  [16, 8],
  [17, 5],
  [17, 6],
  [17, 7],
  [18, 6],
  [21, 3],
  [21, 4],
  [21, 5],
  [22, 3],
  [22, 4],
  [22, 5],
  [23, 2],
  [23, 6],
  [25, 1],
  [25, 2],
  [25, 6],
  [25, 7],
  [35, 3],
  [35, 4],
  [36, 3],
  [36, 4],
];

const GUN_OFFSET_X = 5;
const GUN_OFFSET_Y = 10;

const VERT_FULL_SCREEN_TRI = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  // Full-screen triangle (no VBO needed)
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAG_STEP = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uState;
uniform ivec2 uGridSize; // (cols, rows)
out vec4 outColor;

int cell(ivec2 c) {
  // wrap is off: out-of-bounds treated as dead
  if (c.x < 0 || c.y < 0 || c.x >= uGridSize.x || c.y >= uGridSize.y) return 0;
  // state stored in RED channel, 0..1
  return int(texelFetch(uState, c, 0).r > 0.5);
}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy); // pixel coords in the simulation FBO (1px per cell)

  int n = 0;
  n += cell(c + ivec2(-1, -1));
  n += cell(c + ivec2( 0, -1));
  n += cell(c + ivec2( 1, -1));
  n += cell(c + ivec2(-1,  0));
  n += cell(c + ivec2( 1,  0));
  n += cell(c + ivec2(-1,  1));
  n += cell(c + ivec2( 0,  1));
  n += cell(c + ivec2( 1,  1));

  int alive = cell(c);
  int nextAlive = 0;
  if (alive == 1) {
    nextAlive = (n == 2 || n == 3) ? 1 : 0;
  } else {
    nextAlive = (n == 3) ? 1 : 0;
  }

  float v = nextAlive == 1 ? 1.0 : 0.0;
  outColor = vec4(v, 0.0, 0.0, 1.0);
}
`;

const FRAG_RENDER = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uState;
uniform ivec2 uGridSize;   // (cols, rows)
uniform float uCellPx;     // cell size in device pixels
uniform vec3 uCellColor;   // 0..1
uniform float uDpr;

out vec4 outColor;

void main() {
  // Render target is scaled up (cellSize * dpr).
  // gl_FragCoord origin is bottom-left; our original canvas code treats y=0 at top.
  vec2 frag = gl_FragCoord.xy;
  ivec2 cellCoord = ivec2(floor(frag / uCellPx));
  int x = cellCoord.x;
  int y = (uGridSize.y - 1) - cellCoord.y; // flip vertically to match Canvas 2D

  if (x < 0 || y < 0 || x >= uGridSize.x || y >= uGridSize.y) {
    outColor = vec4(0.0);
    return;
  }

  float alive = texelFetch(uState, ivec2(x, y), 0).r;
  float a = step(0.5, alive);
  outColor = vec4(uCellColor, a);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("Failed to create shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "Unknown shader compile error";
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error("Failed to create program");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "Unknown program link error";
    gl.deleteProgram(prog);
    throw new Error(log);
  }
  return prog;
}

function createStateTexture(
  gl: WebGL2RenderingContext,
  cols: number,
  rows: number,
  initial?: Uint8Array
) {
  const tex = gl.createTexture();
  if (!tex) throw new Error("Failed to create texture");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R8,
    cols,
    rows,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    initial ?? null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFramebuffer(gl: WebGL2RenderingContext, tex: WebGLTexture) {
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Failed to create framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(fbo);
    throw new Error(`Incomplete framebuffer: ${status}`);
  }
  return fbo;
}

function buildInitialState(cols: number, rows: number) {
  const data = new Uint8Array(cols * rows);
  for (const [x, y] of GOSPER_GLIDER_GUN) {
    const gx = GUN_OFFSET_X + x;
    const gy = GUN_OFFSET_Y + y;
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
      data[gy * cols + gx] = 255;
    }
  }
  return data;
}

export function initGliderShader(
  canvas: HTMLCanvasElement,
  opts: GliderShaderOptions
): () => void {
  const { gridCols: cols, gridRows: rows, cellSize, speedMs } = opts;
  const cellColor = opts.cellColor ?? [0, 0, 0];

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!gl) {
    throw new Error(
      "WebGL2 not available (needed for shader-based Game of Life)."
    );
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = cols * cellSize;
  const cssH = rows * cellSize;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // Programs
  const progStep = createProgram(gl, VERT_FULL_SCREEN_TRI, FRAG_STEP);
  const progRender = createProgram(gl, VERT_FULL_SCREEN_TRI, FRAG_RENDER);

  // State (ping-pong textures)
  const initial = buildInitialState(cols, rows);
  let texA = createStateTexture(gl, cols, rows, initial);
  let texB = createStateTexture(gl, cols, rows);
  let fboB = createFramebuffer(gl, texB);

  // We'll also keep an FBO for texA when we swap (so we don't recreate every frame)
  let fboA = createFramebuffer(gl, texA);

  // A dummy VAO is required in WebGL2 even for gl_VertexID tricks
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Failed to create VAO");
  gl.bindVertexArray(vao);
  gl.bindVertexArray(null);

  const setCommonState = () => {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  };

  function step() {
    setCommonState();
    if (gl === null) {
      console.error("WebGL not supported or context is null");
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
    gl.viewport(0, 0, cols, rows);

    gl.useProgram(progStep);
    gl.bindVertexArray(vao);

    const uState = gl.getUniformLocation(progStep, "uState");
    const uGridSize = gl.getUniformLocation(progStep, "uGridSize");

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(uState, 0);
    gl.uniform2i(uGridSize, cols, rows);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // swap A/B (and their FBOs)
    [texA, texB] = [texB, texA];
    [fboA, fboB] = [fboB, fboA];
  }

  function render() {
    if (gl === null) {
      console.error("WebGL not supported or context is null");
      return;
    }
    setCommonState();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(progRender);
    gl.bindVertexArray(vao);

    const uState = gl.getUniformLocation(progRender, "uState");
    const uGridSize = gl.getUniformLocation(progRender, "uGridSize");
    const uCellPx = gl.getUniformLocation(progRender, "uCellPx");
    const uCellColor = gl.getUniformLocation(progRender, "uCellColor");
    const uDpr = gl.getUniformLocation(progRender, "uDpr");

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(uState, 0);
    gl.uniform2i(uGridSize, cols, rows);
    gl.uniform1f(uCellPx, cellSize * dpr);
    gl.uniform3f(uCellColor, cellColor[0], cellColor[1], cellColor[2]);
    gl.uniform1f(uDpr, dpr);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  // initial render
  render();

  // Energy-efficient animation loop
  let isTabVisible = !document.hidden;
  let lastStepTime = 0;
  let animationId: number | null = null;
  let stopped = false;

  // Pause when tab is not active (biggest energy saver)
  const handleVisibilityChange = () => {
    isTabVisible = !document.hidden;
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  const loop = (timestamp: number) => {
    if (stopped) return;

    if (isTabVisible) {
      if (timestamp - lastStepTime >= speedMs) {
        step();
        render();
        lastStepTime = timestamp;
      }
    }

    animationId = requestAnimationFrame(loop);
  };

  animationId = requestAnimationFrame(loop);

  return () => {
    stopped = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    gl.deleteVertexArray(vao);
    gl.deleteFramebuffer(fboA);
    gl.deleteFramebuffer(fboB);
    gl.deleteTexture(texA);
    gl.deleteTexture(texB);
    gl.deleteProgram(progStep);
    gl.deleteProgram(progRender);
  };
}
