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
  {
    id: 'b-v',
    category: 'consonant',
    label: '/b/ vs /v/ — bat vs vat',
    slugA: 'b',
    slugB: 'v',
    pairs: [
      { a: 'bat', b: 'vat', aIpa: '/bæt/', bIpa: '/væt/' },
      { a: 'berry', b: 'very', aIpa: '/ˈberi/', bIpa: '/ˈveri/' },
      { a: 'boat', b: 'vote', aIpa: '/bəʊt/', bIpa: '/vəʊt/' },
      { a: 'ban', b: 'van', aIpa: '/bæn/', bIpa: '/væn/' },
      { a: 'best', b: 'vest', aIpa: '/best/', bIpa: '/vest/' },
      { a: 'curb', b: 'curve', aIpa: '/kɜːb/', bIpa: '/kɜːv/' },
    ],
  },
  {
    id: 'p-b',
    category: 'consonant',
    label: '/p/ vs /b/ — pat vs bat',
    slugA: 'p',
    slugB: 'b',
    pairs: [
      { a: 'pat', b: 'bat', aIpa: '/pæt/', bIpa: '/bæt/' },
      { a: 'pin', b: 'bin', aIpa: '/pɪn/', bIpa: '/bɪn/' },
      { a: 'pack', b: 'back', aIpa: '/pæk/', bIpa: '/bæk/' },
      { a: 'pull', b: 'bull', aIpa: '/pʊl/', bIpa: '/bʊl/' },
      { a: 'pig', b: 'big', aIpa: '/pɪɡ/', bIpa: '/bɪɡ/' },
      { a: 'peach', b: 'beach', aIpa: '/piːtʃ/', bIpa: '/biːtʃ/' },
    ],
  },
  {
    id: 't-d',
    category: 'consonant',
    label: '/t/ vs /d/ — tie vs die',
    slugA: 't',
    slugB: 'd',
    pairs: [
      { a: 'tie', b: 'die', aIpa: '/taɪ/', bIpa: '/daɪ/' },
      { a: 'town', b: 'down', aIpa: '/taʊn/', bIpa: '/daʊn/' },
      { a: 'ten', b: 'den', aIpa: '/ten/', bIpa: '/den/' },
      { a: 'tip', b: 'dip', aIpa: '/tɪp/', bIpa: '/dɪp/' },
      { a: 'time', b: 'dime', aIpa: '/taɪm/', bIpa: '/daɪm/' },
      { a: 'try', b: 'dry', aIpa: '/traɪ/', bIpa: '/draɪ/' },
    ],
  },
  {
    id: 'k-g',
    category: 'consonant',
    label: '/k/ vs /g/ — came vs game',
    slugA: 'k',
    slugB: 'g',
    pairs: [
      { a: 'came', b: 'game', aIpa: '/keɪm/', bIpa: '/ɡeɪm/' },
      { a: 'coat', b: 'goat', aIpa: '/kəʊt/', bIpa: '/ɡəʊt/' },
      { a: 'class', b: 'glass', aIpa: '/klɑːs/', bIpa: '/ɡlɑːs/' },
      { a: 'curl', b: 'girl', aIpa: '/kɜːl/', bIpa: '/ɡɜːl/' },
      { a: 'cold', b: 'gold', aIpa: '/kəʊld/', bIpa: '/ɡəʊld/' },
      { a: 'could', b: 'good', aIpa: '/kʊd/', bIpa: '/ɡʊd/' },
    ],
  },
  {
    id: 's-z',
    category: 'consonant',
    label: '/s/ vs /z/ — sip vs zip',
    slugA: 's',
    slugB: 'z',
    pairs: [
      { a: 'sip', b: 'zip', aIpa: '/sɪp/', bIpa: '/zɪp/' },
      { a: 'sue', b: 'zoo', aIpa: '/suː/', bIpa: '/zuː/' },
      { a: 'seal', b: 'zeal', aIpa: '/siːl/', bIpa: '/ziːl/' },
      { a: 'sink', b: 'zinc', aIpa: '/sɪŋk/', bIpa: '/zɪŋk/' },
    ],
  },
  {
    id: 'n-ng',
    category: 'consonant',
    label: '/n/ vs /ŋ/ — thin vs thing',
    slugA: 'n',
    slugB: 'ng',
    pairs: [
      { a: 'thin', b: 'thing', aIpa: '/θɪn/', bIpa: '/θɪŋ/' },
      { a: 'sin', b: 'sing', aIpa: '/sɪn/', bIpa: '/sɪŋ/' },
      { a: 'win', b: 'wing', aIpa: '/wɪn/', bIpa: '/wɪŋ/' },
      { a: 'ban', b: 'bang', aIpa: '/bæn/', bIpa: '/bæŋ/' },
      { a: 'run', b: 'rung', aIpa: '/rʌn/', bIpa: '/rʌŋ/' },
      { a: 'ton', b: 'tongue', aIpa: '/tʌn/', bIpa: '/tʌŋ/' },
    ],
  },
  {
    id: 'w-r',
    category: 'consonant',
    label: '/w/ vs /r/ — west vs rest',
    slugA: 'w',
    slugB: 'r',
    pairs: [
      { a: 'west', b: 'rest', aIpa: '/west/', bIpa: '/rest/' },
      { a: 'wing', b: 'ring', aIpa: '/wɪŋ/', bIpa: '/rɪŋ/' },
      { a: 'wide', b: 'ride', aIpa: '/waɪd/', bIpa: '/raɪd/' },
      { a: 'wed', b: 'red', aIpa: '/wed/', bIpa: '/red/' },
      { a: 'wake', b: 'rake', aIpa: '/weɪk/', bIpa: '/reɪk/' },
      { a: 'way', b: 'ray', aIpa: '/weɪ/', bIpa: '/reɪ/' },
    ],
  },
  {
    id: 'oh-ou',
    category: 'vowel',
    label: '/ɒ/ vs /əʊ/ — not vs note',
    slugA: 'oh',
    slugB: 'ou',
    pairs: [
      { a: 'not', b: 'note', aIpa: '/nɒt/', bIpa: '/nəʊt/' },
      { a: 'cost', b: 'coast', aIpa: '/kɒst/', bIpa: '/kəʊst/' },
      { a: 'cod', b: 'code', aIpa: '/kɒd/', bIpa: '/kəʊd/' },
      { a: 'God', b: 'goad', aIpa: '/ɡɒd/', bIpa: '/ɡəʊd/' },
      { a: 'want', b: "won't", aIpa: '/wɒnt/', bIpa: '/wəʊnt/' },
    ],
  },
  {
    id: 'aw-ou',
    category: 'vowel',
    label: '/ɔː/ vs /əʊ/ — bought vs boat',
    slugA: 'aw',
    slugB: 'ou',
    pairs: [
      { a: 'bought', b: 'boat', aIpa: '/bɔːt/', bIpa: '/bəʊt/' },
      { a: 'caught', b: 'coat', aIpa: '/kɔːt/', bIpa: '/kəʊt/' },
      { a: 'ball', b: 'bowl', aIpa: '/bɔːl/', bIpa: '/bəʊl/' },
      { a: 'saw', b: 'so', aIpa: '/sɔː/', bIpa: '/səʊ/' },
      { a: 'law', b: 'low', aIpa: '/lɔː/', bIpa: '/ləʊ/' },
    ],
  },
  {
    id: 'ae-aa',
    category: 'vowel',
    label: '/æ/ vs /ɑː/ — cat vs cart',
    slugA: 'ae',
    slugB: 'aa',
    pairs: [
      { a: 'cat', b: 'cart', aIpa: '/kæt/', bIpa: '/kɑːt/' },
      { a: 'hat', b: 'heart', aIpa: '/hæt/', bIpa: '/hɑːt/' },
      { a: 'bad', b: 'bard', aIpa: '/bæd/', bIpa: '/bɑːd/' },
      { a: 'pack', b: 'park', aIpa: '/pæk/', bIpa: '/pɑːk/' },
      { a: 'cap', b: 'carp', aIpa: '/kæp/', bIpa: '/kɑːp/' },
      { a: 'match', b: 'march', aIpa: '/mætʃ/', bIpa: '/mɑːtʃ/' },
    ],
  },
  {
    id: 'ei-eh',
    category: 'vowel',
    label: '/eɪ/ vs /e/ — late vs let',
    slugA: 'ei',
    slugB: 'eh',
    pairs: [
      { a: 'late', b: 'let', aIpa: '/leɪt/', bIpa: '/let/' },
      { a: 'taste', b: 'test', aIpa: '/teɪst/', bIpa: '/test/' },
      { a: 'main', b: 'men', aIpa: '/meɪn/', bIpa: '/men/' },
      { a: 'wait', b: 'wet', aIpa: '/weɪt/', bIpa: '/wet/' },
      { a: 'gate', b: 'get', aIpa: '/ɡeɪt/', bIpa: '/ɡet/' },
      { a: 'pain', b: 'pen', aIpa: '/peɪn/', bIpa: '/pen/' },
    ],
  },
  {
    id: 'ia-ea',
    category: 'vowel',
    label: '/ɪə/ vs /eə/ — here vs hair',
    slugA: 'ia',
    slugB: 'ea',
    pairs: [
      { a: 'here', b: 'hair', aIpa: '/hɪə/', bIpa: '/heə/' },
      { a: 'beer', b: 'bear', aIpa: '/bɪə/', bIpa: '/beə/' },
      { a: 'ear', b: 'air', aIpa: '/ɪə/', bIpa: '/eə/' },
      { a: 'cheer', b: 'chair', aIpa: '/tʃɪə/', bIpa: '/tʃeə/' },
      { a: 'fear', b: 'fair', aIpa: '/fɪə/', bIpa: '/feə/' },
    ],
  },
];

/** Look up a set by id. */
export function getMinimalPairSet(id: string): MinimalPairSet | undefined {
  return MINIMAL_PAIR_SETS.find((s) => s.id === id);
}

/** All sets that contrast the given sound (as slugA or slugB). */
export function getMinimalPairSetsForSlug(slug: string): MinimalPairSet[] {
  return MINIMAL_PAIR_SETS.filter((s) => s.slugA === slug || s.slugB === slug);
}
