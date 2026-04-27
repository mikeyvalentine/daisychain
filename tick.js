// ── Master tick ─────────────────────────────────────────────────────────────

const _ticks = new Set();

function onTick(fn)  { _ticks.add(fn); }
function offTick(fn) { _ticks.delete(fn); }

(function loop(now) {
  _ticks.forEach(fn => fn(now));
  requestAnimationFrame(loop);
})(performance.now());
