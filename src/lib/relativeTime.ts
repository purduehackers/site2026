// Self-contained so the same formatter can run on the server and be inlined
// beside <time>, before cached HTML paints. Do not add imported dependencies.
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function startRelativeTime(format: typeof formatRelativeTime) {
  const element = document.currentScript?.previousElementSibling;
  if (!(element instanceof HTMLTimeElement)) return;
  const update = () => {
    const label = format(element.dateTime);
    if (label && label !== element.textContent) element.textContent = label;
  };
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(timer);
  const resume = () => {
    stop();
    update();
    if (!document.hidden) timer = setInterval(update, 60_000);
  };
  resume();
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', resume);
}
