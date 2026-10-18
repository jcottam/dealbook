#!/usr/bin/env node
// Pull the content calendar CSV from Google Sheets into source/content-calendar.csv.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = resolve(WORKSPACE_ROOT, 'source/calendar-source.json');

function loadManifest() {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (!m.spreadsheetId || !m.gid) throw new Error(`Invalid ${MANIFEST}: need spreadsheetId and gid`);
  const output = resolve(WORKSPACE_ROOT, m.output || 'source/content-calendar.csv');
  const exportUrl = `https://docs.google.com/spreadsheets/d/${m.spreadsheetId}/export?format=csv&gid=${m.gid}`;
  return { ...m, output, exportUrl };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function looksLikeCalendar(csv) {
  const head = csv.slice(0, 4000);
  return /Post\s*#/i.test(head) && /Post Date/i.test(head);
}

async function fetchCalendar(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'dealbook-social-hub/sync-calendar' },
    redirect: 'follow',
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Sheet export failed (${res.status}): ${body.slice(0, 200)}`);
  }
  if (body.includes('<!DOCTYPE html') || body.includes('<html')) {
    throw new Error('Sheet export returned HTML (check sharing: link must allow view/export).');
  }
  if (!looksLikeCalendar(body)) {
    throw new Error('Download does not look like the content calendar (missing Post # / Post Date headers).');
  }
  return body;
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('-n');
const quiet = args.has('--quiet') || args.has('-q');

async function main() {
  const { exportUrl, output, editUrl } = loadManifest();
  const csv = await fetchCalendar(exportUrl);
  const nextHash = sha256(csv);

  let prevHash = null;
  try {
    prevHash = sha256(readFileSync(output, 'utf8'));
  } catch {
    /* no local file yet */
  }

  if (prevHash === nextHash) {
    if (!quiet) console.log(`Calendar unchanged (${output})`);
    return;
  }

  if (dryRun) {
    console.log(`Would update ${output} (${csv.length} bytes, hash ${nextHash.slice(0, 12)}…)`);
    console.log(`Source: ${editUrl}`);
    return;
  }

  writeFileSync(output, csv.endsWith('\n') ? csv : csv + '\n');
  if (!quiet) {
    console.log(`Wrote ${output} (${csv.length} bytes)`);
    console.log(`Sheet: ${editUrl}`);
    console.log('Next: pnpm dealbook:hub:build   # static site, or pnpm dealbook:hub:start for the local hub');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
