// ── Tools ──────────────────────────────────────────────────────────────────

const TOOLS = [
  'rusty blade',
  'collapsible shovel',
  'red fox 40 whistle',
  'bruk small forest axe',
  'shoddy mallet',
  'oxidized copper harp',
  'magnifying glass',
  'leather dreamcatcher',
  'silver plastic discman',
  'orange foam portapros',
];

const TOOL_COLOR = {
  'rusty blade':            '#421e08',
  'collapsible shovel':     '#211f1f',
  'red fox 40 whistle':     '#cc2222',
  'bruk small forest axe':  '#402804',
  'shoddy mallet':          '#444444',
  'oxidized copper harp':   '#5fc1a8',
  'magnifying glass':       '#222a2b',
  'leather dreamcatcher':   '#6b3721',
  'silver plastic discman': '#aaaaaa',
  'orange foam portapros':  '#fa7d2a',
};

function loadTools() {
  const defaults = Object.fromEntries(TOOLS.map(t => [t, 0]));
  const saved = localStorage.getItem('daisychain_tools');
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveTools(tools) {
  localStorage.setItem('daisychain_tools', JSON.stringify(tools));
}

function renderTools(tools) {
  document.getElementById('tools-list').innerHTML = Object.entries(tools)
    .filter(([, v]) => v > 0)
    .map(([k]) => `<div class="tool-row" data-tool="${k}"><span class="tool-name" style="color:${TOOL_COLOR[k] ?? 'inherit'}">${k}</span></div>`)
    .join('');
}

const toolInventory = loadTools();
