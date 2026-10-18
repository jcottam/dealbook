import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _libDir = dirname(fileURLToPath(import.meta.url));
/** Legacy social hub package root (`workspaces/dealbook/hub`). */
export const HUB_ROOT = resolve(_libDir, '..');
/** DealBook workspace root (`source/`, `media/`, `data/`). */
export const WORKSPACE_ROOT = resolve(HUB_ROOT, '..');
export const CONFIG_PATH = resolve(HUB_ROOT, 'hub.config.json');
export const DATA_DIR = resolve(WORKSPACE_ROOT, 'data');

const DEFAULTS = {
  mediaRoot: 'media',
  csv: 'source/content-calendar.csv',
  research: 'source/research/speaker-one-pagers.html',
  host: '127.0.0.1',
  port: 4173,
};

/** Config with every path resolved to an absolute path (relative paths are relative to the workspace root). */
export function loadConfig(overrides = {}) {
  let file = {};
  try {
    file = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  const raw = { ...DEFAULTS, ...file, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v != null)) };
  const abs = (p) => (p ? resolve(WORKSPACE_ROOT, p) : null);
  return { ...raw, mediaRoot: abs(raw.mediaRoot), csv: abs(raw.csv), research: abs(raw.research), raw };
}

export function saveConfig(patch) {
  let file = {};
  try {
    file = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...file, ...patch }, null, 2) + '\n');
}
