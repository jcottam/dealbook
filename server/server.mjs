#!/usr/bin/env node
// DealBook Social Hub local server. Serves the app, a read-only JSON API, media (with byte ranges) and cached thumbnails.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildData, writeData } from '../scripts/build-data.mjs';
import { DATA_DIR, PROJECT_ROOT, loadConfig, saveConfig } from '../lib/config.mjs';
import { buildHubState } from '../lib/hub-state.mjs';
import { IMAGE_EXT, VIDEO_EXT } from '../lib/scan.mjs';

const { values: args } = parseArgs({
  options: { media: { type: 'string' }, port: { type: 'string' }, host: { type: 'string' } },
});

let config = loadConfig({ mediaRoot: args.media, port: args.port && +args.port, host: args.host });
const APP_DIR = resolve(PROJECT_ROOT, 'app');
const THUMB_DIR = resolve(PROJECT_ROOT, '.cache', 'thumbs');
const HAS_FFMPEG = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

// ---------- state ----------

let state = null;

function readJSON(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadData({ rebuild }) {
  const postsFile = resolve(DATA_DIR, 'posts.json');
  const researchFile = resolve(DATA_DIR, 'research.json');
  if (rebuild || !existsSync(postsFile)) {
    try {
      writeData(buildData(config));
    } catch (err) {
      console.warn(`[build] ${err.message}`);
    }
  }
  return {
    postsDoc: readJSON(postsFile, { posts: [], throughline: null, generatedAt: null, source: null }),
    research: readJSON(researchFile, { intro: null, speakers: [] }),
    assetMap: readJSON(resolve(DATA_DIR, 'asset-map.json'), { posts: {} }).posts || {},
  };
}

function refresh({ rebuild = false } = {}) {
  const { postsDoc, research, assetMap } = loadData({ rebuild });
  state = buildHubState({
    postsDoc,
    research,
    assetMap,
    mediaRoot: config.mediaRoot,
    serveMedia: true,
  });
  console.log(`[scan] ${state.posts.length} posts, ${state.assets.length} assets from ${config.mediaRoot}`);
}

// ---------- helpers ----------

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf || typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((ok, fail) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        ok(data ? JSON.parse(data) : {});
      } catch (e) {
        fail(e);
      }
    });
    req.on('error', fail);
  });
}

/** Resolve a URL path inside a root directory, refusing anything that escapes it. */
function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const abs = resolve(root, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded));
  const rel = relative(root, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return abs;
}

function serveFile(req, res, abs, { download = false, cache = 'no-cache' } = {}) {
  let st;
  try {
    st = statSync(abs);
  } catch {
    return send(res, 404, 'Not found');
  }
  if (!st.isFile()) return send(res, 404, 'Not found');
  const type = MIME[extname(abs).toLowerCase()] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache,
    'Last-Modified': st.mtime.toUTCString(),
  };
  if (download) headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(abs.split('/').pop())}`;

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? +range[1] : st.size - +range[2];
    let end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    if (start < 0) start = 0;
    if (start > end || start >= st.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(abs, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(abs).pipe(res);
}

// ---------- thumbnails ----------

const inflight = new Map();
let running = 0;
const queue = [];

function runLimited(fn) {
  return new Promise((ok, fail) => {
    const go = () => {
      running++;
      fn()
        .then(ok, fail)
        .finally(() => {
          running--;
          if (queue.length) queue.shift()();
        });
    };
    running < 3 ? go() : queue.push(go);
  });
}

function ffmpeg(argv) {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(err.trim() || `ffmpeg exited ${code}`))));
    p.on('error', fail);
  });
}

async function makeThumb(abs, out, isVideo, width) {
  const scale = ['-vf', `scale='min(${width},iw)':-2`, '-frames:v', '1', '-q:v', '4'];
  if (!isVideo) return ffmpeg(['-i', abs, ...scale, out]);
  try {
    await ffmpeg(['-ss', '2', '-i', abs, ...scale, out]);
    if (!existsSync(out)) throw new Error('no frame at 2s');
  } catch {
    await ffmpeg(['-i', abs, ...scale, out]);
  }
}

async function serveThumb(req, res, relUrl, width) {
  const abs = safeJoin(config.mediaRoot, relUrl.replace(/\.jpg$/, ''));
  if (!abs || !existsSync(abs)) return send(res, 404, 'Not found');
  const ext = extname(abs).toLowerCase();
  const isVideo = VIDEO_EXT.has(ext);
  if (!isVideo && !IMAGE_EXT.has(ext)) return send(res, 415, 'Unsupported');
  if (!HAS_FFMPEG) return isVideo ? send(res, 404, 'ffmpeg not installed') : serveFile(req, res, abs);

  const st = statSync(abs);
  const key = createHash('sha1').update(`${abs}|${st.size}|${st.mtimeMs}|${width}`).digest('hex');
  const out = resolve(THUMB_DIR, `${key}.jpg`);
  if (!existsSync(out)) {
    mkdirSync(THUMB_DIR, { recursive: true });
    if (!inflight.has(key)) {
      inflight.set(
        key,
        runLimited(() => makeThumb(abs, out, isVideo, width)).finally(() => inflight.delete(key)),
      );
    }
    try {
      await inflight.get(key);
    } catch (err) {
      console.warn(`[thumb] ${relUrl}: ${err.message}`);
      return isVideo ? send(res, 500, 'Thumbnail failed') : serveFile(req, res, abs);
    }
  }
  serveFile(req, res, out, { cache: 'public, max-age=86400' });
}

// ---------- routes ----------

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (path === '/api/posts') return send(res, 200, { generatedAt: state.generatedAt, throughline: state.throughline, posts: state.posts });
  if (path.startsWith('/api/posts/')) {
    const post = state.posts.find((p) => p.id === decodeURIComponent(path.slice(11)));
    return post ? send(res, 200, post) : send(res, 404, { error: 'Post not found' });
  }
  if (path === '/api/assets') return send(res, 200, { assets: state.assets });
  if (path === '/api/research') return send(res, 200, state.research);
  if (path === '/api/config' && req.method === 'GET') {
    return send(res, 200, {
      mediaRoot: config.raw?.mediaRoot ?? config.mediaRoot,
      csv: config.raw?.csv ?? config.csv,
      research: config.raw?.research ?? config.research,
      ffmpeg: HAS_FFMPEG,
      generatedAt: state.generatedAt,
      scannedAt: state.scannedAt,
      source: state.source,
    });
  }
  if (path === '/api/config' && req.method === 'POST') {
    const body = await readBody(req);
    const root = body.mediaRoot ? resolve(PROJECT_ROOT, String(body.mediaRoot).replace(/^~(?=\/|$)/, process.env.HOME)) : null;
    if (!root || !existsSync(root) || !statSync(root).isDirectory()) return send(res, 400, { error: `Not a directory: ${body.mediaRoot}` });
    config = { ...config, mediaRoot: root };
    saveConfig({ mediaRoot: relative(PROJECT_ROOT, root) || '.' });
    refresh();
    return send(res, 200, { ok: true, mediaRoot: root, assets: state.assets.length });
  }
  if (path === '/api/rescan' && req.method === 'POST') {
    refresh({ rebuild: true });
    return send(res, 200, { ok: true, posts: state.posts.length, assets: state.assets.length, scannedAt: state.scannedAt });
  }
  if (path === '/api/reveal' && req.method === 'POST') {
    const body = await readBody(req);
    const abs = body.path ? safeJoin(config.mediaRoot, body.path) : null;
    if (!abs || !existsSync(abs)) return send(res, 404, { error: 'File not found' });
    const [cmd, argv] = process.platform === 'darwin' ? ['open', ['-R', abs]] : process.platform === 'win32' ? ['explorer', [`/select,${abs}`]] : ['xdg-open', [resolve(abs, '..')]];
    spawn(cmd, argv, { stdio: 'ignore', detached: true }).unref();
    return send(res, 200, { ok: true });
  }

  if (path.startsWith('/media/')) {
    const abs = safeJoin(config.mediaRoot, path.slice(7));
    if (!abs) return send(res, 403, 'Forbidden');
    return serveFile(req, res, abs, { download: url.searchParams.has('download') });
  }
  if (path.startsWith('/thumbs/')) return serveThumb(req, res, path.slice(8), url.searchParams.get('w') === '1280' ? 1280 : 640);

  const abs = safeJoin(APP_DIR, path === '/' ? '/index.html' : path);
  if (!abs) return send(res, 403, 'Forbidden');
  if (existsSync(abs) && statSync(abs).isFile()) return serveFile(req, res, abs);
  return send(res, 404, 'Not found');
}

refresh();
const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: err.message });
  });
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other server or run with --port <number>.`);
    process.exit(1);
  }
  throw err;
});
server.listen(config.port, config.host, () => {
  console.log(`DealBook Social Hub running at http://${config.host}:${config.port}`);
  if (!HAS_FFMPEG) console.log('ffmpeg not found: video thumbnails disabled');
});
