import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAssets } from '../lib/match.mjs';
import { parseSourceText } from '../lib/parse-source.mjs';
import { parseClipName } from '../lib/scan.mjs';

const still = (path, extra = {}) => ({ path, filename: path.split('/').pop(), type: 'image', role: 'source', clip: null, speaker: null, ...extra });
const clip = (path) => {
  const filename = path.split('/').pop();
  const c = parseClipName(filename);
  return { path, filename, type: 'video', role: 'source', clip: c, speaker: c.speaker };
};

const post = (id, speakers, j) => ({ id, speakers, source: parseSourceText(j) });

test('matches stills by filename and clips by speaker, year and overlapping timecode', () => {
  const posts = [
    post(
      'p1',
      ['Elon Musk'],
      'Still: 2023 / Selects / _DSC4412.jpg\nStill: 2023 / Selects / _MISSING.jpg\nVideo: 2023 / Elon.mp4\n00:04:57:00 quote\n00:05:10:00 end',
    ),
    post('p2', ['Jensen Huang'], 'Video: 2023 / Jensen.mp4\n00:04:57:00 same range, different speaker'),
  ];
  const assets = [
    still('2023/Elon_Musk/_DSC4412.jpg'),
    clip('2023/Elon_Musk/Elon_Musk_2023_00-04-55-22_to_00-05-17-09.mp4'),
    clip('2022/Elon_Musk/Elon_Musk_2022_00-04-55-22_to_00-05-17-09.mp4'),
  ];
  const { posts: links, assetPosts } = matchAssets(posts, assets);

  const p1 = links.get('p1');
  assert.deepEqual(
    p1.assets.map((a) => [a.path, a.via]),
    [
      ['2023/Elon_Musk/_DSC4412.jpg', 'filename'],
      ['2023/Elon_Musk/Elon_Musk_2023_00-04-55-22_to_00-05-17-09.mp4', 'timecode'],
    ],
  );
  assert.deepEqual(
    p1.missing.map((m) => [m.kind, m.filename]),
    [['still', '_MISSING.jpg']],
  );

  const p2 = links.get('p2');
  assert.equal(p2.assets.length, 0, 'clip for another speaker must not match');
  assert.equal(p2.missing[0].kind, 'clip');
  assert.equal(p2.missing[0].range.start, '00:04:57:00');

  assert.deepEqual(assetPosts.get('2023/Elon_Musk/_DSC4412.jpg'), ['p1']);
});

test('asset-map entries link finished creative and report broken paths', () => {
  const posts = [post('p1', [], 'Concept only, no media yet')];
  const assets = [still('_finished/p1_final.jpg', { role: 'finished' })];
  const { posts: links } = matchAssets(posts, assets, {
    p1: [{ path: '_finished/p1_final.jpg', role: 'finished', note: 'v3' }, 'gone/old.jpg'],
  });
  const p1 = links.get('p1');
  assert.deepEqual(p1.assets, [{ path: '_finished/p1_final.jpg', role: 'finished', via: 'asset-map', ref: null, note: 'v3' }]);
  assert.deepEqual(p1.broken, [{ path: 'gone/old.jpg', note: null }]);
});

test('files in a "Post N - …" folder link to post N without any column J reference', () => {
  const posts = [{ id: 'p7', postNumber: '07', speakers: [], source: parseSourceText('') }, { id: 'p8', postNumber: '08', speakers: [], source: parseSourceText('') }];
  const assets = [
    { ...still('Post 7 - Mary Barra/grab.jpg'), post: { number: 7, label: 'Mary Barra' } },
    { ...still('Post 7 - Mary Barra/_finished/final.mp4', { role: 'finished' }), post: { number: 7, label: 'Mary Barra' } },
  ];
  const { posts: links } = matchAssets(posts, assets);
  assert.deepEqual(
    links.get('p7').assets.map((a) => [a.path, a.via, a.role]),
    [
      ['Post 7 - Mary Barra/grab.jpg', 'folder', 'source'],
      ['Post 7 - Mary Barra/_finished/final.mp4', 'folder', 'finished'],
    ],
  );
  assert.equal(links.get('p8').assets.length, 0);
});

test('videos without timecodes are reported as outstanding, not matched', () => {
  const posts = [post('p1', ['Elon Musk'], 'Video: 2023 / Elon.mp4 (need timestamps)')];
  const assets = [clip('2023/Elon_Musk/Elon_Musk_2023_00-04-55-22_to_00-05-17-09.mp4')];
  const p1 = matchAssets(posts, assets).posts.get('p1');
  assert.equal(p1.assets.length, 0);
  assert.equal(p1.missing[0].range, null);
  assert.ok(p1.outstanding.includes('Timecodes needed'));
});
