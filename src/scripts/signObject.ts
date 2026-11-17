/**
 * A 3D sketch of The Sign: the glider as five lit blocks, coloured by the
 * current Lightning Time (the ph component theme keeps --ph-bolt/zap/spark up
 * to date on :root). Drag to turn it. Without WebGL the static SVG glider
 * underneath stays visible.
 */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

// Glider cells (x right, y down) and which Lightning channel lights each one,
// matching the LightningGlider mark: a = zap, b = spark, c = bolt.
const CELLS: [number, number, string][] = [
  [1, 0, '--ph-zap'],
  [1, 1, '--ph-zap'],
  [2, 1, '--ph-spark'],
  [2, 2, '--ph-spark'],
  [0, 2, '--ph-bolt'],
];

export function initSign(host: HTMLElement) {
  const canvas = host.querySelector('canvas');
  if (!canvas) return;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return; // fallback SVG stays
  }
  host.dataset.ready = '';

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1));
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);

  const sign = new Group();
  const box = new BoxGeometry(0.94, 0.94, 0.5);
  const edges = new EdgesGeometry(box);
  const side = new MeshBasicMaterial({ color: 0x161616 });
  const outline = new LineBasicMaterial({ color: 0xfbf7ec });
  const blocks = CELLS.map(([x, y, channel]) => {
    const face = new MeshBasicMaterial({ color: 0xfcd202 });
    // lit front and back, dark sides: reads as a lightbox, not a sticker
    const mesh = new Mesh(box, [side, side, side, side, face, face]);
    mesh.position.set(x - 1, 1 - y, 0);
    mesh.add(new LineSegments(edges, outline));
    sign.add(mesh);
    return { face, channel };
  });
  sign.rotation.set(-0.25, 0.6, 0);
  scene.add(sign);

  const paint = () => {
    const style = getComputedStyle(document.documentElement);
    for (const { face, channel } of blocks) {
      const value = style.getPropertyValue(channel).trim();
      if (value) face.color = new Color(value);
    }
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let spin = 0.004;
  let raf = 0;
  let frames = 0;

  const draw = () => renderer.render(scene, camera);
  // The loop runs only while the sign is on screen and motion is allowed;
  // otherwise frames are drawn on demand (drag, resize, colour tick).
  const frame = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (frames++ % 30 === 0) paint();
    if (!dragging) sign.rotation.y += spin;
    draw();
    if (!reduced.matches) raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (!raf && visible && !reduced.matches)
      raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };

  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    sign.rotation.y += (e.clientX - lastX) * 0.01;
    // tilt stays within a quarter turn so it never flips upside down
    sign.rotation.x = Math.max(
      -0.9,
      Math.min(0.9, sign.rotation.x + (e.clientY - lastY) * 0.01)
    );
    spin = Math.sign(e.clientX - lastX || spin) * 0.004;
    lastX = e.clientX;
    lastY = e.clientY;
    if (reduced.matches) draw();
  });
  const release = () => (dragging = false);
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(host);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener('change', start);
  // Lightning Time colours still change with motion reduced.
  window.setInterval(() => {
    if (visible && reduced.matches) {
      paint();
      draw();
    }
  }, 1000);
  new ResizeObserver(resize).observe(host);
  paint();
  resize();
  document.addEventListener(
    'astro:before-swap',
    () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
    { once: true }
  );
}
