// Three.js loads only when the room is about to scroll into view.
document.querySelectorAll<HTMLElement>('[data-room]').forEach((room) => {
  const stage = room.querySelector<HTMLElement>('[data-room-stage]');
  const tabs = room.querySelector<HTMLElement>('[data-ph-tabs]');
  if (!stage || !tabs) return;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      import('../scripts/roomGuide').then(({ initRoom }) =>
        initRoom(stage, tabs)
      );
    },
    { rootMargin: '300px 0px' }
  );
  io.observe(stage);
});
