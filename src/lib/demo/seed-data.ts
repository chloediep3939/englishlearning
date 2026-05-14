// Pre-baked demo content. Hand-written so the demo endpoint can spin up a
// working account without any live API calls. `scripts/generate-demo-seed.ts`
// is the eventual successor — it can overwrite this file with a richer
// (~60-word) seed produced from real dictionary / Datamuse / Pexels / Gemini
// calls. Until then, this slim seed (12 cards, 2 passages) keeps the demo
// flow functional out of the box.

export interface DemoCardSeed {
  english: string;
  vn_meaning: string;
  ipa: string;
  part_of_speech: string | null;
  audio_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  collocations: string[];
  cloze_sentences: Array<{
    sentence: string;     // contains "__" where the blank is
    blank_word: string;   // the actual inflected form filling that blank
    pos?: string | null;
    difficulty?: string | null;
  }>;
}

export interface DemoDeckSeed {
  name: string;
  description: string;
  color: string;
  icon: string | null;          // lucide-react icon name (kept in sync with DECK_ICON_OPTIONS)
  subtitle: string | null;
  cards: DemoCardSeed[];
}

export interface DemoPassageSeed {
  title: string;
  content: string;
  source_label: string | null;
}

// ── Decks ───────────────────────────────────────────────────────────────────

export const DEMO_DECKS: DemoDeckSeed[] = [
  {
    name: 'Đời sống',
    description: 'Từ vựng A2–B1 cho cuộc sống hàng ngày',
    color: 'var(--v-green)',
    icon: 'Coffee',
    subtitle: 'Đời thường',
    cards: [
      {
        english: 'routine',
        vn_meaning: 'thói quen, lịch sinh hoạt',
        ipa: '/ruːˈtiːn/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['daily routine', 'morning routine', 'stick to a routine'],
        cloze_sentences: [
          { sentence: 'I follow the same morning __ every weekday.', blank_word: 'routine', pos: 'noun', difficulty: 'A2' },
          { sentence: 'A healthy __ can make you feel less stressed.', blank_word: 'routine', pos: 'noun', difficulty: 'B1' },
        ],
      },
      {
        english: 'weekend',
        vn_meaning: 'cuối tuần',
        ipa: '/ˈwiːk.end/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['long weekend', 'over the weekend', 'spend the weekend'],
        cloze_sentences: [
          { sentence: 'We usually go hiking on the __.', blank_word: 'weekend', pos: 'noun', difficulty: 'A2' },
          { sentence: 'It rained the whole __, so we stayed inside.', blank_word: 'weekend', pos: 'noun', difficulty: 'A2' },
        ],
      },
      {
        english: 'exercise',
        vn_meaning: 'tập thể dục; bài tập',
        ipa: '/ˈek.sə.saɪz/',
        part_of_speech: 'verb',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['exercise regularly', 'gentle exercise', 'exercise routine'],
        cloze_sentences: [
          { sentence: 'Doctors say you should __ at least three times a week.', blank_word: 'exercise', pos: 'verb', difficulty: 'B1' },
          { sentence: 'Try to __ outside when the weather is nice.', blank_word: 'exercise', pos: 'verb', difficulty: 'B1' },
        ],
      },
      {
        english: 'grateful',
        vn_meaning: 'biết ơn, trân trọng',
        ipa: '/ˈɡreɪt.fəl/',
        part_of_speech: 'adjective',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['grateful for', 'feel grateful', 'deeply grateful'],
        cloze_sentences: [
          { sentence: "I'm really __ for your help last week.", blank_word: 'grateful', pos: 'adjective', difficulty: 'B1' },
          { sentence: 'She felt __ to have such supportive friends.', blank_word: 'grateful', pos: 'adjective', difficulty: 'B1' },
        ],
      },
    ],
  },
  {
    name: 'Học thuật',
    description: 'Từ vựng B2 cho bài viết học thuật',
    color: 'var(--v-blue)',
    icon: 'GraduationCap',
    subtitle: 'Academic B2',
    cards: [
      {
        english: 'analyze',
        vn_meaning: 'phân tích',
        ipa: '/ˈæn.ə.laɪz/',
        part_of_speech: 'verb',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['analyze data', 'analyze in detail', 'carefully analyze'],
        cloze_sentences: [
          { sentence: 'Researchers __ the results before drawing any conclusions.', blank_word: 'analyze', pos: 'verb', difficulty: 'B2' },
          { sentence: 'You need to __ both sides of the argument.', blank_word: 'analyze', pos: 'verb', difficulty: 'B2' },
        ],
      },
      {
        english: 'evaluate',
        vn_meaning: 'đánh giá, lượng giá',
        ipa: '/ɪˈvæl.ju.eɪt/',
        part_of_speech: 'verb',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['evaluate the impact', 'critically evaluate', 'evaluate options'],
        cloze_sentences: [
          { sentence: 'It is important to __ the impact of new technology on society.', blank_word: 'evaluate', pos: 'verb', difficulty: 'B2' },
          { sentence: 'The committee will __ each proposal on its own merits.', blank_word: 'evaluate', pos: 'verb', difficulty: 'B2' },
        ],
      },
      {
        english: 'significant',
        vn_meaning: 'đáng kể, có ý nghĩa',
        ipa: '/sɪɡˈnɪf.ɪ.kənt/',
        part_of_speech: 'adjective',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['statistically significant', 'significant change', 'significant impact'],
        cloze_sentences: [
          { sentence: 'There was a __ improvement in test scores after the new method was used.', blank_word: 'significant', pos: 'adjective', difficulty: 'B2' },
          { sentence: 'Climate change has had a __ effect on local wildlife.', blank_word: 'significant', pos: 'adjective', difficulty: 'B2' },
        ],
      },
      {
        english: 'perspective',
        vn_meaning: 'góc nhìn, quan điểm',
        ipa: '/pəˈspek.tɪv/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['from a different perspective', 'historical perspective', 'put into perspective'],
        cloze_sentences: [
          { sentence: 'Travelling abroad gave me a new __ on my own culture.', blank_word: 'perspective', pos: 'noun', difficulty: 'B2' },
          { sentence: 'From an economic __, the proposal makes sense.', blank_word: 'perspective', pos: 'noun', difficulty: 'B2' },
        ],
      },
    ],
  },
  {
    name: 'Công việc',
    description: 'Từ vựng B1–B2 cho môi trường công sở',
    color: 'var(--v-pink)',
    icon: 'Briefcase',
    subtitle: 'Workplace',
    cards: [
      {
        english: 'meeting',
        vn_meaning: 'cuộc họp',
        ipa: '/ˈmiː.tɪŋ/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['attend a meeting', 'schedule a meeting', 'team meeting'],
        cloze_sentences: [
          { sentence: "I have a __ with my manager at 3pm.", blank_word: 'meeting', pos: 'noun', difficulty: 'A2' },
          { sentence: 'The __ ran longer than expected.', blank_word: 'meeting', pos: 'noun', difficulty: 'B1' },
        ],
      },
      {
        english: 'deadline',
        vn_meaning: 'hạn chót',
        ipa: '/ˈded.laɪn/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['meet a deadline', 'tight deadline', 'miss a deadline'],
        cloze_sentences: [
          { sentence: "We're working overtime to meet the __.", blank_word: 'deadline', pos: 'noun', difficulty: 'B1' },
          { sentence: 'The __ has been moved to next Friday.', blank_word: 'deadline', pos: 'noun', difficulty: 'B1' },
        ],
      },
      {
        english: 'collaborate',
        vn_meaning: 'cộng tác, hợp tác',
        ipa: '/kəˈlæb.ə.reɪt/',
        part_of_speech: 'verb',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['collaborate with', 'collaborate on a project', 'closely collaborate'],
        cloze_sentences: [
          { sentence: 'Our team often __ with designers in other offices.', blank_word: 'collaborates', pos: 'verb', difficulty: 'B2' },
          { sentence: 'They plan to __ on a new product launch next quarter.', blank_word: 'collaborate', pos: 'verb', difficulty: 'B2' },
        ],
      },
      {
        english: 'feedback',
        vn_meaning: 'phản hồi, góp ý',
        ipa: '/ˈfiːd.bæk/',
        part_of_speech: 'noun',
        audio_url: null,
        image_url: null,
        image_alt: null,
        collocations: ['give feedback', 'constructive feedback', 'positive feedback'],
        cloze_sentences: [
          { sentence: 'Thanks for the detailed __ on my draft.', blank_word: 'feedback', pos: 'noun', difficulty: 'B1' },
          { sentence: 'Honest __ helps the whole team improve.', blank_word: 'feedback', pos: 'noun', difficulty: 'B1' },
        ],
      },
    ],
  },
];

// ── Sample passages ────────────────────────────────────────────────────────

export const DEMO_PASSAGES: DemoPassageSeed[] = [
  {
    title: 'A simple morning',
    source_label: 'Bún demo',
    content:
      "Lan wakes up at six every morning. She drinks a glass of water and stretches for a few minutes before doing any work. After a quick breakfast — usually toast and an egg — she walks her dog around the small park near her house. By half past seven she is back home, ready to start the day. Lan says this simple routine gives her energy and helps her feel calm, even on busy days.",
  },
  {
    title: 'Why feedback matters at work',
    source_label: 'Bún demo',
    content:
      "Many people feel nervous when their manager asks for a quick chat. They worry that feedback means bad news. In healthy teams, however, feedback is just information — a way for colleagues to share what is working and what could be better. Useful feedback is specific, kind, and focused on actions you can change. When teams practise giving feedback openly, small problems get fixed early and trust grows. Over time, people stop fearing the word and start looking forward to it.",
  },
];

// Card status seeding plan — how many of the seeded cards should look
// "already studied" so the dashboard isn't all-new on first login. Index is
// the card's position in DEMO_DECKS[deckIdx].cards. Values: how many
// flashcard_reviews rows to insert + the resulting card status.
//
// We pick the first card of decks 0 and 1 to be `review`, second card of
// each to be `learning`, leaving the rest as `new`. Net result on a fresh
// demo dashboard: 4 learning + 4 review-or-new + visible streak of 1 day.
export const DEMO_SEED_HISTORY: ReadonlyArray<{
  deckIdx: number;
  cardIdx: number;
  status: 'learning' | 'review';
}> = [
  { deckIdx: 0, cardIdx: 0, status: 'review' },
  { deckIdx: 0, cardIdx: 1, status: 'learning' },
  { deckIdx: 1, cardIdx: 0, status: 'review' },
  { deckIdx: 1, cardIdx: 1, status: 'learning' },
];
