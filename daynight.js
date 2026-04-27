// ── Day / night cycle ──────────────────────────────────────────────────────

const DAY_MS   = 15000;
const CYCLE_MS = 30000;

function isDay() {
  return (Date.now() % CYCLE_MS) < DAY_MS;
}

(function runDayNight() {
  const sky    = document.getElementById('sky');
  const garden = document.getElementById('garden');
  let prevDay  = isDay();

  const NIGHT_MS         = CYCLE_MS - DAY_MS;
  const DAY_FADE_START   = DAY_MS   * 0.9;
  const NIGHT_FADE_START = DAY_MS + NIGHT_MS * 0.9;

  function skyBrightness(t) {
    if (t < DAY_FADE_START) return 1.0;
    if (t < DAY_MS) return 1.0 - 0.5 * easeInOut((t - DAY_FADE_START) / (DAY_MS - DAY_FADE_START));
    if (t < NIGHT_FADE_START) return 0.5;
    return 0.5 + 0.5 * easeInOut((t - NIGHT_FADE_START) / (CYCLE_MS - NIGHT_FADE_START));
  }

  onTick(function tick() {
    const t          = Date.now() % CYCLE_MS;
    const brightness = skyBrightness(t);
    sky.style.filter = `brightness(${brightness.toFixed(3)})`;
    garden.style.filter = `brightness(${brightness.toFixed(3)})`;

    const day = isDay();
    if (day !== prevDay) {
      addLog(day ? 'good morning' : 'good night');
      prevDay = day;
    }
  });
})();
