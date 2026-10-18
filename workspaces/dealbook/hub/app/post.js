import { store } from './store.js';
import {
  FORMAT_LABEL,
  assetActions,
  bindCommonActions,
  copyBtn,
  esc,
  fmtBytes,
  fmtDate,
  linkify,
  openLightbox,
  stageClass,
  thumbImg,
} from './util.js';

const VIA_LABEL = { filename: 'Matched by filename in column J', timecode: 'Matched by speaker and timecode', 'asset-map': 'Linked in asset-map.json' };

/** First quoted passage in the creative copy, used as the on-screen text in the mockup. */
function onScreenText(raw) {
  if (!raw) return null;
  const quote = /[“"]([^”"]{12,})[”"]/.exec(raw);
  const attribution = /^\s*[—–-]{1,3}\s*(.+)$/m.exec(raw);
  if (quote) return { quote: quote[1].trim(), attribution: attribution ? attribution[1].trim() : null };
  const first = raw.split('\n').map((s) => s.trim()).find(Boolean);
  return first ? { quote: first.replace(/^[^:]{0,30}:\s*/, ''), attribution: null } : null;
}

function mockup(p, slides) {
  const size = p.sizes.find((s) => !s.label || /still|image|graphic|post/.test(s.label)) || p.sizes[0] || { width: 1080, height: 1350 };
  const overlay = onScreenText(p.creative.raw);
  const slideHtml = slides.length
    ? slides
        .map((l, i) => {
          const a = l.asset;
          const media =
            a.type === 'video'
              ? `<video src="${a.url}" poster="${a.thumb}" controls preload="metadata" playsinline></video>`
              : `<img src="${a.thumb}?w=1280" alt="${esc(a.filename)}" loading="lazy" data-fallback="Image">`;
          return `<div class="slide${i === 0 ? ' active' : ''}" data-index="${i}">${media}</div>`;
        })
        .join('')
    : `<div class="slide active slide-empty"><p>No local media yet</p><small>See the production checklist for what is missing.</small></div>`;

  return `
    <div class="mockup">
      <div class="mock-head"><span class="avatar">DB</span><span><strong>nytdealbook</strong><small>${esc(p.platforms.join(' · ') || 'Platform TBD')}</small></span></div>
      <div class="mock-frame" style="aspect-ratio:${size.width}/${size.height}">
        ${slideHtml}
        ${overlay ? `<div class="mock-overlay"><p class="mock-quote">${esc(overlay.quote)}</p>${overlay.attribution ? `<p class="mock-attr">${esc(overlay.attribution)}</p>` : ''}</div>` : ''}
        ${slides.length > 1 ? `<button class="mock-nav prev" data-slide="-1" aria-label="Previous slide">&#8249;</button><button class="mock-nav next" data-slide="1" aria-label="Next slide">&#8250;</button>` : ''}
      </div>
      <div class="mock-foot">
        ${slides.length > 1 ? `<div class="dots">${slides.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>` : ''}
        <span class="muted">${size.width} × ${size.height}${slides.length ? ` · slide <span data-slide-num>1</span> of ${slides.length}` : ''}</span>
        ${overlay ? '<label class="toggle"><input type="checkbox" data-overlay checked><span>Show on-screen text</span></label>' : ''}
      </div>
      ${slides.length ? `<p class="mock-slide-name mono" data-slide-name>${esc(slides[0].asset.filename)}</p>` : ''}
    </div>`;
}

function block(label, body, cls = '') {
  return body ? `<section class="block ${cls}"><h4 class="label">${label}</h4>${body}</section>` : '';
}

const pre = (text) => (text ? `<div class="prose">${linkify(text.trim())}</div>` : '');

function previewPanel(p, slides) {
  return `
    <section class="panel">
      <header class="panel-head"><h2>Post preview</h2><span class="tag tag-creative">Social creative · Column K</span></header>
      <div class="preview">
        ${mockup(p, slides)}
        <div class="preview-copy">
          ${block('Proposed copy and on-screen text', pre(p.creative.raw) || '<p class="muted">No copy written yet.</p>')}
          ${block('Edit instructions', pre(p.editInstructions))}
          ${block('Visual example for designer', pre(p.visualExample))}
          ${block('Notes', pre(p.notes))}
        </div>
      </div>
    </section>`;
}

const momentItem = (m) =>
  `<li><span class="mono tc">${esc(m.time || '')}</span><span>${m.tag ? `<em class="muted">(${esc(m.tag)})</em> ` : ''}${esc(m.text)}</span></li>`;

function refStatus(found, kind = 'still') {
  if (kind === 'video') return found ? '<span class="status status-ok">Clip found locally</span>' : '<span class="status status-missing">Clip not cut yet</span>';
  return found ? '<span class="status status-ok">Found locally</span>' : '<span class="status status-missing">Missing</span>';
}

function editorialPanel(p, research) {
  const s = p.source;
  const linkedRefs = new Set(p.links.assets.map((l) => l.ref).filter(Boolean));
  const stills = s.stills
    .map(
      (st) => `<li class="ref">
        <div class="ref-head"><span class="ref-kind">Still</span><strong class="mono">${esc(st.filename)}</strong>${refStatus(linkedRefs.has(st.filename))}</div>
        <div class="ref-path mono">${esc(st.path)} ${copyBtn(st.path, 'Copy path')}</div>
        ${st.note ? `<p class="ref-note">${esc(st.note)}</p>` : ''}
      </li>`,
    )
    .join('');
  const videos = s.videos
    .map((v) => {
      const found = p.links.assets.some((l) => l.via === 'timecode' && l.ref === v.filename);
      const marks = v.marks.filter((m) => m.text);
      return `<li class="ref">
        <div class="ref-head"><span class="ref-kind">Video</span><strong class="mono">${esc(v.filename)}</strong>${v.range ? refStatus(found, 'video') : '<span class="status status-todo">Needs timecodes</span>'}</div>
        <div class="ref-path mono">${esc(v.path)} ${copyBtn(v.path, 'Copy path')}</div>
        ${v.range ? `<div class="ref-tc"><span class="mono">${esc(v.range.start)} – ${esc(v.range.end)}</span> ${copyBtn(`${v.range.start} - ${v.range.end}`, 'Copy timecodes')}</div>` : ''}
        ${marks.length ? `<ul class="marks">${marks.map((m) => `<li><span class="mono tc">${esc(m.tc)}</span><span>${esc(m.text)}</span></li>`).join('')}</ul>` : ''}
      </li>`;
    })
    .join('');
  const loose = s.marks.filter((m) => m.tc);
  const links = s.links
    .map((l) => `<li><span class="ref-kind">${esc(l.kind === 'mimir' ? 'Mimir share' : l.kind)}</span> <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url)}</a></li>`)
    .join('');

  const researchHtml = research
    .map(
      (r) => `<article class="research">
        <h4>${esc(r.name)}${r.title ? `, <span class="muted">${esc(r.title)}</span>` : ''}</h4>
        <p class="muted small">${[r.summit, r.interviewer && `Interviewer: ${r.interviewer}`, r.length].filter(Boolean).map(esc).join(' · ')}</p>
        ${r.video || r.audio ? `<p class="small mono">${r.video ? `Video: ${esc(r.video)}` : ''}${r.video && r.audio ? '<br>' : ''}${r.audio ? `Audio: ${esc(r.audio)}` : ''}</p>` : ''}
        ${r.oneLine ? `<p class="one-line">${esc(r.oneLine)}</p>` : ''}
        <p class="label">Clip-worthy moments</p>
        <ul class="marks">${r.moments.slice(0, 6).map(momentItem).join('')}</ul>
        ${r.moments.length > 6 ? `<details><summary>Show all ${r.moments.length} moments</summary><ul class="marks">${r.moments.slice(6).map(momentItem).join('')}</ul></details>` : ''}
        <details><summary>Topics at a glance (${r.topics.length})</summary>
          <ul class="marks">${r.topics.map((t) => `<li><span class="mono tc">${esc(t.time)}</span><span>${esc(t.topic)}</span></li>`).join('')}</ul>
        </details>
        ${r.postIdeas.length ? `<details><summary>Post ideas (${r.postIdeas.length})</summary><ul class="marks">${r.postIdeas.map((i) => `<li><span class="mono tc">${esc(i.time || '')}</span><span>${esc(i.text)}</span></li>`).join('')}</ul></details>` : ''}
      </article>`,
    )
    .join('');

  return `
    <section class="panel">
      <header class="panel-head"><h2>Editorial research</h2><span class="tag tag-editorial">Editorial source · Column J</span></header>
      <div class="panel-body">
        ${block('Editorial concept', `<p class="concept">${esc(p.concept || '—')}</p>${p.storyline ? `<p class="muted small">Storyline: ${esc(p.storyline)}</p>` : ''}`)}
        ${stills || videos ? block('Source references', `<ul class="refs">${stills}${videos}</ul>`) : block('Source references', '<p class="muted">No source files referenced yet.</p>')}
        ${loose.length ? block('Other timecodes', `<ul class="marks">${loose.map((m) => `<li><span class="mono tc">${esc(m.tc)}</span><span>${esc(m.text)}</span></li>`).join('')}</ul>`) : ''}
        ${links ? block('Share links', `<ul class="links">${links}</ul>`) : ''}
        ${s.raw ? block('Original cell text', `<details><summary>Show column J exactly as written</summary><div class="prose raw">${linkify(s.raw)}</div></details>`) : ''}
        ${researchHtml ? block('Speaker research (one-pagers)', `${store.research.intro ? `<p class="caveat">${esc(store.research.intro)}</p>` : ''}${researchHtml}`) : ''}
      </div>
    </section>`;
}

function assetTile(l, i) {
  const a = l.asset;
  const desc = [a.type === 'video' ? 'Video' : 'Image', a.speaker, a.year, fmtBytes(a.size)].filter(Boolean).map(esc).join(' · ');
  return `<li class="asset">
    <button class="asset-thumb" data-open="${i}" aria-label="Preview ${esc(a.filename)}">${thumbImg(a)}${a.type === 'video' ? '<span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' : ''}</button>
    <div class="asset-info">
      <strong class="mono">${esc(a.filename)}</strong>
      <span class="muted small">${desc}</span>
      ${a.clip ? `<span class="small mono">${esc(a.clip.start)} – ${esc(a.clip.end)}${a.clip.proxy ? ' · proxy' : ''}</span>` : ''}
      <span class="small muted">${esc(VIA_LABEL[l.via] || l.via)}${l.note ? ` · ${esc(l.note)}` : ''}</span>
      <span class="small mono path">${esc(a.path)}</span>
      <div class="btn-row">${assetActions(a)}</div>
    </div>
  </li>`;
}

function assetsPanel(p, ordered) {
  const finished = ordered.filter((l) => l.role === 'finished');
  const source = ordered.filter((l) => l.role !== 'finished');
  const list = (items, offset) => `<ul class="assets">${items.map((l, i) => assetTile(l, i + offset)).join('')}</ul>`;
  return `
    <section class="panel">
      <header class="panel-head"><h2>Associated assets</h2><span class="muted">${ordered.length} file${ordered.length === 1 ? '' : 's'}</span></header>
      <div class="panel-body">
        <div class="asset-group">
          <h4 class="label"><span class="tag tag-finished">Finished creative</span></h4>
          ${finished.length ? list(finished, 0) : '<p class="muted small">No finished creative yet. Put deliverables in a <code>_finished</code> or <code>Delivery</code> folder, or link them in <code>data/asset-map.json</code> with role "finished".</p>'}
        </div>
        <div class="asset-group">
          <h4 class="label"><span class="tag tag-source">Original source media</span></h4>
          ${source.length ? list(source, finished.length) : '<p class="muted small">No source media found locally for this post.</p>'}
        </div>
      </div>
    </section>`;
}

function yesNo(v, yes = 'Approved', no = 'Pending') {
  return v ? `<span class="status status-ok">${yes}</span>` : `<span class="status status-pending">${no}</span>`;
}

function productionPanel(p) {
  const { missing, broken, outstanding } = p.links;
  const items = [
    ...missing.map(
      (m) => `<li class="issue issue-missing">
        <strong>${m.kind === 'still' ? 'Still' : 'Video clip'} not found locally:</strong> <span class="mono">${esc(m.filename)}</span>
        ${m.range ? `<span class="mono small"> ${esc(m.range.start)} – ${esc(m.range.end)}</span>` : ''}
        <div class="mono small path">${esc(m.expectedPath)} ${copyBtn(m.expectedPath, 'Copy archive path')}</div>
        ${m.note ? `<div class="small muted">${esc(m.note)}</div>` : ''}
      </li>`,
    ),
    ...broken.map((b) => `<li class="issue issue-missing"><strong>Broken link in asset-map.json:</strong> <span class="mono">${esc(b.path)}</span></li>`),
    ...outstanding.map((o) => `<li class="issue issue-todo"><strong>Outstanding:</strong> ${esc(o)}</li>`),
  ];
  const link = (v) => (v ? linkify(v) : '<span class="muted">—</span>');
  return `
    <section class="panel">
      <header class="panel-head"><h2>Production</h2><span class="stage ${stageClass(p.stage)}">${esc(p.stage || 'Not set')}</span></header>
      <div class="panel-body">
        <dl class="kv">
          <dt>Team</dt><dd>${esc(p.team || '—')}</dd>
          <dt>Publish date</dt><dd>${esc(fmtDate(p.date, 'long'))}</dd>
          <dt>Format</dt><dd>${esc(p.format || FORMAT_LABEL[p.formatKind])}</dd>
          <dt>Platforms</dt><dd>${esc(p.platforms.join(', ') || '—')}</dd>
          <dt>Delivery specs</dt><dd class="prose">${esc(p.specs || '—')}</dd>
          <dt>PStv approval</dt><dd>${yesNo(p.approvals.pstv)}</dd>
          <dt>NYT approval</dt><dd>${yesNo(p.approvals.nyt)}</dd>
          <dt>Review link</dt><dd>${link(p.reviewLink)}</dd>
          <dt>Delivery folder</dt><dd>${link(p.deliveryFolder)}</dd>
          <dt>Uploaded</dt><dd>${yesNo(p.uploaded, 'Uploaded', 'Not yet')}</dd>
          <dt>Live post</dt><dd>${link(p.liveLink)}</dd>
          <dt>Calendar row</dt><dd>Row ${p.row} · <span class="mono small">${esc(p.id)}</span> ${copyBtn(p.id, 'Copy post ID')}</dd>
        </dl>
        <section class="block">
          <h4 class="label">Missing and outstanding</h4>
          ${items.length ? `<ul class="issues">${items.join('')}</ul>` : '<p class="status status-ok">All referenced assets are available locally.</p>'}
        </section>
      </div>
    </section>`;
}

export function renderPost(host, id) {
  const p = store.post(id);
  const el = document.createElement('div');
  host.replaceChildren(el);
  if (!p) {
    el.innerHTML = `<div class="page"><div class="empty">Post not found. <a href="#/">Back to all posts</a></div></div>`;
    return;
  }

  // Finished creative first, then stills, then video, so the mockup leads with the most representative frame.
  const rank = (l) => (l.role === 'finished' ? 0 : l.asset.type === 'image' ? 1 : 2);
  const ordered = [...p.links.assets].sort((a, b) => rank(a) - rank(b));
  const research = store.researchFor(p.research);
  const idx = store.posts.indexOf(p);
  const prev = store.posts[idx - 1];
  const next = store.posts[idx + 1];

  el.innerHTML = `
    <div class="page page-post">
      <nav class="crumbs">
        <a href="#/">&larr; All posts</a>
        <span class="spacer"></span>
        ${prev ? `<a href="#/post/${esc(prev.id)}" title="${esc(prev.title)}">&lsaquo; Previous</a>` : ''}
        ${next ? `<a href="#/post/${esc(next.id)}" title="${esc(next.title)}">Next &rsaquo;</a>` : ''}
      </nav>
      <header class="post-head">
        <p class="eyebrow">${p.postNumber ? `Post ${esc(p.postNumber)} · ` : ''}${esc(fmtDate(p.date, 'long'))}${p.storyline ? ` · ${esc(p.storyline)}` : ''}</p>
        <h1>${esc(p.title)}</h1>
        <div class="head-meta">
          <span class="stage ${stageClass(p.stage)}">${esc(p.stage || 'Status not set')}</span>
          <span class="chip">${esc(p.format || FORMAT_LABEL[p.formatKind])}</span>
          ${p.speakers.map((s) => `<span class="chip chip-speaker">${esc(s)}</span>`).join('')}
          ${p.counts.missing ? `<span class="badge badge-missing">${p.counts.missing} missing</span>` : ''}
          ${p.counts.outstanding ? `<span class="badge badge-todo">${p.counts.outstanding} to do</span>` : ''}
        </div>
      </header>
      <div class="post-grid">
        <div class="col">${previewPanel(p, ordered)}${productionPanel(p)}</div>
        <div class="col">${editorialPanel(p, research)}${assetsPanel(p, ordered)}</div>
      </div>
    </div>`;

  bindCommonActions(el);
  let current = 0;
  const slides = [...el.querySelectorAll('.slide')];
  const dots = [...el.querySelectorAll('.dot')];
  const show = (i) => {
    slides[current]?.querySelector('video')?.pause();
    current = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('active', j === current));
    dots.forEach((d, j) => d.classList.toggle('active', j === current));
    const num = el.querySelector('[data-slide-num]');
    if (num) num.textContent = current + 1;
    const name = el.querySelector('[data-slide-name]');
    if (name && ordered[current]) name.textContent = ordered[current].asset.filename;
  };

  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-slide]');
    if (nav) return show(current + +nav.dataset.slide);
    const open = e.target.closest('[data-open]');
    if (open) openLightbox(ordered.map((l) => l.asset), +open.dataset.open);
  });
  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-overlay]')) el.querySelector('.mock-overlay')?.classList.toggle('hidden', !e.target.checked);
  });
  window.scrollTo(0, 0);
}
