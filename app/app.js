// Leonida Legends: a fully offline trophy guide and tracker for the 55 official GTA VI trophies.
// Progress lives in localStorage under "gta6trophies"; the only network request is the local JSON data file.

const STORAGE_KEY = 'gta6trophies';
const HIDDEN_LABEL = 'Hidden trophy - earn to reveal';
const STAGE_TITLES = {
  1: 'Opening acts',
  2: 'Story & partner windows',
  3: 'Strangers & side strands',
  4: 'Map sweeps & collectibles',
  5: 'Skills, races & activities',
  6: 'Wealth, 100% & platinum',
};
const KIND_LABELS = {
  story: 'Story', missable: 'Missable', collectibles: 'Collectibles',
  activities: 'Activities', online: 'Online',
};

const state = {
  trophies: [],
  earned: new Set(),
  filter: 'all',
  query: '',
  hideSpoilers: true,
  selectedId: null,
};

function byId(id) { return document.getElementById(id); }

function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readSavedProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.earned]));
  } catch {
    // Private browsing can block storage; the tracker still works for this session.
  }
}

async function fetchTrophyData() {
  const response = await fetch('./data/trophies.json');
  if (!response.ok) throw new Error(`Could not load trophy data (${response.status})`);
  const data = await response.json();
  return data.trophies;
}

function isSpoilerProtected(trophy) {
  return state.hideSpoilers && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function visibleName(trophy) {
  return isSpoilerProtected(trophy) ? HIDDEN_LABEL : trophy.name;
}

function visibleDescription(trophy) {
  return isSpoilerProtected(trophy) ? HIDDEN_LABEL : trophy.description;
}

function trophyMatchesFilters(trophy) {
  if (state.filter !== 'all' && trophy.kind !== state.filter) return false;
  if (!state.query) return true;
  const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
  return haystack.includes(state.query);
}

function sourceUrlFrom(citation) {
  const match = /https?:\/\/[^\s)]+/.exec(citation);
  return match ? match[0] : null;
}

function renderProgress() {
  const total = state.trophies.length;
  const count = state.earned.size;
  const percent = total ? Math.round((count / total) * 100) : 0;
  byId('earned-count').textContent = `${count} / ${total} earned`;
  byId('progress-percent').textContent = `${percent}% complete`;
  byId('progress-fill').style.width = `${percent}%`;
  const track = byId('progress-track');
  track.setAttribute('aria-valuenow', String(count));
  track.setAttribute('aria-valuemax', String(total));
  track.nextElementSibling.lastElementChild.textContent = `${total - count} to go for platinum`;
}

function renderFilterChips() {
  for (const chip of document.querySelectorAll('#chips .chip')) {
    chip.classList.toggle('is-active', chip.dataset.kind === state.filter);
    chip.setAttribute('aria-pressed', String(chip.dataset.kind === state.filter));
  }
}

function createGradeBadge(grade) {
  return makeElement('span', `grade grade-${grade}`, grade);
}

function createTrophyRow(trophy) {
  const row = makeElement('div', 'trophy-row');
  row.setAttribute('role', 'listitem');
  const isEarned = state.earned.has(trophy.id);
  if (isEarned) row.classList.add('is-earned');
  if (state.selectedId === trophy.id) row.classList.add('is-selected');

  const tick = makeElement('button', 'tick');
  tick.type = 'button';
  tick.setAttribute('aria-pressed', String(isEarned));
  tick.setAttribute('aria-label', `${isEarned ? 'Mark unearned' : 'Mark earned'}: ${visibleName(trophy)}`);
  tick.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"></path></svg>';
  tick.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEarned(trophy.id);
  });
  row.append(tick);

  const body = makeElement('div', 'row-body');
  const title = makeElement('div', 'row-title');
  title.append(makeElement('span', 'row-name', visibleName(trophy)));
  body.append(title);
  body.append(makeElement('div', 'row-sub', visibleDescription(trophy)));
  row.append(body);

  const side = makeElement('div', 'row-side');
  if (trophy.missable) side.append(makeElement('span', 'flag', 'Missable'));
  if (trophy.hidden) side.append(makeElement('span', 'flag hidden-flag', 'Hidden'));
  side.append(createGradeBadge(trophy.grade));
  row.append(side);

  row.addEventListener('click', () => selectTrophy(trophy.id, false));
  return row;
}

function renderChecklist() {
  const container = byId('rows');
  const visible = state.trophies.filter(trophyMatchesFilters);
  container.replaceChildren();
  for (const trophy of visible) container.append(createTrophyRow(trophy));
  byId('list-count').textContent = `${visible.length} shown`;
  if (visible.length === 0) {
    container.append(makeElement('p', 'masked', 'No trophies match this filter. Try another kind or search term.'));
  }
}

function appendDetailTags(parent, trophy) {
  const tags = makeElement('div', 'detail-tags');
  tags.append(makeElement('span', 'tag tag-kind', KIND_LABELS[trophy.kind] ?? trophy.kind));
  if (trophy.missable) tags.append(makeElement('span', 'flag', 'Missable'));
  if (trophy.hidden) tags.append(makeElement('span', 'flag hidden-flag', 'Hidden trophy'));
  parent.append(tags);
}

function appendSource(parent, trophy) {
  const line = makeElement('div', 'source-line');
  line.append(makeElement('span', 'block-label', 'Where this is documented'));
  const url = sourceUrlFrom(trophy.source);
  if (url) {
    const link = makeElement('a', '', trophy.source);
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    line.append(link);
  } else {
    line.append(makeElement('span', '', trophy.source));
  }
  parent.append(line);
}

function appendSteps(parent, trophy) {
  const block = makeElement('div', 'block');
  block.append(makeElement('span', 'block-label', 'Steps'));
  const list = makeElement('ol', 'steps');
  for (const step of trophy.steps) list.append(makeElement('li', '', step));
  block.append(list);
  parent.append(block);
}

function renderDetail() {
  const panel = byId('detail');
  panel.replaceChildren();
  const trophy = state.trophies.find((item) => item.id === state.selectedId);
  if (!trophy) {
    const empty = makeElement('div', 'empty-detail');
    empty.append(makeElement('div', 'glyph', '◇'));
    empty.append(makeElement('h3', '', 'Select a trophy to open its guide'));
    empty.append(makeElement('p', '', 'Official description, original advice, cited sources and a quick step list appear here.'));
    panel.append(empty);
    return;
  }

  const protectedTrophy = isSpoilerProtected(trophy);
  const top = makeElement('div', 'detail-top');
  top.append(makeElement('span', 'detail-id', `Trophy ${String(trophy.id).padStart(2, '0')} / ${state.trophies.length} · stage ${trophy.roadmap}`));
  appendDetailTags(top, trophy);
  panel.append(top);
  panel.append(makeElement('h3', '', visibleName(trophy)));

  const official = makeElement('div', 'official');
  official.append(makeElement('span', 'label', 'Official PlayStation description'));
  official.append(makeElement('p', '', visibleDescription(trophy)));
  panel.append(official);

  if (protectedTrophy) {
    const locked = makeElement('div', 'block');
    locked.append(makeElement('span', 'block-label', 'Guide'));
    locked.append(makeElement('p', 'guide-text masked', 'Turn off the spoiler shield or earn this trophy to reveal its walkthrough.'));
    panel.append(locked);
    return;
  }

  const guideBlock = makeElement('div', 'block');
  guideBlock.append(makeElement('span', 'block-label', 'Guide · in our own words'));
  guideBlock.append(makeElement('p', 'guide-text', trophy.guide));
  panel.append(guideBlock);

  appendSource(panel, trophy);
  panel.append(makeElement('div', '', ''));
  appendSteps(panel, trophy);

  if (trophy.missable) {
    const note = makeElement('div', 'miss-note');
    note.append(makeElement('strong', '', 'Missable: '));
    note.append(document.createTextNode(trophy.missableReason ?? trophy.guide));
    panel.append(note);
  }

  const foot = makeElement('div', 'detail-foot');
  const earned = state.earned.has(trophy.id);
  const button = makeElement('button', `earn-btn${earned ? ' earned' : ''}`, earned ? '✓ Earned - click to undo' : 'Mark as earned');
  button.type = 'button';
  button.addEventListener('click', () => toggleEarned(trophy.id));
  foot.append(button);
  foot.append(makeElement('span', 'detail-id', `Roadmap stage ${trophy.roadmap} · ${STAGE_TITLES[trophy.roadmap]}`));
  panel.append(foot);
}

function createStageCard(stage) {
  const trophies = state.trophies.filter((trophy) => trophy.roadmap === stage);
  const card = makeElement('article', 'stage-card');
  const head = makeElement('div', 'stage-head');
  head.append(makeElement('span', 'stage-num', String(stage)));
  const heading = makeElement('div', '');
  heading.append(makeElement('h3', '', STAGE_TITLES[stage]));
  heading.append(makeElement('div', 'stage-sub', `${trophies.length} trophies`));
  head.append(heading);
  card.append(head);

  const names = makeElement('div', 'stage-names');
  for (const trophy of trophies) {
    const earned = state.earned.has(trophy.id);
    const pill = makeElement('button', `stage-name${earned ? ' done' : ''}`, visibleName(trophy));
    pill.type = 'button';
    pill.title = `Open ${visibleName(trophy)}`;
    pill.addEventListener('click', () => {
      selectTrophy(trophy.id, true);
    });
    names.append(pill);
  }
  card.append(names);
  return card;
}

function renderRoadmap() {
  const container = byId('roadmap');
  container.replaceChildren();
  for (let stage = 1; stage <= 6; stage += 1) container.append(createStageCard(stage));
}

function createMissableCard(trophy) {
  const card = makeElement('article', `miss-card${state.earned.has(trophy.id) ? ' earned' : ''}`);
  const title = makeElement('h3', '', `${trophy.name} · ${trophy.grade}`);
  const reason = makeElement('p', '', trophy.missableReason ?? trophy.guide);
  card.append(title, reason);
  card.addEventListener('click', () => selectTrophy(trophy.id, true));
  return card;
}

function renderMissables() {
  const container = byId('missables');
  const flagged = state.trophies.filter((trophy) => trophy.missable);
  container.replaceChildren();
  for (const trophy of flagged) container.append(createMissableCard(trophy));
  byId('missable-count').textContent = `${flagged.length} flagged`;
}

function renderEverything() {
  renderProgress();
  renderFilterChips();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function selectTrophy(id, scrollToTop) {
  state.selectedId = id;
  renderChecklist();
  renderDetail();
  if (scrollToTop) window.scrollTo(0, 0);
}

function scrollChecklistToSelection() {
  const container = byId('rows');
  const selected = container.querySelector('.trophy-row.is-selected');
  if (selected) container.scrollTop = Math.max(0, selected.offsetTop - container.offsetTop - 90);
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveProgress();
  renderEverything();
}

function exportProgress() {
  const payload = { app: 'Leonida Legends', version: 1, ids: [...state.earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = makeElement('a', '');
  link.href = url;
  link.download = 'leonida-legends-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeImportedIds(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.ids)) return value.ids;
  if (value && Array.isArray(value.earned)) return value.earned;
  return null;
}

async function importProgress(file) {
  const raw = JSON.parse(await file.text());
  const ids = normalizeImportedIds(raw);
  if (!ids) throw new Error('Unrecognised progress file');
  const valid = new Set(state.trophies.map((trophy) => trophy.id));
  state.earned = new Set(ids.map(Number).filter((id) => valid.has(id)));
  saveProgress();
  renderEverything();
}

function resetProgress() {
  if (!window.confirm('Reset all trophy progress on this device? This cannot be undone.')) return;
  state.earned.clear();
  saveProgress();
  renderEverything();
}

function applyShotPreset() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return false;
  document.documentElement.dataset.shot = shot;
  state.hideSpoilers = true;
  state.filter = 'all';
  state.selectedId = null;
  state.earned = new Set();

  if (shot === 'cover') {
    state.earned = new Set([2, 3, 4, 5, 6, 8, 9, 10, 15, 16, 17, 28, 30, 35]);
    state.selectedId = 17;
  } else if (shot === 'guide') {
    state.earned = new Set([2, 3, 4, 5, 6, 8]);
    state.filter = 'story';
    state.hideSpoilers = false;
    state.selectedId = 9;
  } else if (shot === 'roadmap') {
    state.earned = new Set([2, 3, 4, 5, 6, 8, 9, 22, 28]);
  } else if (shot === 'filters') {
    state.earned = new Set([2, 3, 4, 5, 6]);
    state.filter = 'story';
  }
  return true;
}

function syncControlsFromState() {
  byId('search').value = state.query;
  byId('spoilers').checked = state.hideSpoilers;
  renderFilterChips();
}

function wireEvents() {
  byId('search').addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderChecklist();
  });
  byId('chips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.kind;
    renderFilterChips();
    renderChecklist();
  });
  byId('spoilers').addEventListener('change', (event) => {
    state.hideSpoilers = event.target.checked;
    renderChecklist();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });
  byId('export').addEventListener('click', exportProgress);
  byId('import').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      window.alert('That file is not a Leonida Legends progress export.');
    }
    event.target.value = '';
  });
  byId('reset').addEventListener('click', resetProgress);
}

async function bootstrap() {
  state.trophies = await fetchTrophyData();
  const presetApplied = applyShotPreset();
  if (!presetApplied) state.earned = readSavedProgress();
  syncControlsFromState();
  wireEvents();
  renderEverything();
  const shotName = new URLSearchParams(window.location.search).get('shot');
  if (shotName === 'cover' || shotName === 'guide') scrollChecklistToSelection();
  if (shotName === 'roadmap') {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, byId('roadmap-section').offsetTop - 8);
  }
}

bootstrap().catch((error) => {
  byId('rows').textContent = `Unable to start the tracker: ${error.message}`;
});
