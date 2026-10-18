/**
 * Speakers referenced in the content calendar, with the spellings the sheet and source filenames use.
 * `strong` aliases are matched anywhere in a post (including column J transcripts);
 * `weak` aliases only in the post's title fields, because they also appear incidentally in transcripts.
 */
export const SPEAKERS = [
  { name: 'Andrew Ross Sorkin', strong: ['andrew ross sorkin'], weak: ['sorkin', 'andrew video'] },
  { name: 'Elon Musk', strong: ['elon musk', 'elon', 'musk'] },
  { name: 'Jensen Huang', strong: ['jensen huang', 'jensen wong', 'jensen', 'huang'] },
  { name: 'Serena Williams', strong: ['serena williams', 'serena'] },
  { name: 'Kellyanne Conway', strong: ['kellyanne conway', 'kellyanne'] },
  { name: 'Mary Barra', strong: ['mary barra', 'gm ceo'] },
  { name: 'Carmen Ambar', strong: ['carmen ambar', 'carmen'] },
  { name: 'Charlie Kirk', strong: ['charlie kirk'] },
  { name: 'Erika Kirk', strong: ['erika kirk', 'erika'] },
  { name: 'Emma Walmsley', strong: ['emma walmsley'] },
  { name: 'Alex Chriss', strong: ['alex chriss'] },
  { name: 'Bob Jordan', strong: ['bob jordan'] },
  { name: 'Jeff Bezos', strong: ['jeff bezos', 'bezos'] },
  { name: 'Halle Berry', strong: ['halle berry', 'halle'] },
  { name: 'David Ricks', strong: ['david ricks', 'eli lilly'] },
  { name: 'Alex Karp', strong: ['alex karp', 'palantir', 'karp'] },
  { name: 'Sam Altman', strong: ['sam altman', 'altman'] },
  { name: 'Benjamin Netanyahu', strong: ['benjamin netanyahu', 'netanyahu'] },
  { name: 'Shou Chew', strong: ['shou chew', "tiktok's ceo", 'tiktok ceo', 'chew.mp4'] },
  { name: 'Alex Cooper', strong: ['alex cooper'] },
  { name: 'Sims Brown', strong: ['sims brown'] },
  { name: 'Reed Hastings', strong: ['reed hastings'] },
  { name: 'Reshma Saujani', strong: ['reshma saujani', 'reshma'] },
  { name: 'Katie Couric', strong: ['katie couric'] },
  { name: 'Van Jones', strong: ['van jones'] },
  { name: 'Jerome Powell', strong: ['jerome powell'] },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliasRe = (alias) => new RegExp(`(?<![a-z])${escapeRe(alias)}(?![a-z])`, 'i');

/** Speaker names mentioned in a post, in calendar order of importance (title first). */
export function detectSpeakers({ title = '', body = '' }) {
  const found = [];
  const titleHits = [];
  for (const sp of SPEAKERS) {
    const strong = sp.strong.map(aliasRe);
    const weak = (sp.weak || []).map(aliasRe);
    const inTitle = [...strong, ...weak].some((re) => re.test(title));
    const inBody = strong.some((re) => re.test(body));
    if (inTitle) titleHits.push(sp.name);
    else if (inBody) found.push(sp.name);
  }
  return [...titleHits, ...found];
}

/** "Elon_Musk" -> "Elon Musk"; maps known aliases to canonical names. */
export function speakerFromFolder(folder) {
  if (!folder) return null;
  const name = folder.replace(/[_-]+/g, ' ').trim();
  const lower = name.toLowerCase();
  const known = SPEAKERS.find((sp) => sp.name.toLowerCase() === lower || sp.strong.includes(lower));
  return known ? known.name : name;
}

export const speakerKey = (name) => String(name || '').toLowerCase().replace(/[^a-z]+/g, '');
