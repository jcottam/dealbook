import { existsSync } from 'node:fs';
import { matchAssets } from './match.mjs';
import { scanMedia } from './scan.mjs';
import { detectSpeakers, speakerKey } from './speakers.mjs';

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

function inferFromPost(asset, post) {
  if ((asset.speaker && asset.year) || !post) return {};
  const ref = [...post.source.stills, ...post.source.videos].find(
    (r) => r.filename.toLowerCase() === asset.filename.toLowerCase(),
  );
  const named = ref ? detectSpeakers({ title: ref.path }).find((s) => post.speakers.includes(s)) : null;
  return {
    speaker: asset.speaker || named || (post.speakers.length === 1 ? post.speakers[0] : null),
    year: asset.year || ref?.year || null,
  };
}

/**
 * Build the in-memory hub snapshot used by the local server and static export.
 * @param {{ postsDoc: object, research: object, assetMap?: object, mediaRoot?: string | null, serveMedia?: boolean }} opts
 */
export function buildHubState({ postsDoc, research, assetMap = {}, mediaRoot = null, serveMedia = true }) {
  const rawAssets = mediaRoot && existsSync(mediaRoot) ? scanMedia(mediaRoot) : [];
  const { posts: links, assetPosts } = matchAssets(postsDoc.posts, rawAssets, assetMap);
  const titles = new Map(postsDoc.posts.map((p) => [p.id, p.title]));
  const postById = new Map(postsDoc.posts.map((p) => [p.id, p]));

  const assets = rawAssets.map((a) => ({
    ...a,
    ...inferFromPost(a, postById.get((assetPosts.get(a.path) || [])[0])),
    ...(serveMedia
      ? { url: `/media/${encodePath(a.path)}`, thumb: `/thumbs/${encodePath(a.path)}.jpg` }
      : { url: null, thumb: null }),
    posts: (assetPosts.get(a.path) || []).map((id) => ({ id, title: titles.get(id) })),
  }));
  const assetByPath = new Map(assets.map((a) => [a.path, a]));
  const researchBySpeaker = new Map(research.speakers.map((s) => [speakerKey(s.name), s.id]));

  const posts = postsDoc.posts.map((p) => {
    const l = links.get(p.id);
    const linked = l.assets.map((x) => ({ ...x, asset: assetByPath.get(x.path) }));
    const cover =
      linked.find((x) => x.role === 'finished' && x.asset?.type === 'image') ||
      linked.find((x) => x.asset?.type === 'image') ||
      linked.find((x) => x.asset?.type === 'video');
    return {
      ...p,
      links: { ...l, assets: linked },
      thumb: cover?.asset?.thumb ?? null,
      hasVideo: linked.some((x) => x.asset?.type === 'video'),
      research: p.speakers.map((s) => researchBySpeaker.get(speakerKey(s))).filter(Boolean),
      counts: { assets: linked.length, missing: l.missing.length + l.broken.length, outstanding: l.outstanding.length },
    };
  });

  return {
    generatedAt: postsDoc.generatedAt,
    source: postsDoc.source,
    throughline: postsDoc.throughline,
    posts,
    assets,
    research,
    scannedAt: new Date().toISOString(),
  };
}
