/**
 * Illustrated 3D guide to the HIVE makerspace (BHEE 280N), drawn from the
 * one public photo of the room. Not to scale. Three areas can be picked:
 * clicking one (or its hotspot button) selects the matching registry Tab, and
 * selecting a Tab lights the area, so the HTML tabs stay the real content.
 *
 * Renders only when something changes: no idle animation loop.
 */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

type Zone = 'print' | 'electronics' | 'tools';

const INK = new Color(0xfbf7ec);
const YELLOW = new Color(0xfcd202);
const DIM = 0.28;

// Where each area's hotspot sits in the room (metres-ish).
const ANCHORS: Record<Zone, Vector3> = {
  print: new Vector3(1.3, 2.05, -2.15),
  electronics: new Vector3(-1.75, 1.3, -2.05),
  tools: new Vector3(2.35, 1.2, 0.7),
};

export function initRoom(stage: HTMLElement, tabs: HTMLElement) {
  const canvas = stage.querySelector('canvas');
  if (!canvas) return;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return; // the photo underneath stays
  }

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.8);
  sun.position.set(2, 5, 3);
  scene.add(sun);

  const room = new Group();
  scene.add(room);
  const zoneParts: Record<Zone, { edges: LineBasicMaterial[] }> = {
    print: { edges: [] },
    electronics: { edges: [] },
    tools: { edges: [] },
  };
  const pickable: Mesh[] = [];

  /** A box resting on y = `bottom`, outlined like a drawing. */
  function box(
    [w, h, d]: [number, number, number],
    [x, bottom, z]: [number, number, number],
    color: number,
    zone?: Zone,
    lines = DIM
  ) {
    const geometry = new BoxGeometry(w, h, d);
    const mesh = new Mesh(geometry, new MeshLambertMaterial({ color }));
    mesh.position.set(x, bottom + h / 2, z);
    const edges = new LineBasicMaterial({
      color: INK,
      transparent: true,
      opacity: lines,
    });
    mesh.add(new LineSegments(new EdgesGeometry(geometry), edges));
    room.add(mesh);
    if (zone) {
      mesh.userData.zone = zone;
      zoneParts[zone].edges.push(edges);
      pickable.push(mesh);
    }
    return mesh;
  }

  // Shell: floor, back wall and left wall only, like a cutaway diorama.
  box([6, 0.06, 5], [0, -0.06, 0], 0x161616, undefined, 0.2);
  const grid = new GridHelper(6, 12, 0x2a2a2a, 0x2a2a2a);
  grid.scale.set(1, 1, 5 / 6);
  grid.position.y = 0.002;
  room.add(grid);
  box([6, 2.6, 0.08], [0, 0, -2.54], 0x1a1a1a, undefined, 0.3);
  box([0.08, 2.6, 5], [-3.04, 0, 0], 0x141414, undefined, 0.3);

  // Electronics bench along the back wall, left: wood top, parts drawers,
  // a soldering station.
  box([2.3, 0.05, 0.7], [-1.75, 0.86, -2.12], 0x8f6c45, 'electronics');
  for (const x of [-2.82, -0.68])
    box([0.05, 0.86, 0.6], [x, 0, -2.12], 0x222222, 'electronics');
  box([0.5, 0.38, 0.28], [-2.3, 0.91, -2.28], 0xd9d6cc, 'electronics');
  box([0.3, 0.14, 0.24], [-1.3, 0.91, -2.2], 0x1c1c1c, 'electronics');
  box([0.12, 0.1, 0.12], [-1.05, 0.91, -2.14], 0xfcd202, 'electronics');

  // Printer shelf on the back wall: steel frame, two printers.
  const shelf = { x: 1.35, w: 2.2, d: 0.62, z: -2.15 };
  for (const y of [0.18, 1.02, 1.86])
    box([shelf.w, 0.04, shelf.d], [shelf.x, y, shelf.z], 0x7c6347, 'print');
  for (const dx of [-1, 1])
    for (const dz of [-1, 1])
      box(
        [0.05, 1.95, 0.05],
        [shelf.x + (dx * shelf.w) / 2, 0, shelf.z + (dz * shelf.d) / 2],
        0x0a0a0a,
        'print'
      );
  // Bambu Lab H2D Pro below, with its AMS on top of the shelf beside it
  box([0.72, 0.66, 0.52], [0.8, 0.22, -2.15], 0x141414, 'print');
  box([0.6, 0.48, 0.02], [0.8, 0.3, -1.88], 0x2b2b2b, 'print');
  // Prusa CORE One above, orange trim
  box([0.52, 0.66, 0.5], [1.5, 1.06, -2.15], 0x1a1a1a, 'print');
  box([0.06, 0.66, 0.5], [1.79, 1.06, -2.15], 0xff9300, 'print');
  box([0.48, 0.2, 0.3], [0.62, 1.06, -2.2], 0x222222, 'print');

  // Workbench on the right: butcher block over a black cabinet.
  box([0.8, 0.82, 2.3], [2.4, 0, 0.6], 0x161616, 'tools');
  box([0.9, 0.06, 2.4], [2.4, 0.82, 0.6], 0x9b7448, 'tools');
  box([0.42, 0.06, 0.3], [2.35, 0.88, 0.2], 0xb3202a, 'tools');
  box([0.5, 0.08, 0.36], [2.3, 0.88, 1.1], 0x1c1c1c, 'tools');

  // The big shared table and stools (not an equipment area).
  box([2.1, 0.05, 1.1], [-1.6, 1.0, 0.7], 0xbdbab1);
  box([0.18, 1.0, 0.7], [-1.6, 0, 0.7], 0x1c1c1c);
  for (const [x, z] of [
    [-2.3, 1.55],
    [-1.2, 1.6],
    [-0.35, 0.65],
  ])
    box([0.38, 0.7, 0.38], [x, 0, z], 0x262626);

  // Camera: orthographic, looking in from the front right. Dragging turns
  // the room a little; it eases back into place on its own.
  const camera = new OrthographicCamera();
  const target = new Vector3(-0.1, 1.0, -0.2);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const YAW = 0.62;
  let yaw = YAW;
  let goalYaw = YAW;

  const aim = () => {
    const pitch = 0.58;
    const r = 12;
    camera.position.set(
      target.x + r * Math.sin(yaw) * Math.cos(pitch),
      target.y + r * Math.sin(pitch),
      target.z + r * Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(target);
  };

  let width = 0;
  let height = 0;
  const resize = () => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const half = Math.max(3.05, 4.5 / aspect);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.near = 0.1;
    camera.far = 40;
    camera.updateProjectionMatrix();
    invalidate();
  };

  // Highlights: the selected area draws in yellow, a hovered one in full ink.
  let selected: Zone | null = null;
  let hovered: Zone | null = null;
  const paint = () => {
    for (const zone of Object.keys(zoneParts) as Zone[]) {
      for (const edges of zoneParts[zone].edges) {
        edges.color.copy(zone === selected ? YELLOW : INK);
        edges.opacity = zone === selected || zone === hovered ? 1 : DIM + 0.1;
      }
    }
  };

  const spots = [...stage.querySelectorAll<HTMLElement>('[data-zone]')];
  const point = new Vector3();
  const placeSpots = () => {
    for (const spot of spots) {
      point.copy(ANCHORS[spot.dataset.zone as Zone]).project(camera);
      const x = ((point.x + 1) / 2) * width;
      const y = ((1 - point.y) / 2) * height;
      spot.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      spot.toggleAttribute('data-on', spot.dataset.zone === selected);
    }
  };

  let queued = false;
  const frame = () => {
    queued = false;
    const settling = Math.abs(goalYaw - yaw) > 0.0005;
    yaw = settling && !reduced.matches ? yaw + (goalYaw - yaw) * 0.16 : goalYaw;
    aim();
    paint();
    renderer.render(scene, camera);
    placeSpots();
    if (settling && !reduced.matches) invalidate();
  };
  function invalidate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  }

  // Tabs are the source of truth for the selection.
  const tabButtons = [
    ...tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ];
  const readTabs = () => {
    const value = tabButtons.find(
      (t) => t.getAttribute('aria-selected') === 'true'
    )?.dataset.value;
    selected = value && value in ANCHORS ? (value as Zone) : null;
    invalidate();
  };
  new MutationObserver(readTabs).observe(tabs, {
    attributeFilter: ['aria-selected'],
    subtree: true,
  });
  const choose = (zone: Zone) =>
    tabButtons.find((t) => t.dataset.value === zone)?.click();

  for (const spot of spots) {
    const zone = spot.dataset.zone as Zone;
    spot.addEventListener('click', () => choose(zone));
    spot.addEventListener('pointerenter', () => {
      hovered = zone;
      invalidate();
    });
    spot.addEventListener('pointerleave', () => {
      hovered = null;
      invalidate();
    });
  }

  // Pointer: hover and click areas in the drawing, drag sideways to turn.
  const ray = new Raycaster();
  const ndc = new Vector2();
  const zoneAt = (e: PointerEvent): Zone | null => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    ray.setFromCamera(ndc, camera);
    return (ray.intersectObjects(pickable, false)[0]?.object.userData.zone ??
      null) as Zone | null;
  };
  let downX: number | null = null;
  let dragged = false;
  canvas.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    dragged = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (downX !== null && e.pointerType !== 'touch') {
      const dx = e.clientX - downX;
      if (Math.abs(dx) > 4) {
        dragged = true;
        canvas.setPointerCapture(e.pointerId);
        goalYaw = Math.min(1.15, Math.max(0.1, YAW + dx * 0.004));
        invalidate();
        return;
      }
    }
    const zone = zoneAt(e);
    canvas.style.cursor = zone ? 'pointer' : 'grab';
    if (zone !== hovered) {
      hovered = zone;
      invalidate();
    }
  });
  const release = (e: PointerEvent) => {
    if (downX === null) return;
    downX = null;
    if (dragged) {
      goalYaw = YAW; // spring back
      invalidate();
      return;
    }
    const zone = zoneAt(e);
    if (zone) choose(zone);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => {
    downX = null;
    goalYaw = YAW;
    invalidate();
  });
  canvas.addEventListener('pointerleave', () => {
    if (downX !== null || !hovered) return;
    hovered = null;
    invalidate();
  });

  new ResizeObserver(resize).observe(stage);
  readTabs();
  resize();
  stage.dataset.ready = '';
}
