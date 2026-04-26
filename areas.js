// ── Button definitions ─────────────────────────────────────────────────────

const BUTTONS = [
  { id: 'forage', resource: 'icthymus', color: '#90d020', shape: 'forage', innerCorner: { x: CW, y: CH } },
  { id: 'search', resource: 'seefle',   color: '#8888a0', shape: 'search', innerCorner: { x: 0,  y: CH } },
  { id: 'dig',    resource: 'grupules', color: '#5a2818', shape: 'dig',    innerCorner: { x: CW, y: 0  } },
  { id: 'call',   resource: 'voice',    color: '#7022cc', shape: 'call',   innerCorner: { x: 0,  y: 0  } },
];

// ── Loot tables ────────────────────────────────────────────────────────────

const foragables = [
  { item: 'icthymus leaf',  weight: 20, color: '#90d020', type: 'resource' },
  { item: 'onjiberry',  weight: 20, color: '#e30c37', type: 'resource' },
  { item: 'shute fibres',  weight: 20, color: '#c19055', type: 'resource' },
  { item: 'perltree branch',  weight: 20, color: '#3d350e', type: 'resource' },
];

const searchables = [
  { item: null,          weight: 60, color: null,      type: 'nothing'  },
  { item: 'scrap',       weight: 20, color: '#aaaaaa', type: 'resource' },
  { item: 'rusty blade', weight: 10, color: null,      type: 'tool'     },
  { item: 'collapsible shovel', weight: 10, color: null,      type: 'tool'     },


];

const digables = [
  { item: 'grupules',  weight: 20, color: '#5a2818', type: 'resource' },
  { item: 'rocks',  weight: 40, color: '#1a1615', type: 'resource' },
  { item: null,        weight: 40, color: null,      type: 'nothing'  },
];

const callouts = [
  { item: null,    weight: 40, color: null,      type: 'nothing'  },
  { item: 'voice', weight: 10, color: '#7022cc', type: 'resource', hidden: true },
];

const LOOT_TABLES = {
  forage: foragables,
  search: searchables,
  dig:    digables,
  call:   callouts,
};

function pickLoot(table) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}

const ALL_LOOT = [...foragables, ...searchables, ...digables, ...callouts];
const RESOURCE_COLOR = Object.fromEntries(
  ALL_LOOT.filter(e => e.type === 'resource').map(e => [e.item, e.color])
);
const HIDDEN_RESOURCES = new Set(
  ALL_LOOT.filter(e => e.type === 'resource' && e.hidden).map(e => e.item)
);
