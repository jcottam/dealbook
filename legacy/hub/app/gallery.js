import { store } from './store.js';
import { matchPost } from './search.js';
import { FORMAT_LABEL, esc, fmtDate, parseDate, stageClass } from './util.js';

const KEY = 'dbhub.gallery';
const DEFAULTS = { speaker: '', category: '', format: '', status: '', attention: false, group: 'month', sort: 'date' };
let filters = { ...DEFAULTS, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') };
let scrollY = 0;

const save = () => sessionStorage.setItem(KEY, JSON.stringify(filters));
const uniq = (xs) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const statusOf = (p) => p.stage || 'Not set';
// The sheet spells some categories inconsistently ("25 Years of Dealbook" / "DealBook"), so filter on a folded key.
const fold = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function categoryOptions() {
  const byKey = new Map();
  for (const p of store.posts) if (p.storyline && !byKey.has(fold(p.storyline))) byKey.set(fold(p.storyline), p.storyline);
  return [...byKey.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function weekStart(d) {
  const s = new Date(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

function groupKey(p) {
  const d = parseDate(p.date);
  if (filters.group === 'none') return { key: 'all', label: '' };
  if (!d) return { key: '9999', label: 'Unscheduled' };
  if (filters.group === 'week') {
    const w = weekStart(d);
    return { key: w.toISOString().slice(0, 10), label: `Week of ${w.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` };
  }
  return { key: p.date.slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
}

function filtered(q) {
  const list = store.posts.filter((p) => {
    if (!matchPost(p, q)) return false;
    if (filters.speaker && !p.speakers.includes(filters.speaker)) return false;
    if (filters.category && fold(p.storyline) !== filters.category) return false;
    if (filters.format && p.formatKind !== filters.format) return false;
    if (filters.status && statusOf(p) !== filters.status) return false;
    if (filters.attention && !(p.counts.missing || p.counts.outstanding)) return false;
    return true;
  });
  const byRow = (a, b) => a.row - b.row;
  const byDate = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || byRow(a, b);
  return list.sort(filters.sort === 'row' ? byRow : filters.sort === 'date-desc' ? (a, b) => -byDate(a, b) : byDate);
}

function select(name, label, options) {
  return `<label class="filter"><span>${label}</span><select name="${name}">
    <option value="">All</option>
    ${options.map(([v, l]) => `<option value="${esc(v)}"${filters[name] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}
  </select></label>`;
}

function card(p) {
  const media = p.thumb
    ? `<img src="${p.thumb}" alt="" loading="lazy" data-fallback="${esc(FORMAT_LABEL[p.formatKind])}">`
    : `<div class="card-empty"><span>${esc(p.speakers[0] || FORMAT_LABEL[p.formatKind])}</span><small>No local media yet</small></div>`;
  const issues = [];
  if (p.counts.missing) issues.push(`<span class="badge badge-missing">${p.counts.missing} missing</span>`);
  if (p.counts.outstanding) issues.push(`<span class="badge badge-todo">${p.counts.outstanding} to do</span>`);
  return `
    <a class="card" href="#/post/${esc(p.id)}">
      <div class="card-media">
        ${media}
        <span class="badge badge-format">${esc(FORMAT_LABEL[p.formatKind])}</span>
        ${p.hasVideo ? '<span class="play" title="Has video clip"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' : ''}
        ${issues.length ? `<div class="card-issues">${issues.join('')}</div>` : ''}
      </div>
      <div class="card-body">
        <p class="eyebrow">${esc(fmtDate(p.date))}${p.postNumber ? ` · Post ${esc(p.postNumber)}` : ''}</p>
        <h3 class="card-title">${esc(p.title)}</h3>
        <p class="card-speakers">${esc(p.speakers.join(', ') || '—')}</p>
        <div class="card-meta">
          ${p.storyline ? `<span class="chip">${esc(p.storyline)}</span>` : ''}
          <span class="stage ${stageClass(p.stage)}">${esc(statusOf(p))}</span>
        </div>
      </div>
    </a>`;
}

function renderGrid(el, q) {
  const list = filtered(q);
  const groups = new Map();
  for (const p of list) {
    const g = groupKey(p);
    if (!groups.has(g.key)) groups.set(g.key, { label: g.label, posts: [] });
    groups.get(g.key).posts.push(p);
  }
  const keys = [...groups.keys()];
  if (filters.sort !== 'row') keys.sort((a, b) => (filters.sort === 'date-desc' ? -1 : 1) * a.localeCompare(b));

  const attention = store.posts.filter((p) => p.counts.missing || p.counts.outstanding).length;
  el.querySelector('.result-count').textContent = `${list.length} of ${store.posts.length} posts`;
  el.querySelector('[data-attention-count]').textContent = attention;
  el.querySelector('.groups').innerHTML = list.length
    ? keys
        .map((k) => {
          const g = groups.get(k);
          return `<section class="group">
            ${g.label ? `<h2 class="group-title">${esc(g.label)} <span class="muted">${g.posts.length}</span></h2>` : ''}
            <div class="grid">${g.posts.map(card).join('')}</div>
          </section>`;
        })
        .join('')
    : `<div class="empty">No posts match${q ? ` “${esc(q)}”` : ''}. <button class="link" data-reset>Clear filters</button></div>`;
}

export function renderGallery(host, { q }) {
  const el = document.createElement('div');
  host.replaceChildren(el);
  const speakers = uniq(store.posts.flatMap((p) => p.speakers));
  const formats = uniq(store.posts.map((p) => p.formatKind)).map((f) => [f, FORMAT_LABEL[f] || f]);
  const statuses = uniq(store.posts.map(statusOf));

  el.innerHTML = `
    <div class="page">
      <form class="filters" autocomplete="off">
        ${select('speaker', 'Speaker', speakers.map((s) => [s, s]))}
        ${select('category', 'Category', categoryOptions())}
        ${select('format', 'Format', formats)}
        ${select('status', 'Status', statuses.map((s) => [s, s]))}
        <label class="filter"><span>Group</span><select name="group">
          ${[['month', 'By month'], ['week', 'By week'], ['none', 'No grouping']].map(([v, l]) => `<option value="${v}"${filters.group === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="filter"><span>Sort</span><select name="sort">
          ${[['date', 'Date, soonest first'], ['date-desc', 'Date, latest first'], ['row', 'Calendar order']].map(([v, l]) => `<option value="${v}"${filters.sort === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="toggle"><input type="checkbox" name="attention"${filters.attention ? ' checked' : ''}><span>Needs attention (<span data-attention-count></span>)</span></label>
        <button type="button" class="link" data-reset>Reset</button>
      </form>
      <p class="result-count muted"></p>
      <div class="groups"></div>
    </div>`;

  const form = el.querySelector('.filters');
  form.addEventListener('input', (e) => {
    const t = e.target;
    filters[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    save();
    renderGrid(el, q);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) {
      filters = { ...DEFAULTS };
      save();
      renderGallery(host, { q });
    } else if (e.target.closest('.card')) {
      scrollY = window.scrollY;
    }
  });

  renderGrid(el, q);
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

/** Re-render just the results when the header search changes. */
export function updateGallerySearch(el, q) {
  if (el.querySelector('.groups')) renderGrid(el, q);
}
