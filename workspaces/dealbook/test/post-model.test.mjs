import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { loadConfig } from '../lib/config.mjs';
import { parseCSV } from '../lib/csv.mjs';
import { buildPosts } from '../scripts/build-data.mjs';
import { buildPlatformVariants, platformSlug, toDatasetPost } from '../lib/post-model.mjs';

const config = loadConfig();
const hasCsv = Boolean(config.csv && existsSync(config.csv));
const posts = hasCsv ? buildPosts(parseCSV(readFileSync(config.csv, 'utf8'))).posts : [];

test('post-model: platform slugs', () => {
  assert.equal(platformSlug('Instagram'), 'instagram');
  assert.equal(platformSlug('X'), 'x');
});

test('post-model: every post has at least one platform variant', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  for (const p of posts) {
    assert.ok(Array.isArray(p.platformVariants));
    assert.ok(p.platformVariants.length >= 1);
  }
});

test('post-model: multi-platform rows get one variant per platform', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  const p = posts.find((x) => x.id === 'r03-p01-history-of-dealbook');
  assert.equal(p.platformVariants.length, 2);
  assert.deepEqual(
    p.platformVariants.map((v) => v.platform),
    ['instagram', 'x'],
  );
  assert.equal(p.platformVariants[0].format, 'carousel');
  assert.equal(p.platformVariants[0].status, 'in_review');
});

test('post-model: dataset post nests dealbook fields under extensions', { skip: !hasCsv && 'calendar CSV not found' }, () => {
  const p = posts[0];
  const d = toDatasetPost(p);
  assert.equal(d.id, p.id);
  assert.ok(d.platformVariants.length);
  assert.equal(d.extensions.row, p.row);
  assert.equal(d.extensions.stage, p.stage);
  assert.ok(!('row' in d));
});

test('post-model: buildPlatformVariants defaults when platforms empty', () => {
  const variants = buildPlatformVariants({
    formatKind: 'video',
    stage: 'Idea',
    creative: { raw: 'Hello' },
    sizes: [{ width: 1080, height: 1920 }],
    platforms: [],
  });
  assert.equal(variants.length, 1);
  assert.equal(variants[0].platform, 'unspecified');
  assert.equal(variants[0].status, 'draft');
});
