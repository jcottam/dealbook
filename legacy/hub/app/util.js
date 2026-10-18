const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

/** Escape text and turn URLs into links. */
export function linkify(text) {
  return esc(text).replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trail = /[.,;)]+$/.exec(url)?.[0] || '';
    const href = trail ? url.slice(0, -trail.length) : url;
    return `<a href="${href}" target="_blank" rel="noopener">${href}</a>${trail}`;
  });
}

export function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function fmtDate(iso, style = 'short') {
  const d = parseDate(iso);
  if (!d) return 'Unscheduled';
  const opts =
    style === 'long'
      ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export function stageClass(stage) {
  const s = (stage || '').toLowerCase();
  if (!s) return 'stage-none';
  if (/approved|final|live|posted|delivered/.test(s)) return 'stage-done';
  if (/review/.test(s)) return 'stage-review';
  if (/edit|design|production|progress/.test(s)) return 'stage-work';
  return 'stage-idea';
}

export const FORMAT_LABEL = {
  video: 'Video',
  carousel: 'Carousel',
  'carousel-video': 'Carousel + video',
  graphic: 'Graphic',
  other: 'Other',
  unspecified: 'Format TBD',
};

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

export async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label}: ${text.length > 60 ? text.slice(0, 57) + '...' : text}`);
  } catch {
    toast('Copy failed');
  }
}

export async function reveal(path) {
  try {
    await api('/api/reveal', { method: 'POST', body: { path } });
    toast('Shown in Finder');
  } catch (e) {
    toast(e.message);
  }
}

export const copyBtn = (text, title = 'Copy') =>
  `<button class="copy" data-copy="${esc(text)}" title="${esc(title)}" aria-label="${esc(title)}"><svg viewBox="0 0 24 24"><path d="M8 8V4h12v12h-4v4H4V8h4Zm2 0h6v6h2V6h-8v2Zm-4 2v8h8v-8H6Z"/></svg></button>`;

/** Delegated handlers for buttons rendered by any view. */
export function bindCommonActions(root) {
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) {
      e.preventDefault();
      copyText(c.dataset.copy);
      return;
    }
    const r = e.target.closest('[data-reveal]');
    if (r) {
      e.preventDefault();
      reveal(r.dataset.reveal);
    }
  });
}

export function assetActions(a) {
  return `
    <a class="btn btn-sm" href="${a.url}" target="_blank" rel="noopener">Open</a>
    <a class="btn btn-sm" href="${a.url}?download" download>Download</a>
    <button class="btn btn-sm" data-reveal="${esc(a.path)}">Show in Finder</button>`;
}

export function thumbImg(a, cls = '') {
  return `<img class="${cls}" src="${a.thumb}" alt="${esc(a.filename)}" loading="lazy" data-fallback="${a.type === 'video' ? 'Video' : 'Image'}">`;
}

/** Replace thumbnails that fail to load (e.g. no ffmpeg) with a labelled placeholder. */
export function initThumbFallback() {
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
      const div = document.createElement('div');
      div.className = `thumb-fallback ${img.className}`;
      div.textContent = img.dataset.fallback;
      img.replaceWith(div);
    },
    true,
  );
}

// ---------- lightbox ----------

let lb = { list: [], index: 0 };

function renderLightbox() {
  const el = $('#lightbox');
  const a = lb.list[lb.index];
  if (!a) return closeLightbox();
  const media =
    a.type === 'video'
      ? `<video src="${a.url}" controls autoplay playsinline poster="${a.thumb}"></video>`
      : `<img src="${a.url}" alt="${esc(a.filename)}">`;
  const posts = (a.posts || []).map((p) => `<a class="chip" href="#/post/${esc(p.id)}">${esc(p.title)}</a>`).join('') || '<span class="muted">Not linked to a post</span>';
  el.innerHTML = `
    <div class="lb-stage">${media}</div>
    <aside class="lb-info">
      <button class="icon-btn lb-close" data-lb="close" aria-label="Close">&times;</button>
      <p class="eyebrow">${esc(a.role === 'finished' ? 'Finished creative' : 'Source media')} · ${esc(a.type)}</p>
      <h3 class="lb-title">${esc(a.filename)}</h3>
      <dl class="kv">
        <dt>Speaker</dt><dd>${esc(a.speaker || '—')}</dd>
        <dt>Year</dt><dd>${esc(a.year || '—')}</dd>
        <dt>Size</dt><dd>${fmtBytes(a.size)}</dd>
        ${a.clip ? `<dt>Clip range</dt><dd class="mono">${esc(a.clip.start)} – ${esc(a.clip.end)}${a.clip.proxy ? ' (proxy)' : ''}</dd>` : ''}
        <dt>Location</dt><dd class="mono path">${esc(a.path)} ${copyBtn(a.path, 'Copy path')}</dd>
      </dl>
      <p class="label">Used in</p>
      <div class="chips">${posts}</div>
      <div class="btn-row">${assetActions(a)}</div>
      ${lb.list.length > 1 ? `<div class="lb-nav"><button class="btn" data-lb="prev">Previous</button><span class="muted">${lb.index + 1} / ${lb.list.length}</span><button class="btn" data-lb="next">Next</button></div>` : ''}
    </aside>`;
}

function onLightboxKey(e) {
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
}

const step = (d) => {
  lb.index = (lb.index + d + lb.list.length) % lb.list.length;
  renderLightbox();
};

export function openLightbox(list, index = 0) {
  lb = { list, index };
  const el = $('#lightbox');
  el.hidden = false;
  document.body.classList.add('no-scroll');
  renderLightbox();
  document.addEventListener('keydown', onLightboxKey);
}

export function closeLightbox() {
  const el = $('#lightbox');
  el.hidden = true;
  el.innerHTML = '';
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', onLightboxKey);
}

export function initLightbox() {
  const el = $('#lightbox');
  bindCommonActions(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lb]');
    if (b) {
      const act = b.dataset.lb;
      if (act === 'close') closeLightbox();
      else step(act === 'next' ? 1 : -1);
      return;
    }
    if (e.target.closest('a[href^="#/"]')) closeLightbox();
    else if (e.target === el || e.target.classList.contains('lb-stage')) closeLightbox();
  });
}
