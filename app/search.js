const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

const tokens = (q) => norm(q).split(/\s+/).filter(Boolean);

const postIndex = new WeakMap();
const assetIndex = new WeakMap();

function postText(p) {
  if (!postIndex.has(p)) {
    postIndex.set(
      p,
      norm(
        [
          p.title,
          p.concept,
          p.storyline,
          p.postNumber && `post ${p.postNumber}`,
          p.format,
          p.stage,
          p.team,
          p.speakers.join(' '),
          p.source.raw,
          p.creative.raw,
          p.editInstructions,
          p.notes,
          ...p.source.stills.map((s) => s.path),
          ...p.source.videos.map((v) => v.path),
          ...p.links.assets.map((l) => l.asset.path),
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    );
  }
  return postIndex.get(p);
}

function assetText(a) {
  if (!assetIndex.has(a)) {
    assetIndex.set(a, norm([a.path, a.speaker, a.year, a.type, a.role, ...(a.posts || []).map((p) => p.title)].join('\n')));
  }
  return assetIndex.get(a);
}

/** All query words must appear somewhere in the post (title, speakers, quotes in J/K, filenames). */
export function matchPost(p, q) {
  const t = tokens(q);
  if (!t.length) return true;
  const hay = postText(p);
  return t.every((w) => hay.includes(w));
}

export function matchAsset(a, q) {
  const t = tokens(q);
  if (!t.length) return true;
  const hay = assetText(a);
  return t.every((w) => hay.includes(w));
}
