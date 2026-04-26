// ── Section scroll ─────────────────────────────────────────────────────────

(function initSectionScroll() {
  const DURATION = 600;
  const areas    = () => Array.from(document.querySelectorAll('.area'));

  let animating  = false;
  let touchStartY = 0;

  function currentIndex() {
    const sections = areas();
    const mid = window.scrollY + window.innerHeight / 2;
    let closest = 0;
    let closestDist = Infinity;
    sections.forEach((el, i) => {
      const dist = Math.abs(el.offsetTop + el.offsetHeight / 2 - mid);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    return closest;
  }

  function scrollToIndex(index) {
    if (animating) return;
    const sections = areas();
    if (index < 0 || index >= sections.length) return;

    const target = sections[index].offsetTop;
    const from   = window.scrollY;
    if (Math.abs(target - from) < 2) return;

    animating = true;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / DURATION, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      window.scrollTo(0, from + (target - from) * e);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        window.scrollTo(0, target);
        animating = false;
      }
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', e => {
    e.preventDefault();
    if (animating) return;
    scrollToIndex(currentIndex() + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (animating) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 30) return;
    scrollToIndex(currentIndex() + (delta > 0 ? 1 : -1));
  }, { passive: true });
})();
