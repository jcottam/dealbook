import { speakerFromFolder } from './speakers.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

function decode(s) {
  return s
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1));
      return ENTITIES[e] ?? m;
    });
}

/** KaTeX mis-renders "$80K ... ~$2.1 trillion" as math; restore the original text from the TeX annotation. */
function unwrapKatex(html) {
  const open = '<span class="katex">';
  let out = '';
  let i = 0;
  for (;;) {
    const start = html.indexOf(open, i);
    if (start < 0) return out + html.slice(i);
    out += html.slice(i, start);
    const tagRe = /<\/?span\b[^>]*>/g;
    tagRe.lastIndex = start;
    let depth = 0;
    let end = html.length;
    for (let m; (m = tagRe.exec(html)); ) {
      depth += m[0][1] === '/' ? -1 : 1;
      if (depth === 0) {
        end = tagRe.lastIndex;
        break;
      }
    }
    const ann = /<annotation[^>]*>([\s\S]*?)<\/annotation>/.exec(html.slice(start, end));
    out += ann ? `$${ann[1]}$` : '';
    i = end;
  }
}

const text = (html) => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();

function section(html, heading) {
  const re = new RegExp(`<h3[^>]*>\\s*${heading}[\\s\\S]*?</h3>([\\s\\S]*?)(?=<h3|<h2|<hr|$)`, 'i');
  const m = re.exec(html);
  return m ? m[1] : '';
}

const listItems = (html) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

/**
 * Parse the speaker one-pagers HTML into one entry per speaker.
 * Structure: <h2>Name, Title</h2>, a metadata <p>, "In one line", then h3 sections.
 */
export function parseOnePagers(rawHtml) {
  const html = unwrapKatex(rawHtml);
  const introMatch = /<h1[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/.exec(html);
  const intro = introMatch ? text(introMatch[1]) : null;

  const blocks = html.split(/<h2[^>]*>/).slice(1);
  const speakers = blocks.map((block) => {
    const heading = text(block.slice(0, block.indexOf('</h2>')));
    const [name, ...titleParts] = heading.split(',');
    const body = block.slice(block.indexOf('</h2>') + 5);
    const paras = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
    const metaText = paras[0] || '';
    const field = (label) => {
      const m = new RegExp(`${label}:\\s*([^·\\n]+)`, 'i').exec(metaText);
      return m ? m[1].trim() : null;
    };
    const oneLine = (paras.find((p) => /^In one line:/i.test(p)) || '').replace(/^In one line:\s*/i, '') || null;

    const topics = [...section(body, 'Topics at a glance').matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)].map(
      (m) => ({ time: text(m[1]), topic: text(m[2]) }),
    );

    const moments = listItems(section(body, 'Clip-worthy moments')).map((li) => {
      const m = /^\s*<strong>([\s\S]*?)<\/strong>([\s\S]*)$/.exec(li);
      const tagMatch = m && /^\s*<em>\(([^)]+)\)<\/em>/.exec(m[2]);
      const rest = m ? (tagMatch ? m[2].slice(tagMatch[0].length) : m[2]) : li;
      return { time: m ? text(m[1]) : null, tag: tagMatch ? tagMatch[1] : null, text: text(rest) };
    });

    const postIdeas = listItems(section(body, 'Post ideas')).map((li) => {
      const t = text(li);
      const tm = /\((\d{1,2}:\d{2}(?:[–-]\d{1,2}:\d{2})?)\)\s*$/.exec(t);
      return { time: tm ? tm[1] : null, text: tm ? t.slice(0, tm.index).trim() : t };
    });

    const displayName = name.trim();
    return {
      id: displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: speakerFromFolder(displayName),
      title: titleParts.join(',').trim() || null,
      summit: field('Summit'),
      interviewer: field('Interviewer'),
      length: field('Length'),
      audio: field('Audio'),
      video: field('Video'),
      oneLine,
      topics,
      moments,
      postIdeas,
    };
  });

  return { intro, speakers };
}
