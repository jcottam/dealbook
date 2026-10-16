import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { speakerFromFolder } from './speakers.mjs';
import { parseTimecode, timecodeToUnits, formatTimecode } from './timecode.mjs';

export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
export const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm']);

// When mediaRoot is the repo root (legacy), skip code and generated output.
const SKIP_DIRS = new Set([
  'app',
  'server',
  'scripts',
  'lib',
  'data',
  'test',
  'source',
  'schema',
  'public',
  'node_modules',
  '.git',
  '.vercel',
  '.cache',
]);
const FINISHED_DIR_RE = /^(_finished|finished|delivery|deliverables?)$/i;
export const POST_DIR_RE = /^Post\s+(\d+)\s*[-–—]\s*(.+)$/i;

/** "Elon_Musk_2023_00-04-55-22_to_00-05-17-09-proxy.mp4" -> clip metadata, or null for other names. */
export function parseClipName(filename) {
  const m = /^(.+?)_(\d{4})_(\d{2}-\d{2}-\d{2}(?:-\d{2})?)_to_(\d{2}-\d{2}-\d{2}(?:-\d{2})?)(-proxy)?\.[a-z0-9]+$/i.exec(filename);
  if (!m) return null;
  const start = parseTimecode(m[3]);
  const end = parseTimecode(m[4]);
  return {
    speaker: speakerFromFolder(m[1]),
    year: +m[2],
    start: formatTimecode(start),
    end: formatTimecode(end),
    startUnits: timecodeToUnits(start),
    endUnits: timecodeToUnits(end),
    proxy: Boolean(m[5]),
  };
}

export function describeAsset(root, abs, st) {
  const rel = relative(root, abs).split(sep).join('/');
  const parts = rel.split('/');
  const filename = parts[parts.length - 1];
  const ext = extname(filename).toLowerCase();
  const type = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : null;
  if (!type) return null;

  const dirs = parts.slice(0, -1);
  const clip = type === 'video' ? parseClipName(filename) : null;
  const role = dirs.some((d) => FINISHED_DIR_RE.test(d)) ? 'finished' : 'source';
  const base = { path: rel, filename, ext, type, size: st.size, mtime: st.mtimeMs, role, clip, post: null };

  // "Post 2 - Elon Musk/…": the folder names the calendar post, not the person pictured, so only clip names give speaker/year.
  const postDir = dirs.map((d) => POST_DIR_RE.exec(d)).find(Boolean);
  if (postDir) {
    return {
      ...base,
      post: { number: +postDir[1], label: postDir[2].trim() },
      year: clip?.year ?? null,
      speaker: clip?.speaker ?? null,
    };
  }

  // Legacy "2023/Elon_Musk/…" layout.
  const yearIdx = dirs.findIndex((d) => /^20\d\d$/.test(d));
  const speakerDir = yearIdx >= 0 ? dirs[yearIdx + 1] : dirs[dirs.length - 1];
  return {
    ...base,
    year: (yearIdx >= 0 ? +dirs[yearIdx] : null) ?? clip?.year ?? null,
    speaker: clip?.speaker || (speakerDir && !FINISHED_DIR_RE.test(speakerDir) ? speakerFromFolder(speakerDir) : null),
  };
}

/** Walk the media root and describe every supported image and video. Never modifies files. */
export function scanMedia(root) {
  const assets = [];
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (depth === 0 && SKIP_DIRS.has(e.name)) continue;
        walk(abs, depth + 1);
      } else if (e.isFile()) {
        const a = describeAsset(root, abs, statSync(abs));
        if (a) assets.push(a);
      }
    }
  };
  walk(root, 0);
  return assets.sort((a, b) => a.path.localeCompare(b.path));
}
