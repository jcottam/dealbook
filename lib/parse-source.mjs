import { findTimecodes } from './timecode.mjs';

const URL_RE = /https?:\/\/[^\s)"'<>]+/g;
const IMAGE_RE = /[\w.\-()]+\.(?:jpe?g|png|webp|tiff?|heic)\b/gi;
const VIDEO_EXT_RE = /\.(?:mp4|mov|mxf|m4v|webm)\b/i;

const FLAG_RULES = [
  { re: /\bNEEDED\b/, label: 'Still image needed' },
  { re: /\bTBD\b/i, label: 'Asset to be determined (TBD)' },
  { re: /need(?:s|ed)?\s+(?:the\s+)?time\s*(?:stamp|code)s?/i, label: 'Timecodes needed' },
  { re: /screen\s*grab|clip from video|no still images/i, label: 'Still must be grabbed from video' },
];

/** "a / b /c" -> "a / b / c" */
export function normalizePath(p) {
  return p
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ');
}

/** Strip a leading label such as "Still:" or "Backup still: sorkin/Erika on stage:" from a path-bearing line. */
function stripLabel(text) {
  const parts = text.replace(URL_RE, ' ').split(/:\s+/);
  // "Title Slide - Photography/..." : drop a dash-separated label only if it isn't itself part of the path.
  return parts[parts.length - 1].replace(/^[^/]+?\s[-–]\s+(?=\S)/, '').trim();
}

function linkKind(url) {
  if (/mjoll\.no\/shares\//.test(url)) return 'mimir';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/dropbox\.com/.test(url)) return 'dropbox';
  if (/frame\.io/.test(url)) return 'frameio';
  return 'web';
}

function yearOf(path) {
  const m = /\b(20\d\d)\b/.exec(path);
  return m ? +m[1] : null;
}

/**
 * Parse an editorial source cell (column J) into structured references.
 * The raw text is always preserved separately by the caller.
 */
export function parseSourceText(raw) {
  const text = String(raw || '');
  const lines = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    lines.push({ text: line, start: offset });
    offset += line.length + 1;
  }

  const links = [...new Set(text.match(URL_RE) || [])].map((url) => ({
    url: url.replace(/[.,;]+$/, ''),
    kind: linkKind(url),
  }));

  const stills = [];
  const seenStills = new Set();
  const videos = [];

  for (const { text: line, start } of lines) {
    const noUrls = line.replace(URL_RE, (u) => ' '.repeat(u.length));

    for (const m of noUrls.matchAll(IMAGE_RE)) {
      const filename = m[0];
      const key = filename.toLowerCase();
      if (seenStills.has(key)) continue;
      seenStills.add(key);
      const before = noUrls.slice(0, m.index + filename.length);
      const path = normalizePath(stripLabel(before));
      const note = line.slice(m.index + filename.length).replace(/^[\s.]+/, '').trim();
      stills.push({ filename, path, year: yearOf(path), note: note || null });
    }

    const vm = VIDEO_EXT_RE.exec(noUrls);
    if (vm) {
      const before = noUrls.slice(0, vm.index + vm[0].length);
      const path = normalizePath(stripLabel(before));
      const filename = path.split(' / ').pop();
      videos.push({
        filename,
        path,
        year: yearOf(path),
        index: start,
        marks: [],
        range: null,
      });
    }
  }

  // Attach each timecode (and the quote text that follows it) to the nearest preceding video reference.
  const timecodes = findTimecodes(text);
  const unattached = [];
  timecodes.forEach((t, i) => {
    const nextIndex = i + 1 < timecodes.length ? timecodes[i + 1].index : text.length;
    const snippet = text
      .slice(t.index + t.raw.length, nextIndex)
      .split('\n')[0]
      .replace(/\s+/g, ' ')
      .replace(/^[\s.;,–-]+/, '')
      .trim();
    const mark = { tc: t.tc, units: t.units, text: snippet };
    const owner = [...videos].reverse().find((v) => v.index <= t.index);
    (owner ? owner.marks : unattached).push(mark);
  });

  for (const v of videos) {
    // The same timecode is often repeated (e.g. once for the designer, once for the editor); keep the fullest quote.
    const byTc = new Map();
    for (const m of v.marks) {
      const prev = byTc.get(m.tc);
      if (!prev || m.text.length > prev.text.length) byTc.set(m.tc, m);
    }
    v.marks = [...byTc.values()].sort((a, b) => a.units - b.units);
    if (v.marks.length) {
      const units = v.marks.map((m) => m.units);
      const min = Math.min(...units);
      const max = Math.max(...units);
      v.range = {
        start: v.marks.find((m) => m.units === min).tc,
        end: v.marks.find((m) => m.units === max).tc,
        startUnits: min,
        endUnits: max,
      };
    }
    delete v.index;
  }

  const flags = FLAG_RULES.filter((r) => r.re.test(text)).map((r) => r.label);
  for (const v of videos) {
    if (!v.range && !flags.includes('Timecodes needed')) flags.push('Timecodes needed');
  }

  return { stills, videos, links, flags, marks: unattached };
}
