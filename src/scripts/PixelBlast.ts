/**
 * PixelBlast – interactive Bayer-dithering overlay (inspired by github.com/zavalit/bayer-dithering-webgl-demo).
 * Vanilla TS version for use in Astro; mounts to a container and returns a cleanup function.
 */
import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, Effect } from 'postprocessing';

const SHAPE_MAP: Record<string, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3,
};

const MAX_CLICKS = 10;

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform float uTopFade;

uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

const int   MAX_CLICKS = 10;

uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float topBlend = 0.0;
  if (uTopFade > 0.0) {
    float topNorm = (uResolution.y - gl_FragCoord.y) / uResolution.y;
    topBlend = 1.0 - smoothstep(0.0, uTopFade, topNorm);
  }

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT     = 1.0;
  const float dampR     = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity * (1.0 - topBlend));
    }
  }

  feed = max(feed, topBlend);

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;

  vec3 srgbColor = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(srgbColor, M);
}
`;

function createTouchTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const trail: Array<{
    x: number;
    y: number;
    age: number;
    force: number;
    vx: number;
    vy: number;
  }> = [];
  let last: { x: number; y: number } | null = null;
  const maxAge = 64;
  let radius = 0.1 * size;
  const speed = 1 / maxAge;
  const clear = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const drawPoint = (p: (typeof trail)[0]) => {
    const pos = { x: p.x * size, y: (1 - p.y) * size };
    let intensity = 1;
    const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
    const easeOutQuad = (t: number) => -t * (t - 2);
    if (p.age < maxAge * 0.3) intensity = easeOutSine(p.age / (maxAge * 0.3));
    else
      intensity = easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
    intensity *= p.force;
    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${
      intensity * 255
    }`;
    const offset = size * 5;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = `rgba(${color},${0.22 * intensity})`;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,0,0,1)';
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  const addTouch = (norm: { x: number; y: number }) => {
    let force = 0;
    let vx = 0;
    let vy = 0;
    if (last) {
      const dx = norm.x - last.x;
      const dy = norm.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / (d || 1);
      vy = dy / (d || 1);
      force = Math.min(dd * 10000, 1);
    }
    last = { x: norm.x, y: norm.y };
    trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
  };
  const update = () => {
    clear();
    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i];
      const f = point.force * speed * (1 - point.age / maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > maxAge) trail.splice(i, 1);
    }
    for (let i = 0; i < trail.length; i++) drawPoint(trail[i]);
    texture.needsUpdate = true;
  };
  return {
    canvas,
    texture,
    addTouch,
    update,
    set radiusScale(v: number) {
      radius = 0.1 * size * v;
    },
    get radiusScale() {
      return radius / (0.1 * size);
    },
    size,
  };
}

function createLiquidEffect(
  texture: THREE.Texture,
  opts?: { strength?: number; freq?: number }
) {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;

      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);

      float amt = uStrength * intensity * wave;

      uv += vec2(vx, vy) * amt;
    }
    `;
  return new Effect('LiquidEffect', fragment, {
    uniforms: new Map([
      ['uTexture', new THREE.Uniform(texture)],
      ['uStrength', new THREE.Uniform(opts?.strength ?? 0.025)],
      ['uTime', new THREE.Uniform(0)],
      ['uFreq', new THREE.Uniform(opts?.freq ?? 4.5)],
    ]),
  });
}

export interface PixelBlastOptions {
  variant: 'square' | 'circle' | 'triangle' | 'diamond';
  pixelSize: number;
  color: string;
  patternScale: number;
  patternDensity: number;
  pixelSizeJitter: number;
  enableRipples: boolean;
  rippleSpeed: number;
  rippleThickness: number;
  rippleIntensityScale: number;
  liquid: boolean;
  liquidStrength: number;
  liquidRadius: number;
  liquidWobbleSpeed: number;
  speed: number;
  transparent: boolean;
  edgeFade: number;
  topFade: number;
  antialias: boolean;
}

const DEFAULT_OPTIONS: PixelBlastOptions = {
  variant: 'square',
  pixelSize: 2,
  color: '#000000',
  patternScale: 2,
  patternDensity: 0.5,
  pixelSizeJitter: 0,
  enableRipples: true,
  rippleSpeed: 0.4,
  rippleThickness: 0.12,
  rippleIntensityScale: 1.5,
  liquid: false,
  liquidStrength: 0.12,
  liquidRadius: 1.2,
  liquidWobbleSpeed: 5,
  speed: 0.5,
  transparent: true,
  edgeFade: 0.25,
  topFade: 0,
  antialias: true,
};

export function initPixelBlast(
  container: HTMLElement,
  options: Partial<PixelBlastOptions> = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opts.antialias,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  if (opts.transparent) renderer.setClearAlpha(0);
  else renderer.setClearColor(0x000000, 1);

  const uniforms = {
    uResolution: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(opts.color) },
    uClickPos: {
      value: Array.from(
        { length: MAX_CLICKS },
        () => new THREE.Vector2(-1, -1)
      ),
    },
    uClickTimes: { value: new Float32Array(MAX_CLICKS) },
    uShapeType: { value: SHAPE_MAP[opts.variant] ?? 0 },
    uPixelSize: { value: opts.pixelSize * renderer.getPixelRatio() },
    uScale: { value: opts.patternScale },
    uDensity: { value: opts.patternDensity },
    uPixelJitter: { value: opts.pixelSizeJitter },
    uEnableRipples: { value: opts.enableRipples ? 1 : 0 },
    uRippleSpeed: { value: opts.rippleSpeed },
    uRippleThickness: { value: opts.rippleThickness },
    uRippleIntensity: { value: opts.rippleIntensityScale },
    uEdgeFade: { value: opts.edgeFade },
    uTopFade: { value: opts.topFade },
  };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SRC,
    fragmentShader: FRAGMENT_SRC,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    glslVersion: THREE.GLSL3,
  });
  const quadGeom = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeom, material);
  scene.add(quad);

  const clock = new THREE.Clock();
  const timeOffset =
    typeof window !== 'undefined' && window.crypto?.getRandomValues
      ? (() => {
          const u32 = new Uint32Array(1);
          window.crypto!.getRandomValues(u32);
          return u32[0] / 0xffffffff;
        })()
      : Math.random();

  const setSize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(
      renderer.domElement.width,
      renderer.domElement.height
    );
    if (composer)
      composer.setSize(renderer.domElement.width, renderer.domElement.height);
    uniforms.uPixelSize.value = opts.pixelSize * renderer.getPixelRatio();
  };

  let isHovering = false;
  let lastHoverRipple = 0;
  const HOVER_RIPPLE_INTERVAL = 0.12; // seconds (floaty + soft)

  let touch: ReturnType<typeof createTouchTexture> | null = null;
  let liquidEffect: ReturnType<typeof createLiquidEffect> | null = null;
  let composer: EffectComposer | null = null;

  if (opts.liquid) {
    touch = createTouchTexture();
    touch.radiusScale = opts.liquidRadius;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    liquidEffect = createLiquidEffect(touch.texture, {
      strength: opts.liquidStrength,
      freq: opts.liquidWobbleSpeed,
    });
    const effectPass = new EffectPass(camera, liquidEffect);
    effectPass.renderToScreen = true;
    composer.addPass(effectPass);
  }

  setSize();
  const resizeObserver = new ResizeObserver(setSize);
  resizeObserver.observe(container);

  const mapToPixels = (e: { clientX: number; clientY: number }) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const scaleX = renderer.domElement.width / rect.width;
    const scaleY = renderer.domElement.height / rect.height;
    const fx = (e.clientX - rect.left) * scaleX;
    // WebGL fragCoord has Y origin at bottom; convert from top-down client coords
    const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
    return {
      fx,
      fy,
      w: renderer.domElement.width,
      h: renderer.domElement.height,
    };
  };

  let clickIx = 0;
  // const emitRipple = (fx: number, fy: number) => {
  // 	uniforms.uClickPos.value[clickIx].set(fx, fy);
  // 	uniforms.uClickTimes.value[clickIx] = uniforms.uTime.value;
  // 	clickIx = (clickIx + 1) % MAX_CLICKS;
  // };

  const onPointerEnter = () => {
    isHovering = true;
  };

  const onPointerLeave = () => {
    isHovering = false;
  };

  // renderer.domElement.addEventListener('pointerenter', onPointerEnter);
  // renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  const onPointerDown = (e: PointerEvent) => {
    const { fx, fy } = mapToPixels(e);
    uniforms.uClickPos.value[clickIx].set(fx, fy);
    uniforms.uClickTimes.value[clickIx] = uniforms.uTime.value;
    clickIx = (clickIx + 1) % MAX_CLICKS;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!touch) return;
    const { fx, fy, w, h } = mapToPixels(e);
    touch.addTouch({ x: fx / w, y: fy / h });
  };

  // const onPointerMove = (e: PointerEvent) => {
  // 	const { fx, fy, w, h } = mapToPixels(e);

  // 	// liquid effect (keep this)
  // 	if (touch) {
  // 		touch.addTouch({ x: fx / w, y: fy / h });
  // 	}

  // 	// hover ripples
  // 	if (!isHovering) return;

  // 	const t = uniforms.uTime.value;
  // 	if (t - lastHoverRipple > HOVER_RIPPLE_INTERVAL) {
  // 		emitRipple(fx, fy);
  // 		lastHoverRipple = t;
  // 	}
  // };

  renderer.domElement.addEventListener('pointerdown', onPointerDown, {
    passive: true,
  });
  renderer.domElement.addEventListener('pointermove', onPointerMove, {
    passive: true,
  });

  // Pause when tab is not active to save energy
  let isTabVisible = !document.hidden;
  const handleVisibilityChange = () => {
    isTabVisible = !document.hidden;
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  let raf = 0;
  let stopped = false;
  const animate = () => {
    if (stopped) return;

    if (isTabVisible) {
      uniforms.uTime.value = timeOffset + clock.getElapsedTime() * opts.speed;
      if (liquidEffect) {
        liquidEffect.uniforms.get('uTime')!.value = uniforms.uTime.value;
      }
      if (composer) {
        if (touch) touch.update();
        composer.passes.forEach((p) => {
          const pass = p as EffectPass & {
            effects?: Array<{ uniforms?: Map<string, { value: number }> }>;
          };
          if (pass.effects)
            pass.effects.forEach((eff) => {
              const u = eff.uniforms?.get('uTime');
              if (u) u.value = uniforms.uTime.value;
            });
        });
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }

    raf = requestAnimationFrame(animate);
  };
  raf = requestAnimationFrame(animate);

  return () => {
    stopped = true;
    resizeObserver.disconnect();
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    quadGeom.dispose();
    material.dispose();
    composer?.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
