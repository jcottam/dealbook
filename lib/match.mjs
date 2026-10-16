import { speakerKey } from './speakers.mjs';
import { rangesOverlap } from './timecode.mjs';

/**
 * Link posts to local assets and report what's missing. Pure function: inputs are plain data.
 *
 * Order of precedence per post:
 *   1. explicit entries in asset-map.json
 *   2. exact (case-insensitive) filename match for each still referenced in column J
 *   3. clips named Speaker_Year_TCstart_to_TCend whose range overlaps a column J video reference
 *   4. anything else filed under a "Post N - …" folder for that post number
 *
 * Returns { posts: Map<postId, links>, assetPosts: Map<assetPath, postId[]> }.
 */
export function matchAssets(posts, assets, assetMap = {}) {
  const byPath = new Map(assets.map((a) => [a.path, a]));
  const byFilename = new Map();
  for (const a of assets) {
    const k = a.filename.toLowerCase();
    if (!byFilename.has(k)) byFilename.set(k, []);
    byFilename.get(k).push(a);
  }
  const clips = assets.filter((a) => a.clip);
  const byPostNumber = new Map();
  for (const a of assets) {
    if (!a.post) continue;
    if (!byPostNumber.has(a.post.number)) byPostNumber.set(a.post.number, []);
    byPostNumber.get(a.post.number).push(a);
  }

  const result = new Map();
  const assetPosts = new Map();
  const link = (postId, links, asset, extra) => {
    if (links.assets.some((l) => l.path === asset.path)) return;
    links.assets.push({ path: asset.path, role: extra.role || asset.role, via: extra.via, ref: extra.ref ?? null, note: extra.note ?? null });
    if (!assetPosts.has(asset.path)) assetPosts.set(asset.path, []);
    assetPosts.get(asset.path).push(postId);
  };

  for (const post of posts) {
    const links = { assets: [], missing: [], broken: [], outstanding: [...(post.source?.flags || [])] };
    const speakers = new Set((post.speakers || []).map(speakerKey));

    for (const entry of assetMap[post.id] || []) {
      const e = typeof entry === 'string' ? { path: entry } : entry;
      const asset = byPath.get(e.path);
      if (asset) link(post.id, links, asset, { via: 'asset-map', role: e.role, note: e.note });
      else links.broken.push({ path: e.path, note: e.note ?? null });
    }

    for (const still of post.source?.stills || []) {
      const hits = byFilename.get(still.filename.toLowerCase()) || [];
      if (hits.length) hits.forEach((a) => link(post.id, links, a, { via: 'filename', ref: still.filename, note: still.note }));
      else links.missing.push({ kind: 'still', filename: still.filename, expectedPath: still.path, note: still.note });
    }

    for (const video of post.source?.videos || []) {
      if (!video.range) {
        links.missing.push({ kind: 'clip', filename: video.filename, expectedPath: video.path, range: null, note: 'Needs timecodes before it can be clipped' });
        continue;
      }
      const ref = { start: video.range.startUnits, end: video.range.endUnits };
      const hits = clips.filter(
        (a) =>
          (speakers.has(speakerKey(a.clip.speaker)) || speakers.has(speakerKey(a.speaker))) &&
          (!video.year || !a.clip.year || video.year === a.clip.year) &&
          rangesOverlap({ start: a.clip.startUnits, end: a.clip.endUnits }, ref),
      );
      if (hits.length) hits.forEach((a) => link(post.id, links, a, { via: 'timecode', ref: video.filename }));
      else
        links.missing.push({
          kind: 'clip',
          filename: video.filename,
          expectedPath: video.path,
          range: { start: video.range.start, end: video.range.end },
          note: null,
        });
    }

    const number = Number.parseInt(post.postNumber, 10);
    for (const a of byPostNumber.get(number) || []) link(post.id, links, a, { via: 'folder' });

    result.set(post.id, links);
  }

  return { posts: result, assetPosts };
}
