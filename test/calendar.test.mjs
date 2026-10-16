import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { loadConfig } from '../lib/config.mjs';
import { parseCSV } from '../lib/csv.mjs';
import { buildPosts } from '../scripts/build-data.mjs';
import { parseOnePagers } from '../lib/research.mjs';

const config = loadConfig();
const hasCsv = Boolean(config.csv && existsSync(config.csv));
const hasResearch = Boolean(config.research && existsSync(config.research));

const posts = hasCsv ? buildPosts(parseCSV(readFileSync(config.csv, 'utf8'))).posts : [];
const row = (n) => posts.find((p) => p.id.startsWith(`r${String(n).padStart(2, '0')}-`));

test('calendar: every content row becomes a post with a unique id', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  assert.ok(posts.length >= 30);
  assert.equal(new Set(posts.map((p) => p.id)).size, posts.length);
});

test('calendar: J4 has two stills and one clip range', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  const s = row(4).source;
  assert.deepEqual(
    s.stills.map((x) => x.filename),
    ['_DSC4412.jpg', '_DSC4309.jpg'],
  );
  assert.equal(s.videos.length, 1);
  assert.deepEqual([s.videos[0].range.start, s.videos[0].range.end], ['00:04:55:22', '00:05:17:09']);
  assert.deepEqual(row(4).speakers, ['Elon Musk']);
});

test('calendar: J5 repeated timecodes are merged', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  for (const v of row(5).source.videos) {
    const tcs = v.marks.map((m) => m.tc);
    assert.equal(new Set(tcs).size, tcs.length);
  }
});

test('calendar: "Sorkin on Charlie Kirk" is flagged as needing a still', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  const post = posts.find((p) => p.title === 'Sorkin on Charlie Kirk');
  assert.ok(post.source.flags.includes('Still image needed'));
});

test('calendar: original cell text is preserved verbatim', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  const rows = parseCSV(readFileSync(config.csv, 'utf8'));
  assert.equal(row(4).source.raw, rows[3][9]);
});

test('research: one-pagers parse into speakers with clip-worthy moments', { skip: !hasResearch && 'research file not found' }, () => {
  const r = parseOnePagers(readFileSync(config.research, 'utf8'));
  assert.ok(r.speakers.length >= 2);
  const bezos = r.speakers.find((s) => /Bezos/.test(s.name));
  assert.ok(bezos.moments.length > 5);
  assert.ok(bezos.moments.every((m) => m.text));
  assert.ok(JSON.stringify(bezos).includes('$80K'));
});
