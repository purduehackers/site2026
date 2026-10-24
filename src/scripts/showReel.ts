import { DashCascade } from './waveforum/engine';

export function initShowReel(reel: HTMLElement) {
  const stage = reel.querySelector<HTMLElement>('.show-reel__stage')!;
  const content = reel.querySelector<HTMLElement>('.show-reel__content')!;
  const scenes = Array.from(
    reel.querySelectorAll<HTMLElement>('[data-show-scene]')
  );
  const links = Array.from(
    reel.querySelectorAll<HTMLAnchorElement>('[data-show-link]')
  );
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = reel.querySelector<HTMLCanvasElement>('[data-waveforum]')!;
  let shader: DashCascade | undefined;
  let shaderRequested = false;
  let disposed = false;
  let visible = false;
  let active = -1;
  let frame = 0;
  let nearby = false;
  let loaded = false;

  function syncShader() {
    if (!shader) return;
    const running =
      visible && active === 0 && !document.hidden && !motion.matches;
    canvas.toggleAttribute('data-running', running);
    if (running) shader.start();
    else {
      shader.stop();
      if (visible && active === 0 && motion.matches) shader.renderStill();
    }
  }

  function loadShader() {
    if (shaderRequested || disposed) return;
    shaderRequested = true;
    try {
      shader = new DashCascade(canvas);
      if (!shader.ok) {
        shader.destroy();
        shader = undefined;
        return;
      }
      shader.renderStill();
      canvas.dataset.ready = '';
      syncShader();
    } catch {
      // The static artwork stays visible if WebGL is unavailable.
    }
  }

  function activate(index: number) {
    if (index === active) return;
    active = index;
    scenes.forEach((scene, i) => {
      scene.toggleAttribute('data-active', i === index);
      links[i].toggleAttribute('data-active', i === index);
    });
    reel.dataset.show = links[index].dataset.showLink;
    reel.style.setProperty('--show-accent', links[index].dataset.color!);
    syncShader();
  }

  function loadImages() {
    if (loaded) return;
    loaded = true;
    reel
      .querySelectorAll<HTMLImageElement>('img[data-src]')
      .forEach((image) => {
        image.src = image.dataset.src!;
        void image.decode().catch(() => {});
      });
  }

  function update() {
    frame = 0;
    if (!nearby) return;
    const rect = reel.getBoundingClientRect();
    const travel = reel.offsetHeight - stage.offsetHeight;
    const progress = travel > 0 ? Math.max(0, -rect.top) / travel : 0;
    activate(Math.min(scenes.length - 1, Math.floor(progress * scenes.length)));
  }

  function schedule() {
    if (!frame && nearby) frame = requestAnimationFrame(update);
  }

  function measure() {
    // Keep every link reachable in short/zoomed viewports. CSS sticky supplies
    // the pin; wheel, touch, keyboard and scrollbar scrolling stay native.
    const enoughRoom = content.offsetHeight + 192 <= window.innerHeight;
    reel.toggleAttribute('data-pinned', !motion.matches && enoughRoom);
    shader?.resize();
    shader?.redraw();
    syncShader();
    schedule();
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      nearby = entry.isIntersecting;
      if (nearby) {
        loadImages();
        loadShader();
        schedule();
      }
    },
    { rootMargin: '100% 0px' }
  );

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncShader();
  });

  function movePointer(event: PointerEvent) {
    if (active !== 0 || !visible) return;
    const rect = canvas.getBoundingClientRect();
    shader?.setPointer(event.clientX - rect.left, event.clientY - rect.top);
  }

  function leavePointer() {
    shader?.setPointer(null, null);
  }

  function onFocus(event: FocusEvent) {
    const index = links.findIndex((link) => link === event.target);
    if (index >= 0) {
      loadImages();
      activate(index);
    }
  }

  reel.dataset.enhanced = '';
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(content);
  resizeObserver.observe(stage);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  motion.addEventListener('change', measure);
  reel.addEventListener('focusin', onFocus);
  stage.addEventListener('pointermove', movePointer, { passive: true });
  stage.addEventListener('pointerleave', leavePointer);
  document.addEventListener('visibilitychange', syncShader);
  observer.observe(reel);
  visibilityObserver.observe(stage);
  measure();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', measure);
    motion.removeEventListener('change', measure);
    reel.removeEventListener('focusin', onFocus);
    stage.removeEventListener('pointermove', movePointer);
    stage.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncShader);
    shader?.destroy();
    delete canvas.dataset.ready;
    delete canvas.dataset.running;
    delete reel.dataset.enhanced;
    delete reel.dataset.pinned;
  };
}
