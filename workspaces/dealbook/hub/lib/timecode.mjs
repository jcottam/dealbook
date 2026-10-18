// HH:MM:SS with optional :FF / ;FF frames. Requires an hours field so "4:45 a.m." style times don't match.
export const TIMECODE_RE = /(?<![\d:])(\d{1,2}):(\d{2}):(\d{2})(?:[:;](\d{2}))?(?![\d:])/g;

export function parseTimecode(str) {
  const m = new RegExp(TIMECODE_RE.source).exec(String(str).replace(/-/g, ':'));
  if (!m) return null;
  return {
    h: +m[1],
    m: +m[2],
    s: +m[3],
    f: m[4] == null ? 0 : +m[4],
    hasFrames: m[4] != null,
  };
}

/** Frames on a nominal 60 fps grid, so timecodes from 24/30/60 fps sources compare consistently enough for overlap checks. */
export function timecodeToUnits(str) {
  const tc = typeof str === 'string' ? parseTimecode(str) : str;
  if (!tc) return null;
  return ((tc.h * 60 + tc.m) * 60 + tc.s) * 60 + Math.min(tc.f, 59);
}

export function formatTimecode(tc) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(tc.h)}:${p(tc.m)}:${p(tc.s)}${tc.hasFrames ? ':' + p(tc.f) : ''}`;
}

/** Every timecode in a block of text, with its character offset. */
export function findTimecodes(text) {
  const out = [];
  for (const m of String(text).matchAll(TIMECODE_RE)) {
    const tc = { h: +m[1], m: +m[2], s: +m[3], f: m[4] == null ? 0 : +m[4], hasFrames: m[4] != null };
    if (tc.m > 59 || tc.s > 59) continue;
    out.push({ index: m.index, raw: m[0], tc: formatTimecode(tc), units: timecodeToUnits(tc) });
  }
  return out;
}

export function rangesOverlap(a, b) {
  return a.start <= b.end && a.end >= b.start;
}
