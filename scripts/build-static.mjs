#!/usr/bin/env node
// Builds a static site in public/ for Vercel, Cloudflare Pages, or any static host.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DATA_DIR, PROJECT_ROOT, loadConfig } from '../lib/config.mjs';
import { buildHubState } from '../lib/hub-state.mjs';
import { buildData, writeData } from './build-data.mjs';

const APP_DIR = resolve(PROJECT_ROOT, 'app');
const OUT_DIR = resolve(PROJECT_ROOT, 'public');

function readJSON(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function copyApp(src, dest) {
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) {
      mkdirSync(to, { recursive: true });
      copyApp(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

function patchIndex(html) {
  const banner = '<script>window.__HUB_STATIC__=true</script>';
  return html.includes('__HUB_STATIC__') ? html : html.replace('</head>', `  ${banner}\n  </head>`);
}

const config = loadConfig();
writeData(buildData(config));

const postsDoc = readJSON(resolve(DATA_DIR, 'posts.json'), { posts: [], throughline: null, generatedAt: null, source: null });
const research = readJSON(resolve(DATA_DIR, 'research.json'), { intro: null, speakers: [] });
const assetMap = readJSON(resolve(DATA_DIR, 'asset-map.json'), { posts: {} }).posts || {};

const mediaRoot = process.env.HUB_MEDIA_ROOT ? resolve(PROJECT_ROOT, process.env.HUB_MEDIA_ROOT) : config.mediaRoot;
const hub = buildHubState({
  postsDoc,
  research,
  assetMap,
  mediaRoot: existsSync(mediaRoot) ? mediaRoot : null,
  serveMedia: false,
});

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(join(OUT_DIR, 'data'), { recursive: true });
copyApp(APP_DIR, OUT_DIR);

writeFileSync(join(OUT_DIR, 'index.html'), patchIndex(readFileSync(join(OUT_DIR, 'index.html'), 'utf8')));
writeFileSync(
  join(OUT_DIR, 'data', 'posts.json'),
  JSON.stringify(
    { generatedAt: hub.generatedAt, throughline: hub.throughline, posts: hub.posts, source: hub.source },
    null,
    2,
  ) + '\n',
);
writeFileSync(join(OUT_DIR, 'data', 'assets.json'), JSON.stringify({ assets: hub.assets }, null, 2) + '\n');
writeFileSync(join(OUT_DIR, 'data', 'research.json'), JSON.stringify(hub.research, null, 2) + '\n');
writeFileSync(
  join(OUT_DIR, 'data', 'meta.json'),
  JSON.stringify(
    {
      mode: 'static',
      generatedAt: hub.generatedAt,
      scannedAt: hub.scannedAt,
      source: {
        calendar: config.raw?.csv || 'source/content-calendar.csv',
        research: config.raw?.research || 'source/research/speaker-one-pagers.html',
      },
      mediaRoot: mediaRoot && existsSync(mediaRoot) ? mediaRoot : null,
      posts: hub.posts.length,
      assets: hub.assets.length,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(join(OUT_DIR, 'data', 'dataset.json'), readFileSync(resolve(DATA_DIR, 'dataset.json')));

console.log(`Static site -> public/ (${hub.posts.length} posts, ${hub.assets.length} assets indexed)`);
