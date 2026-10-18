import { store } from './store.js';
import { renderGallery, updateGallerySearch } from './gallery.js';
import { renderPost } from './post.js';
import { renderAssets, updateAssetsSearch } from './assets.js';
import { $, $$, api, closeLightbox, esc, initLightbox, initThumbFallback, toast } from './util.js';

const view = $('#view');
const search = $('#q');
const queries = { posts: sessionStorage.getItem('dbhub.q.posts') || '', assets: sessionStorage.getItem('dbhub.q.assets') || '' };
let current = null;

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const post = /^\/post\/(.+)$/.exec(hash);
  if (post) return { name: 'post', id: decodeURIComponent(post[1]) };
  if (hash.startsWith('/assets')) return { name: 'assets' };
  return { name: 'posts' };
}

function render() {
  closeLightbox();
  const route = parseRoute();
  current = route.name;
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (route.name === 'assets' ? 'assets' : 'posts')));

  if (route.name === 'post') {
    search.value = '';
    search.placeholder = 'Search all posts';
    renderPost(view, route.id);
    const p = store.post(route.id);
    document.title = p ? `${p.title} · DealBook Social Hub` : 'DealBook Social Hub';
    return;
  }
  search.value = queries[route.name];
  if (route.name === 'assets') {
    search.placeholder = 'Search filenames, speakers, posts';
    renderAssets(view, { q: queries.assets });
    document.title = 'Asset library · DealBook Social Hub';
  } else {
    search.placeholder = 'Search posts, speakers, quotes, filenames';
    renderGallery(view, { q: queries.posts });
    document.title = 'DealBook Social Hub';
  }
}

search.addEventListener('input', () => {
  const q = search.value;
  if (current === 'post') {
    queries.posts = q;
    sessionStorage.setItem('dbhub.q.posts', q);
    location.hash = '#/';
    return;
  }
  queries[current] = q;
  sessionStorage.setItem(`dbhub.q.${current}`, q);
  if (current === 'assets') updateAssetsSearch(view, q);
  else updateGallerySearch(view, q);
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, select') && $('#lightbox').hidden) {
    e.preventDefault();
    search.focus();
    search.select();
  } else if (e.key === 'Escape' && document.activeElement === search && search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input'));
  }
});

// ---------- settings ----------

const dialog = $('#settings');
const msg = $('#settings-msg');

function setMsg(text, isError = false) {
  msg.textContent = text;
  msg.classList.toggle('is-error', isError);
}

async function openSettings() {
  setMsg('');
  const field = dialog.querySelector('.field');
  const saveBtn = $('#save-root-btn');
  const rescanBtn = $('#rescan-btn');
  field.hidden = store.static;
  saveBtn.hidden = store.static;
  rescanBtn.hidden = store.static;
  try {
    if (store.static) {
      const meta = await fetch('/data/meta.json').then((r) => r.json());
      $('#settings-info').innerHTML = `
        <dt>Mode</dt><dd>Static preview (deployed build)</dd>
        <dt>Content calendar</dt><dd class="mono small">${esc(meta.source?.calendar || '—')}</dd>
        <dt>Editorial research</dt><dd class="mono small">${esc(meta.source?.research || '—')}</dd>
        <dt>Data generated</dt><dd>${meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : '—'}</dd>
        <dt>Indexed media</dt><dd>${meta.assets ?? store.assets.length} files at build time${meta.mediaRoot ? ` · ${esc(meta.mediaRoot)}` : ' (no media root on host)'}</dd>
        <dt>Local hub</dt><dd class="small">Run <code>npm start</code> on your machine for live media, thumbnails, and rescan.</dd>`;
    } else {
      const cfg = await api('/api/config');
      dialog.querySelector('[name=mediaRoot]').value = cfg.mediaRoot;
      $('#settings-info').innerHTML = `
        <dt>Content calendar</dt><dd class="mono small">${esc(cfg.csv || '—')}</dd>
        <dt>Editorial research</dt><dd class="mono small">${esc(cfg.research || '—')}</dd>
        <dt>Data generated</dt><dd>${cfg.generatedAt ? new Date(cfg.generatedAt).toLocaleString() : '—'}</dd>
        <dt>Media scanned</dt><dd>${new Date(cfg.scannedAt).toLocaleString()} · ${store.assets.length} files</dd>
        <dt>Video thumbnails</dt><dd>${cfg.ffmpeg ? 'ffmpeg available' : 'ffmpeg not found (install it to see video thumbnails)'}</dd>
        <dt>Original documents</dt><dd>Read-only. Source files under <code>source/</code> are never modified.</dd>`;
    }
  } catch (e) {
    setMsg(e.message, true);
  }
  dialog.showModal();
}

async function reload(note) {
  await store.load();
  render();
  toast(note);
}

$('#settings-btn').addEventListener('click', openSettings);
$('#save-root-btn').addEventListener('click', async () => {
  setMsg('Scanning...');
  try {
    const r = await api('/api/config', { method: 'POST', body: { mediaRoot: dialog.querySelector('[name=mediaRoot]').value.trim() } });
    setMsg(`Using ${r.mediaRoot} (${r.assets} files found).`);
    await reload('Media root updated');
  } catch (e) {
    setMsg(e.message, true);
  }
});
$('#rescan-btn').addEventListener('click', async () => {
  setMsg('Rebuilding from the calendar and rescanning media...');
  try {
    const r = await api('/api/rescan', { method: 'POST' });
    setMsg(`Done: ${r.posts} posts, ${r.assets} files.`);
    await reload('Data refreshed');
  } catch (e) {
    setMsg(e.message, true);
  }
});

// ---------- boot ----------

initLightbox();
initThumbFallback();
window.addEventListener('hashchange', render);
store
  .load()
  .then(render)
  .catch((e) => {
    view.innerHTML = `<div class="page"><div class="empty">Could not load data: ${esc(e.message)}. Is the server running?</div></div>`;
  });
