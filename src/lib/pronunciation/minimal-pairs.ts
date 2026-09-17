/**
 * Minimal-pair sets for the "so sánh cặp từ" listening lesson. Each pair differs
 * by exactly ONE sound — the two sounds named by slugA / slugB (slugs from
 * `catalog.ts`). Curated around the contrasts Vietnamese learners find hardest.
 *
 * Used by the minimal-pair listening drill: the app speaks one word of a pair
 * and the learner picks which one they heard.
 */

export interface MinimalPair {
  a: string;
  b: string;
  aIpa: string;
  bIpa: string;
}

export interface MinimalPairSet {
  id: string;
  /** Human label, e.g. "ship / sheep — /ɪ/ vs /iː/". */
  label: string;
  /** Grouping for the "Tầng âm" hub. */
  category: 'vowel' | 'consonant' | 'final';
  /** The two contrasted sounds, as catalog slugs. */
  slugA: string;
  slugB: string;
  pairs: MinimalPair[];
}

export const MINIMAL_PAIR_SETS: MinimalPairSet[] = [
  {
    id: 'ih-ee',
    category: 'vowel',
    label: '/ɪ/ vs /iː/ — ngắn vs dài',
    slugA: 'ih',
    slugB: 'ee',
    pairs: [
      { a: 'ship', b: 'sheep', aIpa: '/ʃɪp/', bIpa: '/ʃiːp/' },
      { a: 'sit', b: 'seat', aIpa: '/sɪt/', bIpa: '/siːt/' },
      { a: 'bit', b: 'beat', aIpa: '/bɪt/', bIpa: '/biːt/' },
      { a: 'fit', b: 'feet', aIpa: '/fɪt/', bIpa: '/fiːt/' },
      { a: 'live', b: 'leave', aIpa: '/lɪv/', bIpa: '/liːv/' },
      { a: 'fill', b: 'feel', aIpa: '/fɪl/', bIpa: '/fiːl/' },
      { a: 'rich', b: 'reach', aIpa: '/rɪtʃ/', bIpa: '/riːtʃ/' },
      { a: 'chip', b: 'cheap', aIpa: '/tʃɪp/', bIpa: '/tʃiːp/' },
    ],
  },
  {
    id: 'ae-eh',
    category: 'vowel',
    label: '/æ/ vs /e/ — a bẹt vs e',
    slugA: 'ae',
    slugB: 'eh',
    pairs: [
      { a: 'bad', b: 'bed', aIpa: '/bæd/', bIpa: '/bed/' },
      { a: 'bat', b: 'bet', aIpa: '/bæt/', bIpa: '/bet/' },
      { a: 'sad', b: 'said', aIpa: '/sæd/', bIpa: '/sed/' },
      { a: 'man', b: 'men', aIpa: '/mæn/', bIpa: '/men/' },
      { a: 'had', b: 'head', aIpa: '/hæd/', bIpa: '/hed/' },
      { a: 'pan', b: 'pen', aIpa: '/pæn/', bIpa: '/pen/' },
      { a: 'land', b: 'lend', aIpa: '/lænd/', bIpa: '/lend/' },
      { a: 'sat', b: 'set', aIpa: '/sæt/', bIpa: '/set/' },
    ],
  },
  {
    id: 'uh-ae',
    category: 'vowel',
    label: '/ʌ/ vs /æ/ — ă vs a bẹt',
    slugA: 'uh',
    slugB: 'ae',
    pairs: [
      { a: 'cup', b: 'cap', aIpa: '/kʌp/', bIpa: '/kæp/' },
      { a: 'cut', b: 'cat', aIpa: '/kʌt/', bIpa: '/kæt/' },
      { a: 'bun', b: 'ban', aIpa: '/bʌn/', bIpa: '/bæn/' },
      { a: 'run', b: 'ran', aIpa: '/rʌn/', bIpa: '/ræn/' },
      { a: 'hut', b: 'hat', aIpa: '/hʌt/', bIpa: '/hæt/' },
      { a: 'much', b: 'match', aIpa: '/mʌtʃ/', bIpa: '/mætʃ/' },
      { a: 'fun', b: 'fan', aIpa: '/fʌn/', bIpa: '/fæn/' },
    ],
  },
  {
    id: 'oo-uu',
    category: 'vowel',
    label: '/uː/ vs /ʊ/ — u dài vs u ngắn',
    slugA: 'oo',
    slugB: 'uu',
    pairs: [
      { a: 'fool', b: 'full', aIpa: '/fuːl/', bIpa: '/fʊl/' },
      { a: 'pool', b: 'pull', aIpa: '/puːl/', bIpa: '/pʊl/' },
      { a: 'Luke', b: 'look', aIpa: '/luːk/', bIpa: '/lʊk/' },
      { a: 'suit', b: 'soot', aIpa: '/suːt/', bIpa: '/sʊt/' },
    ],
  },
  {
    id: 'th-t',
    category: 'consonant',
    label: '/θ/ vs /t/ — think vs tin',
    slugA: 'th',
    slugB: 't',
    pairs: [
      { a: 'thin', b: 'tin', aIpa: '/θɪn/', bIpa: '/tɪn/' },
      { a: 'thick', b: 'tick', aIpa: '/θɪk/', bIpa: '/tɪk/' },
      { a: 'three', b: 'tree', aIpa: '/θriː/', bIpa: '/triː/' },
      { a: 'thank', b: 'tank', aIpa: '/θæŋk/', bIpa: '/tæŋk/' },
      { a: 'thought', b: 'taught', aIpa: '/θɔːt/', bIpa: '/tɔːt/' },
      { a: 'bath', b: 'bat', aIpa: '/bɑːθ/', bIpa: '/bæt/' },
    ],
  },
  {
    id: 'th-s',
    category: 'consonant',
    label: '/θ/ vs /s/ — think vs sink',
    slugA: 'th',
    slugB: 's',
    pairs: [
      { a: 'think', b: 'sink', aIpa: '/θɪŋk/', bIpa: '/sɪŋk/' },
      { a: 'thick', b: 'sick', aIpa: '/θɪk/', bIpa: '/sɪk/' },
      { a: 'thing', b: 'sing', aIpa: '/θɪŋ/', bIpa: '/sɪŋ/' },
      { a: 'mouth', b: 'mouse', aIpa: '/maʊθ/', bIpa: '/maʊs/' },
      { a: 'path', b: 'pass', aIpa: '/pɑːθ/', bIpa: '/pɑːs/' },
      { a: 'thought', b: 'sought', aIpa: '/θɔːt/', bIpa: '/sɔːt/' },
    ],
  },
  {
    id: 'dh-d',
    category: 'consonant',
    label: '/ð/ vs /d/ — they vs day',
    slugA: 'dh',
    slugB: 'd',
    pairs: [
      { a: 'they', b: 'day', aIpa: '/ðeɪ/', bIpa: '/deɪ/' },
      { a: 'then', b: 'den', aIpa: '/ðen/', bIpa: '/den/' },
      { a: 'there', b: 'dare', aIpa: '/ðeə/', bIpa: '/deə/' },
      { a: 'though', b: 'dough', aIpa: '/ðəʊ/', bIpa: '/dəʊ/' },
    ],
  },
  {
    id: 'f-v',
    category: 'consonant',
    label: '/f/ vs /v/ — fan vs van',
    slugA: 'f',
    slugB: 'v',
    pairs: [
      { a: 'fan', b: 'van', aIpa: '/fæn/', bIpa: '/væn/' },
      { a: 'fine', b: 'vine', aIpa: '/faɪn/', bIpa: '/vaɪn/' },
      { a: 'few', b: 'view', aIpa: '/fjuː/', bIpa: '/vjuː/' },
      { a: 'leaf', b: 'leave', aIpa: '/liːf/', bIpa: '/liːv/' },
      { a: 'safe', b: 'save', aIpa: '/seɪf/', bIpa: '/seɪv/' },
      { a: 'ferry', b: 'very', aIpa: '/ˈferi/', bIpa: '/ˈveri/' },
    ],
  },
  {
    id: 'v-w',
    category: 'consonant',
    label: '/v/ vs /w/ — vine vs wine',
    slugA: 'v',
    slugB: 'w',
    pairs: [
      { a: 'vine', b: 'wine', aIpa: '/vaɪn/', bIpa: '/waɪn/' },
      { a: 'vet', b: 'wet', aIpa: '/vet/', bIpa: '/wet/' },
      { a: 'vest', b: 'west', aIpa: '/vest/', bIpa: '/west/' },
      { a: 'verse', b: 'worse', aIpa: '/vɜːs/', bIpa: '/wɜːs/' },
    ],
  },
  {
    id: 's-sh',
    category: 'consonant',
    label: '/s/ vs /ʃ/ — see vs she',
    slugA: 's',
    slugB: 'sh',
    pairs: [
      { a: 'see', b: 'she', aIpa: '/siː/', bIpa: '/ʃiː/' },
      { a: 'sip', b: 'ship', aIpa: '/sɪp/', bIpa: '/ʃɪp/' },
      { a: 'sell', b: 'shell', aIpa: '/sel/', bIpa: '/ʃel/' },
      { a: 'sign', b: 'shine', aIpa: '/saɪn/', bIpa: '/ʃaɪn/' },
      { a: 'sort', b: 'short', aIpa: '/sɔːt/', bIpa: '/ʃɔːt/' },
      { a: 'gas', b: 'gash', aIpa: '/ɡæs/', bIpa: '/ɡæʃ/' },
    ],
  },
  {
    id: 'ch-sh',
    category: 'consonant',
    label: '/tʃ/ vs /ʃ/ — chair vs share',
    slugA: 'ch',
    slugB: 'sh',
    pairs: [
      { a: 'chair', b: 'share', aIpa: '/tʃeə/', bIpa: '/ʃeə/' },
      { a: 'cheap', b: 'sheep', aIpa: '/tʃiːp/', bIpa: '/ʃiːp/' },
      { a: 'chin', b: 'shin', aIpa: '/tʃɪn/', bIpa: '/ʃɪn/' },
      { a: 'chip', b: 'ship', aIpa: '/tʃɪp/', bIpa: '/ʃɪp/' },
      { a: 'catch', b: 'cash', aIpa: '/kætʃ/', bIpa: '/kæʃ/' },
      { a: 'watch', b: 'wash', aIpa: '/wɒtʃ/', bIpa: '/wɒʃ/' },
    ],
  },
  {
    id: 'l-r',
    category: 'consonant',
    label: '/l/ vs /r/ — light vs right',
    slugA: 'l',
    slugB: 'r',
    pairs: [
      { a: 'light', b: 'right', aIpa: '/laɪt/', bIpa: '/raɪt/' },
      { a: 'lead', b: 'read', aIpa: '/liːd/', bIpa: '/riːd/' },
      { a: 'lock', b: 'rock', aIpa: '/lɒk/', bIpa: '/rɒk/' },
      { a: 'long', b: 'wrong', aIpa: '/lɒŋ/', bIpa: '/rɒŋ/' },
      { a: 'glass', b: 'grass', aIpa: '/ɡlɑːs/', bIpa: '/ɡrɑːs/' },
      { a: 'fly', b: 'fry', aIpa: '/flaɪ/', bIpa: '/fraɪ/' },
      { a: 'play', b: 'pray', aIpa: '/pleɪ/', bIpa: '/preɪ/' },
    ],
  },
  {
    id: 'final-s-z',
    label: 'Âm cuối /s/ vs /z/',
    category: 'final',
    slugA: 's',
    slugB: 'z',
    pairs: [
      { a: 'bus', b: 'buzz', aIpa: '/bʌs/', bIpa: '/bʌz/' },
      { a: 'price', b: 'prize', aIpa: '/praɪs/', bIpa: '/praɪz/' },
      { a: 'ice', b: 'eyes', aIpa: '/aɪs/', bIpa: '/aɪz/' },
      { a: 'peace', b: 'peas', aIpa: '/piːs/', bIpa: '/piːz/' },
      { a: 'loose', b: 'lose', aIpa: '/luːs/', bIpa: '/luːz/' },
    ],
  },
  {
    id: 'final-t-d',
    label: 'Âm cuối /t/ vs /d/',
    category: 'final',
    slugA: 't',
    slugB: 'd',
    pairs: [
      { a: 'bat', b: 'bad', aIpa: '/bæt/', bIpa: '/bæd/' },
      { a: 'seat', b: 'seed', aIpa: '/siːt/', bIpa: '/siːd/' },
      { a: 'coat', b: 'code', aIpa: '/kəʊt/', bIpa: '/kəʊd/' },
      { a: 'hat', b: 'had', aIpa: '/hæt/', bIpa: '/hæd/' },
      { a: 'cart', b: 'card', aIpa: '/kɑːt/', bIpa: '/kɑːd/' },
    ],
  },
  {
    id: 'final-k-g',
    label: 'Âm cuối /k/ vs /g/',
    category: 'final',
    slugA: 'k',
    slugB: 'g',
    pairs: [
      { a: 'back', b: 'bag', aIpa: '/bæk/', bIpa: '/bæɡ/' },
      { a: 'pick', b: 'pig', aIpa: '/pɪk/', bIpa: '/pɪɡ/' },
      { a: 'lock', b: 'log', aIpa: '/lɒk/', bIpa: '/lɒɡ/' },
      { a: 'duck', b: 'dug', aIpa: '/dʌk/', bIpa: '/dʌɡ/' },
    ],
  },
  {
    id: 'final-p-b',
    label: 'Âm cuối /p/ vs /b/',
    category: 'final',
    slugA: 'p',
    slugB: 'b',
    pairs: [
      { a: 'cap', b: 'cab', aIpa: '/kæp/', bIpa: '/kæb/' },
      { a: 'rope', b: 'robe', aIpa: '/rəʊp/', bIpa: '/rəʊb/' },
      { a: 'cup', b: 'cub', aIpa: '/kʌp/', bIpa: '/kʌb/' },
      { a: 'tap', b: 'tab', aIpa: '/tæp/', bIpa: '/tæb/' },
    ],
  },
];

/** Look up a set by id. */
export function getMinimalPairSet(id: string): MinimalPairSet | undefined {
  return MINIMAL_PAIR_SETS.find((s) => s.id === id);
}
