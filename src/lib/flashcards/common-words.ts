// Top common English words by POS, used as last-resort distractor fallback
// when the user's vocab is too small.
// Source: COCA top 5000 + manual curation. ~40-50 words per POS.

type POSKey = 'noun' | 'verb' | 'adj' | 'adv';

export const COMMON_WORDS_BY_POS: Record<POSKey, string[]> = {
  noun: [
    'time', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life',
    'child', 'world', 'school', 'state', 'family', 'student', 'group',
    'country', 'problem', 'hand', 'part', 'place', 'case', 'week',
    'company', 'system', 'program', 'question', 'work', 'government',
    'number', 'night', 'point', 'home', 'water', 'room', 'mother',
    'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study',
    'book', 'eye', 'job', 'word', 'business', 'issue', 'side',
  ],
  verb: [
    'have', 'do', 'say', 'go', 'get', 'make', 'know', 'think', 'take',
    'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell', 'work',
    'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put',
    'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn',
    'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
    'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
  ],
  adj: [
    'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
    'other', 'old', 'right', 'big', 'high', 'different', 'small',
    'large', 'next', 'early', 'young', 'important', 'few', 'public',
    'bad', 'same', 'able', 'free', 'sure', 'real', 'best', 'easy',
    'low', 'true', 'hard', 'major', 'open', 'late', 'happy', 'simple',
    'common', 'special', 'clear', 'fine', 'dark', 'social',
  ],
  adv: [
    'up', 'so', 'out', 'just', 'now', 'how', 'then', 'more', 'also',
    'here', 'well', 'only', 'very', 'even', 'back', 'there', 'down',
    'still', 'too', 'when', 'never', 'really', 'most', 'always',
    'often', 'quickly', 'finally', 'together', 'almost', 'though',
    'enough', 'today', 'around', 'far', 'ever', 'quite',
  ],
};

// Aliases for POS variants the cards might use. The local DB currently stores
// 'verb' / 'noun' / 'adjective' / 'proper noun' (verified via wrangler), plus
// Datamuse-style abbreviations (n, v, adj, adv, a, r) may appear via the
// generate pipeline. Unknown POS falls through to the union pool.
export const POS_ALIASES: Record<string, POSKey> = {
  n: 'noun',
  noun: 'noun',
  'proper noun': 'noun',
  v: 'verb',
  verb: 'verb',
  'transitive verb': 'verb',
  'intransitive verb': 'verb',
  adj: 'adj',
  adjective: 'adj',
  a: 'adj',
  adv: 'adv',
  adverb: 'adv',
  r: 'adv',
};

export function getFallbackPool(pos?: string | null): string[] {
  if (!pos) {
    return Object.values(COMMON_WORDS_BY_POS).flat();
  }
  const key = POS_ALIASES[pos.toLowerCase()];
  return key ? COMMON_WORDS_BY_POS[key] : Object.values(COMMON_WORDS_BY_POS).flat();
}
