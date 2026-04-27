// ── Event log ──────────────────────────────────────────────────────────────

const LOG_MAX        = 5;
const LOG_FADE_START = 8000;
const LOG_EXPIRE     = 10000;
const gameLog = [];

let _logTickActive = false;
let _logTimeoutId  = null;

function addLog(msg) {
  gameLog.push({ msg, time: performance.now() });
  if (gameLog.length > LOG_MAX) gameLog.shift();
  renderLog();
  _scheduleLogFade();
}

function _scheduleLogFade() {
  if (_logTickActive) return;
  if (_logTimeoutId) return;
  const oldest = gameLog[0];
  if (!oldest) return;
  const delay = Math.max(0, LOG_FADE_START - (performance.now() - oldest.time));
  _logTimeoutId = setTimeout(() => {
    _logTimeoutId = null;
    _startLogTick();
  }, delay);
}

function _startLogTick() {
  if (_logTickActive) return;
  _logTickActive = true;
  function tickFn(now) {
    renderLog();
    if (!gameLog.some(e => now - e.time < LOG_EXPIRE)) {
      offTick(tickFn);
      _logTickActive = false;
    }
  }
  onTick(tickFn);
}

function renderLog() {
  const now = performance.now();
  while (gameLog.length && now - gameLog[0].time >= LOG_EXPIRE) gameLog.shift();

  const len = gameLog.length;
  document.getElementById('log').innerHTML = gameLog.map((entry, i) => {
    const age         = len - 1 - i;
    const posOpacity  = 1 - (age / LOG_MAX) * 0.85;
    const elapsed     = now - entry.time;
    const timeOpacity = elapsed < LOG_FADE_START ? 1
      : 1 - (elapsed - LOG_FADE_START) / (LOG_EXPIRE - LOG_FADE_START);
    const opacity = (posOpacity * timeOpacity).toFixed(2);
    return `<span class="log-line" style="opacity:${opacity}">${entry.msg}</span>`;
  }).join('');
}

// ── Log message formatting ─────────────────────────────────────────────────

function coloredItem(loot) {
  const color = loot.color ?? TOOL_COLOR[loot.item] ?? null;
  const style = [
    color ? `color:${color}` : '',
    loot.type === 'tool' ? 'text-decoration:underline' : '',
  ].filter(Boolean).join(';');
  return style ? `<span style="${style}">${loot.item}</span>` : loot.item;
}

function buildLogMsg(buttonId, loot) {
  if (buttonId === 'search') {
    return loot.type === 'nothing' ? 'you found nothing' : `you found ${coloredItem(loot)}`;
  }
  if (buttonId === 'forage') {
    return loot.type === 'nothing' ? 'nothing here' : `you foraged ${coloredItem(loot)}`;
  }
  if (buttonId === 'dig') {
    return loot.type === 'nothing' ? 'ground was too hard' : `you dug up ${coloredItem(loot)}`;
  }
  if (buttonId === 'call') {
    return loot.type === 'nothing' ? 'no response' : `you heard ${coloredItem(loot)}`;
  }
  return loot.type === 'nothing' ? 'nothing' : `you obtained ${coloredItem(loot)}`;
}
