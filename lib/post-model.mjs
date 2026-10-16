/** Canonical post shape (see schema/post.schema.json). */

export const SCHEMA_VERSION = '1.0.0';

const PLATFORM_ALIASES = {
  x: 'x',
  twitter: 'x',
  instagram: 'instagram',
  ig: 'instagram',
  linkedin: 'linkedin',
  facebook: 'facebook',
  fb: 'facebook',
  threads: 'threads',
  tiktok: 'tiktok',
  youtube: 'youtube',
};

export function platformSlug(name) {
  const key = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return PLATFORM_ALIASES[key] || key || 'unspecified';
}

export function normalizeStatus(stage, { uploaded = false, liveLink = null } = {}) {
  if (liveLink) return 'published';
  if (uploaded) return 'scheduled';
  const s = String(stage || '').toLowerCase();
  if (!s) return 'draft';
  if (/idea|concept/.test(s)) return 'draft';
  if (/review/.test(s)) return 'in_review';
  if (/ready|approv/.test(s)) return 'approved';
  return 'draft';
}

function primarySize(post, platform) {
  const sizes = post.sizes || [];
  const match = sizes.find((s) => s.label && platformSlug(s.label) === platform);
  return match || sizes.find((s) => !s.label) || sizes[0] || null;
}

export function mediaFromSource(source) {
  const items = [];
  let order = 0;
  for (const s of source?.stills || []) {
    items.push({
      kind: 'image',
      ref: s.path || s.filename,
      order: order++,
      altText: null,
    });
  }
  for (const v of source?.videos || []) {
    items.push({
      kind: 'video',
      ref: v.path || v.filename,
      order: order++,
      altText: null,
    });
  }
  return items;
}

/** Per-platform publish targets; shared copy/specs until overridden. */
export function buildPlatformVariants(post) {
  const labels = post.platforms?.length ? post.platforms : [null];
  const format = post.formatKind || 'unspecified';
  const caption = post.creative?.raw || null;
  const status = normalizeStatus(post.stage, post);
  const scheduledAt = post.date || null;
  const link = post.liveLink || null;

  return labels.map((label) => {
    const platform = label ? platformSlug(label) : 'unspecified';
    const size = primarySize(post, platform);
    return {
      platform,
      ...(label ? { label } : {}),
      format,
      status,
      caption,
      link,
      scheduledAt,
      publishedAt: link ? scheduledAt : null,
      specs: size ? { width: size.width, height: size.height } : null,
      media: [],
    };
  });
}

export function toDatasetPost(post) {
  const tags = [post.storyline, post.concept].filter(Boolean);
  const status = normalizeStatus(post.stage, post);
  const media = mediaFromSource(post.source);

  return {
    id: post.id,
    title: post.title,
    format: post.formatKind || 'unspecified',
    status,
    scheduledAt: post.date || null,
    publishedAt: post.liveLink ? post.date || null : null,
    caption: post.creative?.raw || null,
    tags: [...new Set(tags)],
    link: post.liveLink || null,
    notes: post.notes || null,
    media,
    platformVariants: post.platformVariants || buildPlatformVariants(post),
    extensions: {
      row: post.row,
      postNumber: post.postNumber,
      month: post.month,
      week: post.week,
      storyline: post.storyline,
      concept: post.concept,
      stage: post.stage,
      formatLabel: post.format,
      visualExample: post.visualExample,
      team: post.team,
      source: post.source,
      creative: post.creative,
      editInstructions: post.editInstructions,
      platforms: post.platforms,
      specs: post.specs,
      sizes: post.sizes,
      reviewLink: post.reviewLink,
      approvals: post.approvals,
      deliveryFolder: post.deliveryFolder,
      uploaded: post.uploaded,
      speakers: post.speakers,
    },
  };
}

export function buildDataset({ generatedAt, source, throughline, posts }) {
  return {
    $schema: './schema/post.schema.json',
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    source,
    campaign: throughline ? { throughline } : null,
    posts: posts.map(toDatasetPost),
  };
}
