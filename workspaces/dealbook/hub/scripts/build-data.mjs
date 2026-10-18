#!/usr/bin/env node
// Reads the content calendar CSV and the speaker one-pagers (never writes to them) and generates data/*.json.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCSV } from '../lib/csv.mjs';
import { DATA_DIR, loadConfig } from '../lib/config.mjs';
import { parseSourceText } from '../lib/parse-source.mjs';
import { parseOnePagers } from '../lib/research.mjs';
import { buildDataset, buildPlatformVariants } from '../lib/post-model.mjs';
import { detectSpeakers } from '../lib/speakers.mjs';

const COL = {
  group: 0, // A: month / week label (header cell holds the campaign throughline)
  postNumber: 1, // B
  date: 2, // C
  storyline: 3, // D
  concept: 4, // E
  stage: 5, // F
  format: 6, // G
  visualExample: 7, // H
  team: 8, // I
  source: 9, // J  editorial source material
  creative: 10, // K  social creative direction
  editInstructions: 11, // L
  platforms: 12, // M
  specs: 13, // N
  reviewLink: 14, // O
  pstvApproved: 15, // P
  nytApproved: 16, // Q
  deliveryFolder: 17, // R
  uploaded: 18, // S
  liveLink: 19, // T
  notes: 20, // U
};

const MONTHS = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i;

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
    .replace(/-$/, '');

const bool = (v) => /^(true|yes|y|x|✓)$/i.test(String(v).trim());
const clean = (v) => {
  const s = String(v ?? '').replace(/\u00a0/g, ' ').trim();
  return s === '' ? null : s;
};

function formatKind(format) {
  const f = (format || '').toLowerCase();
  if (/carousel/.test(f)) return f.includes('video') ? 'carousel-video' : 'carousel';
  if (/reel|video/.test(f)) return 'video';
  if (/graphic|still|quote card|image/.test(f)) return 'graphic';
  return f ? 'other' : 'unspecified';
}

function parseSpecs(specs) {
  const sizes = [];
  for (const m of String(specs || '').matchAll(/(?:([A-Za-z]+)\s*[-:]\s*)?(\d{3,4})\s*[x×]\s*(\d{3,4})/g)) {
    sizes.push({ label: m[1] ? m[1].toLowerCase() : null, width: +m[2], height: +m[3] });
  }
  return sizes;
}

export function buildPosts(rows) {
  const header = rows[0] || [];
  const throughline = clean(header[COL.group]);
  const posts = [];
  let month = null;
  let week = null;

  rows.slice(1).forEach((r, i) => {
    const row = i + 2; // 1-based sheet row
    const cell = (k) => clean(r[COL[k]]);
    const group = cell('group');
    if (group && /^week\s*\d+/i.test(group)) week = group;
    else if (group && MONTHS.test(group)) month = group[0] + group.slice(1).toLowerCase();

    const postNumber = cell('postNumber');
    const concept = cell('concept');
    if (!postNumber && !concept) return;

    const storyline = cell('storyline');
    const title = concept || storyline || `Post ${postNumber}`;
    const sourceRaw = r[COL.source] ?? '';
    const creativeRaw = r[COL.creative] ?? '';
    const id = `r${String(row).padStart(2, '0')}-p${postNumber ? postNumber.padStart(2, '0') : 'xx'}-${slugify(title)}`;

    const post = {
      id,
      row,
      postNumber,
      month,
      week,
      date: cell('date'),
      storyline,
      concept,
      title,
      stage: cell('stage'),
      format: cell('format'),
      formatKind: formatKind(cell('format')),
      visualExample: cell('visualExample'),
      team: cell('team'),
      source: { raw: sourceRaw.trim() ? sourceRaw : null, ...parseSourceText(sourceRaw) },
      creative: { raw: creativeRaw.trim() ? creativeRaw : null },
      editInstructions: cell('editInstructions'),
      platforms: (cell('platforms') || '').split(/[,/&]+/).map((s) => s.trim()).filter(Boolean),
      specs: cell('specs'),
      sizes: parseSpecs(cell('specs')),
      reviewLink: cell('reviewLink'),
      approvals: { pstv: bool(r[COL.pstvApproved]), nyt: bool(r[COL.nytApproved]) },
      deliveryFolder: cell('deliveryFolder'),
      uploaded: bool(r[COL.uploaded]),
      liveLink: cell('liveLink'),
      notes: cell('notes'),
      speakers: detectSpeakers({
        title: [storyline, concept].filter(Boolean).join(' \n '),
        body: [sourceRaw, creativeRaw].join('\n'),
      }),
    };
    post.platformVariants = buildPlatformVariants(post);
    posts.push(post);
  });

  return { throughline, posts };
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function buildData(config = loadConfig()) {
  if (!config.csv || !existsSync(config.csv)) throw new Error(`Content calendar CSV not found: ${config.csv}`);
  const csvBuf = readFileSync(config.csv);
  const { throughline, posts } = buildPosts(parseCSV(csvBuf.toString('utf8')));

  let research = { intro: null, speakers: [] };
  let researchMeta = null;
  if (config.research && existsSync(config.research)) {
    const buf = readFileSync(config.research);
    research = parseOnePagers(buf.toString('utf8'));
    researchMeta = { file: basename(config.research), sha256: sha256(buf) };
  }

  const generatedAt = new Date().toISOString();
  return {
    posts: {
      generatedAt,
      source: { file: basename(config.csv), sha256: sha256(csvBuf) },
      throughline,
      posts,
    },
    research: { generatedAt, source: researchMeta, ...research },
  };
}

export function writeData(data, dir = DATA_DIR) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'posts.json'), JSON.stringify(data.posts, null, 2) + '\n');
  writeFileSync(resolve(dir, 'research.json'), JSON.stringify(data.research, null, 2) + '\n');
  writeFileSync(resolve(dir, 'dataset.json'), JSON.stringify(buildDataset(data.posts), null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = buildData();
  writeData(data);
  const p = data.posts.posts;
  const stills = p.reduce((n, x) => n + x.source.stills.length, 0);
  const videos = p.reduce((n, x) => n + x.source.videos.length, 0);
  console.log(
    `Built ${p.length} posts (${stills} still refs, ${videos} video refs), dataset.json, and ${data.research.speakers.length} research profiles -> data/`,
  );
}
