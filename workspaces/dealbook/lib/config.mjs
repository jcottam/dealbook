import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _libDir = dirname(fileURLToPath(import.meta.url));
/** DealBook workspace root (`source/`, `media/`, `data/`). */
export const WORKSPACE_ROOT = resolve(_libDir, '..');
export const DATA_DIR = resolve(WORKSPACE_ROOT, 'data');

const DEFAULTS = {
  mediaRoot: 'media',
  csv: 'source/content-calendar.csv',
  research: 'source/research/speaker-one-pagers.html',
};

/** Config with every path resolved to an absolute path (relative paths are relative to the workspace root). */
export function loadConfig(overrides = {}) {
  const raw = { ...DEFAULTS, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v != null)) };
  const abs = (p) => (p ? resolve(WORKSPACE_ROOT, p) : null);
  return { ...raw, mediaRoot: abs(raw.mediaRoot), csv: abs(raw.csv), research: abs(raw.research), raw };
}
