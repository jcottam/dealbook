import { store } from './store.js';
import { matchAsset } from './search.js';
import { assetActions, bindCommonActions, esc, fmtBytes, openLightbox, thumbImg } from './util.js';

const KEY = 'dbhub.assets';
const DEFAULTS = { type: '', speaker: '', year: '', linked: '', role: '' };
let filters = { ...DEFAULTS, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') };
let visible = [];

const uniq = (xs) => [...new Set(xs.filter((x) => x != null && x !== ''))].sort((a, b) => String(a).localeCompare(String(b)));

function select(name, label, options) {
  return `<label class="filter"><span>${label}</span><select name="${name}">
    <option value="">All</option>
    ${options.map(([v, l]) => `<option value="${esc(v)}"${String(filters[name]) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}
  </select></label>`;
}

function tile(a, i) {
  const posts = a.posts.length
    ? a.posts.map((p) => `<a class="chip" href="#/post/${esc(p.id)}" title="${esc(p.title)}">${esc(p.title.length > 38 ? p.title.slice(0, 36) + '...' : p.title)}</a>`).join('')
    : '<span class="chip chip-muted">Unlinked</span>';
  return `<li class="lib-item">
    <button class="lib-thumb" data-open="${i}" aria-label="Preview ${esc(a.filename)}">
      ${thumbImg(a)}
      <span class="badge badge-format">${a.type === 'video' ? 'Video' : 'Image'}</span>
      ${a.role === 'finished' ? '<span class="badge badge-finished">Finished</span>' : ''}
      ${a.type === 'video' ? '<span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' : ''}
    </button>
    <div class="lib-body">
      <strong class="mono lib-name" title="${esc(a.filename)}">${esc(a.filename)}</strong>
      <span class="muted small">${[a.speaker, a.year, fmtBytes(a.size)].filter(Boolean).map(esc).join(' · ')}</span>
      ${a.clip ? `<span class="small mono">${esc(a.clip.start)} – ${esc(a.clip.end)}${a.clip.proxy ? ' · proxy' : ''}</span>` : ''}
      <span class="small mono path" title="${esc(a.path)}">${esc(a.path)}</span>
      <div class="chips">${posts}</div>
      <div class="btn-row">${assetActions(a)}</div>
    </div>
  </li>`;
}

function renderList(el, q) {
  visible = store.assets.filter((a) => {
    if (!matchAsset(a, q)) return false;
    if (filters.type && a.type !== filters.type) return false;
    if (filters.speaker && a.speaker !== filters.speaker) return false;
    if (filters.year && String(a.year) !== String(filters.year)) return false;
    if (filters.role && a.role !== filters.role) return false;
    if (filters.linked === 'linked' && !a.posts.length) return false;
    if (filters.linked === 'unlinked' && a.posts.length) return false;
    return true;
  });
  el.querySelector('.result-count').textContent = `${visible.length} of ${store.assets.length} files`;
  el.querySelector('.library').innerHTML = visible.length
    ? visible.map(tile).join('')
    : `<li class="empty">No files match${q ? ` “${esc(q)}”` : ''}. <button class="link" data-reset>Clear filters</button></li>`;
}

export function renderAssets(host, { q }) {
  const el = document.createElement('div');
  host.replaceChildren(el);
  el.innerHTML = `
    <div class="page">
      <header class="page-head">
        <h1>Asset library</h1>
        <p class="muted">Every image and video found under the media root. Files are referenced in place, so one file can serve several posts.</p>
      </header>
      <form class="filters" autocomplete="off">
        ${select('type', 'Type', [['image', 'Images'], ['video', 'Videos']])}
        ${select('speaker', 'Speaker', uniq(store.assets.map((a) => a.speaker)).map((s) => [s, s]))}
        ${select('year', 'Year', uniq(store.assets.map((a) => a.year)).map((y) => [y, y]))}
        ${select('role', 'Kind', [['source', 'Original source media'], ['finished', 'Finished creative']])}
        ${select('linked', 'Posts', [['linked', 'Used in a post'], ['unlinked', 'Not used yet']])}
        <button type="button" class="link" data-reset>Reset</button>
      </form>
      <p class="result-count muted"></p>
      <ul class="library"></ul>
    </div>`;

  bindCommonActions(el);
  el.querySelector('.filters').addEventListener('input', (e) => {
    filters[e.target.name] = e.target.value;
    sessionStorage.setItem(KEY, JSON.stringify(filters));
    renderList(el, q);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) {
      filters = { ...DEFAULTS };
      sessionStorage.setItem(KEY, JSON.stringify(filters));
      return renderAssets(host, { q });
    }
    const open = e.target.closest('[data-open]');
    if (open) openLightbox(visible, +open.dataset.open);
  });
  renderList(el, q);
}

export function updateAssetsSearch(el, q) {
  if (el.querySelector('.library')) renderList(el, q);
}
