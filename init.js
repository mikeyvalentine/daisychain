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
    { condition: () => toolInventory['bruk forest axe'] > 0,                                               button: 'chop'   },
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

let cancelTooltipReveal = null;

BUTTONS.forEach(({ id, cooldownMult, color, shape, innerCorner }) => {
  const canvas     = document.getElementById(`${id}-canvas`);
  const ctx        = canvas.getContext('2d');
  const cooldownMs = COOLDOWN_MS * cooldownMult;

  const { drawFull, drawReveal } = createBlobRenderer(ctx, color, shape, innerCorner);

  drawFull();

  let onCooldown  = false;
  let cancelAnim  = null;
  let isHovered   = false;
  let animStart   = null;
  let animText    = null;

  const cell = canvas.parentElement;

  function showReveal() {
    if (!animStart || !animText) return;
    if (cancelTooltipReveal) { cancelTooltipReveal(); cancelTooltipReveal = null; }
    const display = animText;
    const chars = display.split('');
    const charFadeDuration = 150;
    const totalStagger = Math.max(0, cooldownMs - charFadeDuration);
    tooltip.innerHTML = chars.map(c => `<span style="opacity:0;transition:none">${c}</span>`).join('');
    const spans = Array.from(tooltip.querySelectorAll('span'));
    function tickFn(now) {
      const elapsed = now - animStart;
      spans.forEach((span, i) => {
        const staggerStart = (i / chars.length) * totalStagger;
        const t = Math.max(0, Math.min((elapsed - staggerStart) / charFadeDuration, 1));
        span.style.opacity = t.toFixed(3);
      });
      if (elapsed >= totalStagger + charFadeDuration) {
        offTick(tickFn);
        tooltip.textContent = display;
        cancelTooltipReveal = null;
        animStart = null;
      }
    }
    cancelTooltipReveal = () => { offTick(tickFn); cancelTooltipReveal = null; };
    onTick(tickFn);
  }

  function resetCooldown() {
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    onCooldown = false;
    animStart = null;
    animText  = null;
    canvas.classList.remove('on-cooldown');
    cell.classList.remove('on-cooldown');
    if (isHovered) tooltip.classList.remove('on-cooldown');
    canvas.style.transform = 'scale(1)';
    drawFull();
  }

  buttonResets.push(resetCooldown);

  canvas.addEventListener('mouseenter', e => {
    isHovered = true;
    if (cancelTooltipReveal) { cancelTooltipReveal(); cancelTooltipReveal = null; }
    const display = id.charAt(0).toUpperCase() + id.slice(1);
    tooltip.textContent = display;
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 18) + 'px';
    if (onCooldown) {
      tooltip.style.transition = '';
      tooltip.classList.add('on-cooldown');
      showReveal();
    } else {
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
    if (cancelTooltipReveal) { cancelTooltipReveal(); cancelTooltipReveal = null; }
    tooltip.classList.remove('visible');
  });

  canvas.addEventListener('click', () => {
    if (onCooldown) return;
    if (cancelAnim) { cancelAnim(); cancelAnim = null; }
    onCooldown = true;
    animStart = performance.now();
    animText  = id.charAt(0).toUpperCase() + id.slice(1);
    canvas.classList.add('on-cooldown');
    cell.classList.add('on-cooldown');
    if (isHovered) {
      tooltip.classList.add('on-cooldown');
      showReveal();
    }

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
        animStart = null;
        animText  = null;
        canvas.classList.remove('on-cooldown');
        cell.classList.remove('on-cooldown');
        if (isHovered) {
          tooltip.classList.remove('on-cooldown');
          if (cancelTooltipReveal) { cancelTooltipReveal(); cancelTooltipReveal = null; }
          tooltip.textContent = id.charAt(0).toUpperCase() + id.slice(1);
        }
      },
      () => {
        cancelAnim = null;
      },
      cooldownMs
    );
  });

  if (!unlockedButtons.includes(id)) {
    cell.style.display = 'none';
  }
});

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
  let spinning      = false;
  let spinTick      = null;
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
    if (spinning) return;
    spinning = true;
    const start    = performance.now();
    const DURATION = 500;
    const TOTAL    = Math.PI * 2;
    const MAX_BLUR = 2;

    spinTick = function(now) {
      const elapsed = Math.min(now - start, DURATION);
      const t       = elapsed / DURATION;
      const angle   = easeInOut(t) * TOTAL;
      const blur    = Math.sin(Math.PI * t) * MAX_BLUR;

      canvas.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
      drawFlowerAt(angle);

      if (elapsed >= DURATION) {
        offTick(spinTick);
        spinning = false;
        spinTick = null;
        drawFlowerAt(0);
        canvas.style.filter = '';
        if (outlined) alertTimeout = setTimeout(runSpin, 1000);
      }
    };

    onTick(spinTick);
  }

  function dismissAlert() {
    outlined = false;
    if (alertTimeout) { clearTimeout(alertTimeout); alertTimeout = null; }
    if (spinning && spinTick) { offTick(spinTick); spinTick = null; spinning = false; }
    canvas.style.filter = '';
    drawFlowerAt(0);
  }

  drawFlowerAt(0);

  canvas.addEventListener('mouseenter', runSpin);
  canvas.addEventListener('click', () => { if (outlined) dismissAlert(); });

  window.triggerFlowerEvent = function() {
    outlined = true;
    if (alertTimeout) { clearTimeout(alertTimeout); alertTimeout = null; }
    if (spinning && spinTick) { offTick(spinTick); spinTick = null; spinning = false; }
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

document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.tab === 'sound' && !soundTabSeen) {
      soundTabSeen = true;
      localStorage.setItem('daisychain_sound_seen', 'true');
      tab.classList.remove('tab-new');
    }
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
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

// ── Sound tab visibility ───────────────────────────────────────────────────

let soundTabSeen = localStorage.getItem('daisychain_sound_seen') === 'true';

function updateSoundTab() {
  const tab = document.querySelector('.settings-tab[data-tab="sound"]');
  const hasDiscman = toolInventory['silver plastic discman'] >= 1;
  tab.style.display = hasDiscman ? '' : 'none';
  tab.classList.toggle('tab-new', hasDiscman && !soundTabSeen);
  if (!hasDiscman && tab.classList.contains('active')) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.settings-tab[data-tab="settings"]').classList.add('active');
    document.getElementById('tab-settings').classList.add('active');
  }
}

updateSoundTab();

// ── Panel toggles ──────────────────────────────────────────────────────────

[
  document.getElementById('left-panel'),
  document.getElementById('tools'),
].forEach(el => {
  el.addEventListener('click', () => el.classList.toggle('panel-hidden'));
});
