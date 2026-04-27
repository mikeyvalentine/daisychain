// ── Constants ──────────────────────────────────────────────────────────────

const COOLDOWN_MS = 1500;
const SHRINK_MS   = 60;
const CW = 144, CH = 128;
const BLUR = 4;

// ── Button lock / unlock ────────────────────────────────────────────────────

function unlockButton(id) {
  if (unlockedButtons.includes(id)) return;
  unlockedButtons.push(id);
  saveUnlocked(unlockedButtons);

  const canvas = document.getElementById(`${id}-canvas`);
  if (!canvas) return;
  const cell = canvas.parentElement;

  cell.style.display   = '';
  cell.style.opacity   = '0';
  cell.style.transform = 'scale(0)';

  const startUnlock = performance.now();
  function unlockTick(now) {
    const t = Math.min((now - startUnlock) / COOLDOWN_MS, 1);
    const e = easeOut(t);
    cell.style.opacity   = e.toFixed(3);
    cell.style.transform = `scale(${e.toFixed(3)})`;
    if (t >= 1) {
      offTick(unlockTick);
      cell.style.opacity   = '';
      cell.style.transform = '';
    }
  }
  onTick(unlockTick);
}

function lockButton(id) {
  const idx = unlockedButtons.indexOf(id);
  if (idx === -1) return;
  unlockedButtons.splice(idx, 1);
  saveUnlocked(unlockedButtons);

  const canvas = document.getElementById(`${id}-canvas`);
  if (!canvas) return;
  const cell = canvas.parentElement;

  const startLock = performance.now();
  function lockTick(now) {
    const t = Math.min((now - startLock) / COOLDOWN_MS, 1);
    const e = easeOut(t);
    cell.style.opacity   = (1 - e).toFixed(3);
    cell.style.transform = `scale(${(1 - e).toFixed(3)})`;
    if (t >= 1) {
      offTick(lockTick);
      cell.style.opacity   = '';
      cell.style.transform = '';
      cell.style.display   = 'none';
    }
  }
  onTick(lockTick);
}

// ── Progression unlocks ─────────────────────────────────────────────────────

function checkUnlocks() {
  const rules = [
    { button: 'forage', condition: () => toolInventory['rusty blade'] > 0                                                     },
    { button: 'dig',    condition: () => toolInventory['collapsible shovel'] > 0                                               },
    { button: 'call',   condition: () => toolInventory['red fox 40 whistle'] > 0 && toolInventory['oxidized copper harp'] > 0 },
    { button: 'chop',   condition: () => toolInventory['bruk forest axe'] > 0                                                 },
  ];
  rules.forEach(({ button, condition }) => {
    if (condition()) unlockButton(button);
    else             lockButton(button);
  });
  updateSoundTab();
}

// ── Dev console commands ────────────────────────────────────────────────────

window.give = function(tool) {
  if (tool === 'all') {
    TOOLS.forEach(t => { toolInventory[t] = 1; });
    saveTools(toolInventory); renderTools(toolInventory); checkUnlocks();
    console.log('gave: all tools');
    return;
  }
  if (!TOOLS.includes(tool)) { console.warn(`unknown tool: "${tool}"\nvalid: ${TOOLS.join(', ')}`); return; }
  const wasZero = !toolInventory[tool];
  toolInventory[tool] = 1;
  saveTools(toolInventory); renderTools(toolInventory); checkUnlocks();
  if (wasZero && (tool === 'silver plastic discman' || tool === 'orange foam portapros')) triggerFlowerEvent();
  console.log(`gave: ${tool}`);
};

window.remove = function(tool) {
  if (tool === 'all') {
    TOOLS.forEach(t => { toolInventory[t] = 0; });
    saveTools(toolInventory); renderTools(toolInventory); checkUnlocks();
    console.log('removed: all tools');
    return;
  }
  if (!TOOLS.includes(tool)) { console.warn(`unknown tool: "${tool}"\nvalid: ${TOOLS.join(', ')}`); return; }
  toolInventory[tool] = Math.max(0, (toolInventory[tool] || 0) - 1);
  saveTools(toolInventory); renderTools(toolInventory); checkUnlocks();
  console.log(`removed: ${tool} (now ${toolInventory[tool]})`);
};

window.reset = function() {
  localStorage.clear();
  location.reload();
};
