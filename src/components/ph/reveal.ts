const PAD = 16;
const OFFSET = 36;

let card: HTMLElement | null = null;
let w = 0;
let h = 0;
let tx = 0;
let ty = 0;
let cx = 0;
let cy = 0;
let raf = 0;
let cool: ReturnType<typeof setTimeout> | undefined;

// Trailing rather than 1:1, so it settles when the pointer stops.
const ease = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.22);

function target(x: number, y: number) {
  let left = x + OFFSET;
  if (left + w + PAD > innerWidth) left = x - OFFSET - w;
  tx = Math.max(PAD, Math.min(left, innerWidth - w - PAD));

  const maxTop = innerHeight - h - PAD;
  ty = maxTop <= PAD ? PAD : PAD + (y / innerHeight) * (maxTop - PAD);
}

function write() {
  card!.style.setProperty("--card-x", `${Math.round(cx)}px`);
  card!.style.setProperty("--card-y", `${Math.round(cy)}px`);
}

function step() {
  if (!card) {
    raf = 0;
    return;
  }
  const k = ease();
  cx += (tx - cx) * k;
  cy += (ty - cy) * k;
  write();
  raf = requestAnimationFrame(step);
}

function open(row: HTMLElement, x: number, y: number) {
  card = row.querySelector<HTMLElement>(".ph-reveal-row__card");
  if (!card || !matchMedia("(hover: hover)").matches) return;

  w = card.offsetWidth;
  h = card.offsetHeight;
  target(x, y);
  cx = tx;
  cy = ty;
  write();

  clearTimeout(cool);
  document.documentElement.setAttribute("data-ph-warm", "");
  if (!raf) raf = requestAnimationFrame(step);
}

function close() {
  card = null;
  cool = setTimeout(() => document.documentElement.removeAttribute("data-ph-warm"), 400);
}

export function attachReveal(row: HTMLElement) {
  const enter = (e: PointerEvent) => open(row, e.clientX, e.clientY);
  const move = (e: PointerEvent) => {
    if (card) target(e.clientX, e.clientY);
  };
  const focus = () => {
    const r = row.getBoundingClientRect();
    open(row, r.left + 24, r.bottom);
  };

  row.addEventListener("pointerenter", enter);
  row.addEventListener("pointermove", move);
  row.addEventListener("pointerleave", close);
  row.addEventListener("focusin", focus);
  row.addEventListener("focusout", close);

  return () => {
    row.removeEventListener("pointerenter", enter);
    row.removeEventListener("pointermove", move);
    row.removeEventListener("pointerleave", close);
    row.removeEventListener("focusin", focus);
    row.removeEventListener("focusout", close);
  };
}
