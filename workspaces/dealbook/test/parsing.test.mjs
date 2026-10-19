import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../lib/csv.mjs';
import { parseTimecode, timecodeToUnits, formatTimecode, findTimecodes, rangesOverlap } from '../lib/timecode.mjs';
import { parseSourceText } from '../lib/parse-source.mjs';
import { parseClipName } from '../lib/scan.mjs';
import { detectSpeakers } from '../lib/speakers.mjs';

test('parseCSV handles quoted commas, escaped quotes, multi-line cells, BOM and CRLF', () => {
  const text = '\ufeffa,b,c\r\n"x, y","he said ""hi""","line 1\nline 2"\r\n,,\r\n';
  assert.deepEqual(parseCSV(text), [
    ['a', 'b', 'c'],
    ['x, y', 'he said "hi"', 'line 1\nline 2'],
    ['', '', ''],
  ]);
});

test('parseCSV keeps a trailing row without a newline', () => {
  assert.deepEqual(parseCSV('a,b\n1,2'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('timecodes parse with and without frames, including dashed clip-name form', () => {
  assert.deepEqual(parseTimecode('00:04:55:22'), { h: 0, m: 4, s: 55, f: 22, hasFrames: true });
  assert.deepEqual(parseTimecode('00-04-55-22'), parseTimecode('00:04:55:22'));
  assert.equal(parseTimecode('11:03:52;22').f, 22);
  assert.equal(formatTimecode(parseTimecode('1:02:03')), '01:02:03');
  assert.equal(parseTimecode('no timecode'), null);
  assert.equal(timecodeToUnits('00:00:01:00'), 60);
  assert.ok(timecodeToUnits('00:05:17:09') > timecodeToUnits('00:04:55:22'));
});

test('findTimecodes ignores clock times and ratios without an hours field', () => {
  const found = findTimecodes('Ratio 4:5, at 9:30 then 00:24:01:01 and 00:24:49:17.');
  assert.deepEqual(
    found.map((t) => t.raw),
    ['00:24:01:01', '00:24:49:17'],
  );
});

test('rangesOverlap is inclusive', () => {
  assert.ok(rangesOverlap({ start: 0, end: 10 }, { start: 10, end: 20 }));
  assert.ok(!rangesOverlap({ start: 0, end: 9 }, { start: 10, end: 20 }));
});

test('parseSourceText extracts stills with paths, notes, video ranges and quotes', () => {
  const j = [
    'Still: 12 Dealbook 2023 / 1 Photography / NYT / Selects / Main Stage / _DSC4412.jpg',
    'Backup still: 12 Dealbook 2023 / 1 Photography / BTS / _DSC4309.jpg (crop out andrew)',
    'Video: Dealbook Summit / 2023 / Live stream recordings / Elon Musk.mp4',
    '00:04:55:22 "I have no problem being hated"',
    '00:05:17:09 end of quote',
    'Mimir: https://us.mjoll.no/shares/abc123',
  ].join('\n');
  const s = parseSourceText(j);
  assert.deepEqual(
    s.stills.map((x) => [x.filename, x.year]),
    [
      ['_DSC4412.jpg', 2023],
      ['_DSC4309.jpg', 2023],
    ],
  );
  assert.equal(s.stills[0].path, '12 Dealbook 2023 / 1 Photography / NYT / Selects / Main Stage / _DSC4412.jpg');
  assert.equal(s.stills[1].note, '(crop out andrew)');
  assert.equal(s.videos.length, 1);
  assert.equal(s.videos[0].filename, 'Elon Musk.mp4');
  assert.deepEqual([s.videos[0].range.start, s.videos[0].range.end], ['00:04:55:22', '00:05:17:09']);
  assert.equal(s.videos[0].marks[0].text, '"I have no problem being hated"');
  assert.deepEqual(s.links, [{ url: 'https://us.mjoll.no/shares/abc123', kind: 'mimir' }]);
  assert.deepEqual(s.flags, []);
});

test('parseSourceText merges repeated timecodes, keeping the fullest quote', () => {
  const s = parseSourceText('Clip: 2024 / talk.mov\n00:01:00:00 short\nFor editor: 00:01:00:00 the much longer quote');
  assert.equal(s.videos[0].marks.length, 1);
  assert.equal(s.videos[0].marks[0].text, 'the much longer quote');
});

test('parseSourceText keeps paths whose folders contain " - " and flags gaps', () => {
  const s = parseSourceText('Title Slide - Photography/Delgado - Selects/IMG_1.jpg\nVideo: 2025 / keynote.mp4\nStill NEEDED');
  assert.equal(s.stills[0].path, 'Photography / Delgado - Selects / IMG_1.jpg');
  assert.ok(s.flags.includes('Still image needed'));
  assert.ok(s.flags.includes('Timecodes needed'));
  assert.equal(s.videos[0].range, null);
});

test('parseClipName reads speaker, year, range and proxy suffix', () => {
  const c = parseClipName('Serena_Williams_2024_11-03-52-22_to_11-04-21-56-proxy.mp4');
  assert.equal(c.speaker, 'Serena Williams');
  assert.equal(c.year, 2024);
  assert.equal(c.start, '11:03:52:22');
  assert.equal(c.proxy, true);
  assert.equal(parseClipName('_DSC4412.jpg'), null);
});

test('describeAsset reads post folders and leaves speaker to the clip name', async () => {
  const { describeAsset } = await import('../lib/scan.mjs');
  const st = { size: 1, mtimeMs: 0 };
  const still = describeAsset('/m', '/m/Post 9 - Charlie Kirk/A9I05677.JPG', st);
  assert.deepEqual([still.post, still.speaker, still.year, still.role], [{ number: 9, label: 'Charlie Kirk' }, null, null, 'source']);
  const clip = describeAsset('/m', '/m/Post 9 - Charlie Kirk/Andrew_Ross_Sorkin_2025_16-58-47_to_16-59-12-proxy.mp4', st);
  assert.deepEqual([clip.speaker, clip.year], ['Andrew Ross Sorkin', 2025]);
  const legacy = describeAsset('/m', '/m/2023/Elon_Musk/_DSC4412.jpg', st);
  assert.deepEqual([legacy.post, legacy.speaker, legacy.year], [null, 'Elon Musk', 2023]);
});

test('detectSpeakers prefers title matches and avoids false positives', () => {
  assert.deepEqual(detectSpeakers({ title: 'Elon/Bezos Space Race', body: '' }), ['Elon Musk', 'Jeff Bezos']);
  assert.ok(!detectSpeakers({ title: 'TikTok and kids', body: 'TikTok trends' }).includes('Shou Chew'));
});
