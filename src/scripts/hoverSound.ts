let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let ready = false;

const PITCH_MIN = 0.85;
const PITCH_MAX = 1.25;
const VOLUME = 0.45;

async function bootstrap() {
  if (ready || buffer) return;
  ready = true;
  try {
    ctx = new AudioContext();
    const res = await fetch('/click2.wav');
    const arr = await res.arrayBuffer();
    buffer = await ctx.decodeAudioData(arr);
  } catch {
    ready = false;
  }
}

function playHover() {
  if (!ctx || !buffer) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value =
    PITCH_MIN + Math.random() * (PITCH_MAX - PITCH_MIN);

  const gain = ctx.createGain();
  gain.gain.value = VOLUME;

  source.connect(gain).connect(ctx.destination);
  source.start();
}

function attach() {
  const ACTIVATION_EVENTS = ['click', 'keydown', 'touchstart'] as const;
  ACTIVATION_EVENTS.forEach((evt) => {
    document.addEventListener(evt, () => bootstrap(), { once: true });
  });

  const selector = '.nav-link, .join-session-btn, .mobile-menu__link';
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener('mouseenter', playHover);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attach);
} else {
  attach();
}
