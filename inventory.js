// ── Inventory ──────────────────────────────────────────────────────────────

function loadInventory() {
  const defaults = Object.fromEntries(ALL_LOOT.filter(e => e.type === 'resource').map(e => [e.item, 0]));
  const saved = localStorage.getItem('daisychain_inv');
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveInventory(inv) {
  localStorage.setItem('daisychain_inv', JSON.stringify(inv));
}

function renderInventory(inv) {
  const list = document.getElementById('inv-list');

  Object.entries(inv)
    .filter(([k]) => !HIDDEN_RESOURCES.has(k))
    .forEach(([k, v]) => {
      let row = list.querySelector(`.inv-row[data-inv-key="${k}"]`);
      if (!row) {
        row = document.createElement('div');
        row.className = 'inv-row inv-zero';
        row.dataset.invKey = k;
        row.innerHTML = `<span class="inv-key" style="color:${RESOURCE_COLOR[k]}">${k}</span><span class="inv-val" data-key="${k}" style="color:${RESOURCE_COLOR[k]}">0</span>`;
        list.appendChild(row);
      }
      row.querySelector('.inv-val').textContent = v;
      row.classList.toggle('inv-zero', v === 0);
    });
}

const inventory = loadInventory();
