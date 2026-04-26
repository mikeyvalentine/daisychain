// ── Startup ────────────────────────────────────────────────────────────────

renderInventory(inventory);
renderTools(toolInventory);

// ── Button unlock state ────────────────────────────────────────────────────

function loadUnlocked() {
  const saved = localStorage.getItem('daisychain_unlocked');
  if (!saved) return ['search'];
  try { return JSON.parse(saved); } catch { return ['search']; }
}

function saveUnlocked(list) {
  localStorage.setItem('daisychain_unlocked', JSON.stringify(list));
}

const unlockedButtons = loadUnlocked();

// Derive unlocks from saved inventory so returning players start correctly
(function syncUnlocks() {
  const rules = [
    { condition: () => toolInventory['rusty blade'] > 0,                                                         button: 'forage' },
    { condition: () => toolInventory['collapsible shovel'] > 0,                                                   button: 'dig'    },
    { condition: () => toolInventory['red fox 40 whistle'] > 0 && toolInventory['oxidized copper harp'] > 0,     button: 'call'   },
  ];
  let changed = false;
  rules.forEach(({ condition, button }) => {
    if (condition() && !unlockedButtons.includes(button)) {
      unlockedButtons.push(button);
      changed = true;
    } else if (!condition() && unlockedButtons.includes(button)) {
      unlockedButtons.splice(unlockedButtons.indexOf(button), 1);
      changed = true;
    }
  });
  if (changed) saveUnlocked(unlockedButtons);
})();

// ── Button setup ───────────────────────────────────────────────────────────

const buttonResets = [];

const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
document.body.appendChild(tooltip);

BUTTONS.forEach(({ id, resource, color, shape, innerCorner }) => {
  const canvas = document.getElementById(`${id}-canvas`);
  const ctx    = canvas.getContext('2d');

  const { drawFull, drawReveal } = createBlobRenderer(ctx, color, shape, innerCorner);

  drawFull();

  let onCooldown = false;
  let cancelAnim = null;
  let isHovered  = false;

  const cell = canvas.parentElement;

  function resetCooldown() {
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    onCooldown = false;
    canvas.classList.remove('on-cooldown');
    cell.classList.remove('on-cooldown');
    if (isHovered) tooltip.classList.remove('on-cooldown');
    canvas.style.transform = 'scale(1)';
    drawFull();
  }

  buttonResets.push(resetCooldown);

  canvas.addEventListener('mouseenter', e => {
    isHovered = true;
    tooltip.textContent = id;
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 18) + 'px';
    if (onCooldown) {
      tooltip.style.transition = '';
      tooltip.classList.add('on-cooldown');
    } else {
      // Suppress color transition so it snaps to black immediately
      tooltip.style.transition = 'opacity 0.15s ease';
      tooltip.classList.remove('on-cooldown');
      requestAnimationFrame(() => { tooltip.style.transition = ''; });
    }
    tooltip.classList.add('visible');
  });

  canvas.addEventListener('mousemove', e => {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 18) + 'px';
  });

  canvas.addEventListener('mouseleave', () => {
    isHovered = false;
    tooltip.classList.remove('visible');
  });

  canvas.addEventListener('click', () => {
    if (onCooldown) return;
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    onCooldown = true;
    canvas.classList.add('on-cooldown');
    cell.classList.add('on-cooldown');
    if (isHovered) tooltip.classList.add('on-cooldown');

    let loot = pickLoot(LOOT_TABLES[id]);
    if (loot.type === 'tool' && toolInventory[loot.item] > 0) {
      loot = pickLoot(LOOT_TABLES[id].filter(e => e.type !== 'tool'));
    }
    addLog(buildLogMsg(id, loot));

    if (loot.type === 'resource') {
      inventory[loot.item] = (inventory[loot.item] || 0) + 1;
      saveInventory(inventory);
      renderInventory(inventory);
      animateInvBump(loot.item);
    } else if (loot.type === 'tool') {
      const wasZero = !toolInventory[loot.item];
      toolInventory[loot.item] = (toolInventory[loot.item] || 0) + 1;
      saveTools(toolInventory);
      renderTools(toolInventory);
      checkUnlocks();
      if (wasZero) animateToolFadeIn(loot.item);
      if (wasZero && (loot.item === 'silver plastic discman' || loot.item === 'orange foam portapros')) triggerFlowerEvent();
    }

    cancelAnim = runCooldownAnimation(canvas, drawReveal, drawFull,
      () => {
        onCooldown = false;
        canvas.classList.remove('on-cooldown');
        cell.classList.remove('on-cooldown');
        if (isHovered) tooltip.classList.remove('on-cooldown');
      },
      () => {
        cancelAnim = null;
      }
    );
  });

  if (!unlockedButtons.includes(id)) {
    cell.style.opacity       = '0';
    cell.style.transform     = 'scale(0)';
    cell.style.pointerEvents = 'none';
  }
});

function unlockButton(id) {
  if (unlockedButtons.includes(id)) return;
  unlockedButtons.push(id);
  saveUnlocked(unlockedButtons);

  const canvas = document.getElementById(`${id}-canvas`);
  if (!canvas) return;
  const cell = canvas.parentElement;

  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / COOLDOWN_MS, 1);
    const e = easeOut(t);
    cell.style.opacity       = e.toFixed(3);
    cell.style.transform     = `scale(${e.toFixed(3)})`;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      cell.style.opacity       = '';
      cell.style.transform     = '';
      cell.style.pointerEvents = '';
    }
  })(performance.now());
}

function lockButton(id) {
  const idx = unlockedButtons.indexOf(id);
  if (idx === -1) return;
  unlockedButtons.splice(idx, 1);
  saveUnlocked(unlockedButtons);

  const canvas = document.getElementById(`${id}-canvas`);
  if (!canvas) return;
  const cell = canvas.parentElement;
  cell.style.pointerEvents = 'none';

  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / COOLDOWN_MS, 1);
    const e = easeOut(t);
    cell.style.opacity   = (1 - e).toFixed(3);
    cell.style.transform = `scale(${(1 - e).toFixed(3)})`;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      cell.style.opacity   = '0';
      cell.style.transform = 'scale(0)';
    }
  })(performance.now());
}

// ── Settings ───────────────────────────────────────────────────────────────

(function initFlower() {
  const canvas = document.getElementById('settings-icon');
  const ctx    = canvas.getContext('2d');
  const dpr      = window.devicePixelRatio || 1;
  const CSS_SIZE = 80;
  canvas.width  = CSS_SIZE * dpr;
  canvas.height = CSS_SIZE * dpr;
  canvas.style.width  = CSS_SIZE + 'px';
  canvas.style.height = CSS_SIZE + 'px';
  ctx.scale(dpr, dpr);
  const cx = 40, cy = 40, a = 18;
  const BASE_OFFSET = -Math.PI / 2;

  let outlined      = false;
  let animId        = null;
  let alertTimeout  = null;

  function drawFlowerAt(angle) {
    ctx.clearRect(0, 0, CSS_SIZE, CSS_SIZE);
    ctx.beginPath();
    for (let i = 0; i <= 1000; i++) {
      const t = (i / 1000) * Math.PI * 2;
      const r = 0.3 + 0.8 * Math.pow(Math.cos(2.5 * t), 2);
      const x = cx + a * r * Math.cos(t + BASE_OFFSET + angle);
      const y = cy + a * r * Math.sin(t + BASE_OFFSET + angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (outlined) {
      ctx.save();
      ctx.filter      = 'blur(4px)';
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth   = 8;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle   = outlined ? '#cc0000' : '#000000';
    ctx.strokeStyle = outlined ? '#cc0000' : '#000000';
    ctx.lineWidth   = 3;
    ctx.fill();
    ctx.stroke();
  }

  function runSpin() {
    if (animId) return;
    const start    = performance.now();
    const DURATION = 500;
    const TOTAL    = Math.PI * 2;
    const MAX_BLUR = 2;

    function tick(now) {
      const elapsed = Math.min(now - start, DURATION);
      const t       = elapsed / DURATION;
      const angle   = easeInOut(t) * TOTAL;
      const blur    = Math.sin(Math.PI * t) * MAX_BLUR;

      canvas.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
      drawFlowerAt(angle);

      if (elapsed < DURATION) {
        animId = requestAnimationFrame(tick);
      } else {
        drawFlowerAt(0);
        canvas.style.filter = '';
        animId = null;
        if (outlined) alertTimeout = setTimeout(runSpin, 1000);
      }
    }

    animId = requestAnimationFrame(tick);
  }

  function dismissAlert() {
    outlined = false;
    if (alertTimeout) { clearTimeout(alertTimeout); alertTimeout = null; }
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    canvas.style.filter = '';
    drawFlowerAt(0);
  }

  drawFlowerAt(0);

  canvas.addEventListener('mouseenter', runSpin);
  canvas.addEventListener('click', () => { if (outlined) dismissAlert(); });

  window.triggerFlowerEvent = function() {
    outlined = true;
    if (alertTimeout) { clearTimeout(alertTimeout); alertTimeout = null; }
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    drawFlowerAt(0);
    runSpin();
  };
})();

const settingsIcon   = document.getElementById('settings-icon');
const settingsPanel  = document.getElementById('settings-panel');
const settingsFields = document.getElementById('settings-fields');

function resetInventory() {
  Object.keys(inventory).forEach(k => inventory[k] = 0);
  saveInventory(inventory);
  renderInventory(inventory);
}

function populateSettings() {
  settingsFields.innerHTML = Object.entries(inventory).map(([k, v]) => `
    <div class="modal-row">
      <label style="color:${RESOURCE_COLOR[k]}">${k}</label>
      <input id="st-inp-${k}" type="number" min="0" value="${v}">
    </div>`).join('');
}

settingsIcon.addEventListener('click', () => {
  if (settingsPanel.classList.contains('hidden')) {
    populateSettings();
    settingsPanel.classList.remove('hidden');
  } else {
    settingsPanel.classList.add('hidden');
  }
});

document.addEventListener('click', e => {
  if (!settingsPanel.classList.contains('hidden') &&
      !settingsPanel.contains(e.target) &&
      e.target !== settingsIcon) {
    settingsPanel.classList.add('hidden');
  }
});

document.getElementById('st-zero').addEventListener('click', () => {
  Object.keys(inventory).forEach(k => {
    const el = document.getElementById(`st-inp-${k}`);
    if (el) el.value = 0;
  });
});

document.getElementById('st-apply').addEventListener('click', () => {
  Object.keys(inventory).forEach(k => {
    const el  = document.getElementById(`st-inp-${k}`);
    const val = parseInt(el?.value ?? '0', 10);
    inventory[k] = isNaN(val) ? 0 : Math.max(0, val);
  });
  saveInventory(inventory);
  renderInventory(inventory);
  settingsPanel.classList.add('hidden');
});

document.getElementById('st-reset-timers').addEventListener('click', () => {
  buttonResets.forEach(r => r());
});

document.getElementById('st-reset-all').addEventListener('click', () => {
  resetInventory();
  buttonResets.forEach(r => r());
  settingsPanel.classList.add('hidden');
});

// ── Progression unlocks ────────────────────────────────────────────────────

function checkUnlocks() {
  const rules = [
    { button: 'forage', condition: () => toolInventory['rusty blade'] > 0                                                     },
    { button: 'dig',    condition: () => toolInventory['collapsible shovel'] > 0                                               },
    { button: 'call',   condition: () => toolInventory['red fox 40 whistle'] > 0 && toolInventory['oxidized copper harp'] > 0 },
  ];
  rules.forEach(({ button, condition }) => {
    if (condition()) unlockButton(button);
    else             lockButton(button);
  });
}

// ── Dev console commands ───────────────────────────────────────────────────

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

// ── Panel toggles ──────────────────────────────────────────────────────────

(function initPanelToggles() {
  const panels = {
    'toggle-inv':   { el: document.getElementById('left-panel'), showChar: '‹', hideChar: '›', hidden: false },
    'toggle-log':   { el: document.getElementById('log'),        showChar: '‹', hideChar: '›', hidden: false },
    'toggle-tools': { el: document.getElementById('tools'),      showChar: '›', hideChar: '‹', hidden: false },
  };

  Object.entries(panels).forEach(([btnId, panel]) => {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      panel.el.classList.toggle('panel-hidden', panel.hidden);
      btn.textContent = panel.hidden ? panel.hideChar : panel.showChar;
    });
  });
})();
