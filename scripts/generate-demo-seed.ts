// One-time dev script: regenerate src/lib/demo/seed-data.ts from live APIs.
//
// Run with:
//   GEMINI_API_KEY=sk-... npx -y tsx scripts/generate-demo-seed.ts
//
// Requires (or gracefully degrades when missing):
//   GEMINI_API_KEY  — cloze sentences (without it, cloze_sentences will be [])
//   PEXELS_API_KEY  — card images (without it, image_url stays null)
//
// Pure Node + direct fetch — we deliberately avoid importing from
// @/lib/flashcards/* because those modules expect a Cloudflare Workers
// context (getCloudflareContext) that doesn't exist in tsx.
//
// Output: overwrites src/lib/demo/seed-data.ts in place. The hand-written
// seed shipped in that file becomes the fallback if you don't run this
// script — the file is committed either way.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Word lists (from src/doc/prompts/demo-feedback.md §2) ───────────────────

const WORDLISTS = [
  {
    deck: {
      name: 'Đời sống',
      description: 'Từ vựng A2–B1 cho cuộc sống hàng ngày',
      color: 'var(--v-green)',
      icon: 'Coffee',
      subtitle: 'Đời thường',
    },
    words: [
      'routine', 'schedule', 'habit', 'weekend', 'breakfast', 'traffic',
      'hobby', 'neighbor', 'weather', 'exercise', 'sleepy', 'anxious',
      'grateful', 'lonely', 'cheerful', 'organize', 'prepare', 'complain',
      'enjoy', 'relax',
    ],
  },
  {
    deck: {
      name: 'Học thuật',
      description: 'Từ vựng B2 cho bài viết học thuật',
      color: 'var(--v-blue)',
      icon: 'GraduationCap',
      subtitle: 'Academic B2',
    },
    words: [
      'comprehensive', 'ambiguous', 'paradigm', 'hypothesis', 'analyze',
      'methodology', 'significant', 'contradict', 'evaluate', 'demonstrate',
      'fluctuate', 'correlate', 'implication', 'perspective', 'presumption',
      'abstract', 'concrete', 'derive', 'illustrate', 'undermine',
    ],
  },
  {
    deck: {
      name: 'Công việc',
      description: 'Từ vựng B1–B2 cho môi trường công sở',
      color: 'var(--v-pink)',
      icon: 'Briefcase',
      subtitle: 'Workplace',
    },
    words: [
      'meeting', 'deadline', 'deliverable', 'agenda', 'stakeholder',
      'client', 'proposal', 'budget', 'negotiate', 'collaborate',
      'prioritize', 'escalate', 'delegate', 'mentor', 'feedback',
      'performance', 'productive', 'professional', 'network', 'promotion',
    ],
  },
];

// Two short passages — manually authored. The script does NOT regenerate
// these, only the cards. Edit DEMO_PASSAGES in src/lib/demo/seed-data.ts
// directly if you want to change them.
const PASSAGES_LITERAL = `[
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
]`;

// ── API helpers ─────────────────────────────────────────────────────────────

interface IpaResult {
  ipa: string;
  audio_url: string | null;
  part_of_speech: string | null;
}

async function fetchIpaAndPos(word: string): Promise<IpaResult> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return { ipa: '', audio_url: null, part_of_speech: null };
    const data = (await res.json()) as Array<{
      phonetic?: string;
      phonetics?: Array<{ text?: string; audio?: string }>;
      meanings?: Array<{ partOfSpeech?: string }>;
    }>;
    const first = data?.[0];
    const phonetic =
      first?.phonetic ||
      first?.phonetics?.find((p) => p.text)?.text ||
      '';
    const audio = first?.phonetics?.find((p) => p.audio)?.audio || null;
    const pos = first?.meanings?.[0]?.partOfSpeech ?? null;
    return { ipa: phonetic, audio_url: audio, part_of_speech: pos };
  } catch {
    return { ipa: '', audio_url: null, part_of_speech: null };
  }
}

async function translateEnToVi(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return '';
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    return data.responseData?.translatedText?.trim() ?? '';
  } catch {
    return '';
  }
}

async function fetchCollocations(word: string): Promise<string[]> {
  // Datamuse: top 6 words that frequently follow `word` + top 6 that precede.
  // Cheap-and-good approximation of collocations.
  async function side(param: 'lc' | 'rc'): Promise<string[]> {
    try {
      const res = await fetch(
        `https://api.datamuse.com/words?${param}=${encodeURIComponent(word)}&max=6`,
      );
      if (!res.ok) return [];
      const data = (await res.json()) as Array<{ word: string }>;
      return data.map((d) => d.word).filter(Boolean);
    } catch {
      return [];
    }
  }
  const [right, left] = await Promise.all([side('rc'), side('lc')]);
  const phrases: string[] = [];
  for (const w of left.slice(0, 3)) phrases.push(`${w} ${word}`);
  for (const w of right.slice(0, 3)) phrases.push(`${word} ${w}`);
  return phrases;
}

interface ClozeSeedSentence {
  sentence: string;
  blank_word: string;
  pos: string | null;
  difficulty: string | null;
}

async function generateClozeSentences(word: string, geminiKey: string): Promise<ClozeSeedSentence[]> {
  const prompt = `Generate exactly 10 fill-in-blank sentences using the English word "${word}".
Each sentence must contain "${word}" (or an inflected form of it) replaced by __ (two underscores).
Vary contexts (work, school, daily life, news, casual) and CEFR levels (mix B1, B2, C1).
Return ONLY a JSON array — no markdown fences, no prose:
[{"sentence": "She received __ treatment from the staff.", "blank_word": "preferential", "pos": "adj", "difficulty": "B2"}, ...]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.85,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok) {
      console.warn(`  [gemini] HTTP ${res.status} for "${word}"`);
      return [];
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as Array<{
      sentence?: string;
      blank_word?: string;
      pos?: string;
      difficulty?: string;
    }>;
    return parsed
      .filter((s) => typeof s.sentence === 'string' && typeof s.blank_word === 'string' && s.sentence.includes('__'))
      .slice(0, 10)
      .map((s) => ({
        sentence: s.sentence as string,
        blank_word: s.blank_word as string,
        pos: typeof s.pos === 'string' ? s.pos : null,
        difficulty: typeof s.difficulty === 'string' ? s.difficulty : null,
      }));
  } catch (err) {
    console.warn(`  [gemini] error for "${word}":`, (err as Error).message);
    return [];
  }
}

async function fetchPexelsImage(query: string, pexelsKey: string): Promise<{ url: string; alt: string } | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      { headers: { Authorization: pexelsKey } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: Array<{ src?: { medium?: string }; alt?: string }>;
    };
    const photo = data.photos?.[0];
    const url = photo?.src?.medium;
    if (!url) return null;
    return { url, alt: photo?.alt || query };
  } catch {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

interface BuiltCard {
  english: string;
  vn_meaning: string;
  ipa: string;
  part_of_speech: string | null;
  audio_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  collocations: string[];
  cloze_sentences: ClozeSeedSentence[];
}

async function buildCard(word: string, geminiKey: string | null, pexelsKey: string | null): Promise<BuiltCard> {
  process.stdout.write(`  · ${word.padEnd(16)} `);
  const [ipa, vn, collocations, clozes, image] = await Promise.all([
    fetchIpaAndPos(word),
    translateEnToVi(word),
    fetchCollocations(word),
    geminiKey ? generateClozeSentences(word, geminiKey) : Promise.resolve([] as ClozeSeedSentence[]),
    pexelsKey ? fetchPexelsImage(word, pexelsKey) : Promise.resolve(null),
  ]);
  process.stdout.write(`ipa:${ipa.ipa ? 'Y' : '·'} vn:${vn ? 'Y' : '·'} cloze:${clozes.length} colloc:${collocations.length} img:${image ? 'Y' : '·'}\n`);
  return {
    english: word,
    vn_meaning: vn || word,
    ipa: ipa.ipa,
    part_of_speech: ipa.part_of_speech,
    audio_url: ipa.audio_url,
    image_url: image?.url ?? null,
    image_alt: image?.alt ?? null,
    collocations,
    cloze_sentences: clozes,
  };
}

function serializeDeck(deckMeta: typeof WORDLISTS[number]['deck'], cards: BuiltCard[]): string {
  const cardsTs = cards
    .map((c) => {
      const colloc = JSON.stringify(c.collocations);
      const cloze = JSON.stringify(c.cloze_sentences, null, 2)
        .split('\n')
        .map((l, i) => (i === 0 ? l : '        ' + l))
        .join('\n');
      return `      {
        english: ${JSON.stringify(c.english)},
        vn_meaning: ${JSON.stringify(c.vn_meaning)},
        ipa: ${JSON.stringify(c.ipa)},
        part_of_speech: ${JSON.stringify(c.part_of_speech)},
        audio_url: ${JSON.stringify(c.audio_url)},
        image_url: ${JSON.stringify(c.image_url)},
        image_alt: ${JSON.stringify(c.image_alt)},
        collocations: ${colloc},
        cloze_sentences: ${cloze},
      }`;
    })
    .join(',\n');
  return `  {
    name: ${JSON.stringify(deckMeta.name)},
    description: ${JSON.stringify(deckMeta.description)},
    color: ${JSON.stringify(deckMeta.color)},
    icon: ${JSON.stringify(deckMeta.icon)},
    subtitle: ${JSON.stringify(deckMeta.subtitle)},
    cards: [
${cardsTs}
    ],
  }`;
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const pexelsKey = process.env.PEXELS_API_KEY?.trim() || null;

  if (!geminiKey) {
    console.warn('⚠  GEMINI_API_KEY not set — cloze_sentences will be empty.');
  }
  if (!pexelsKey) {
    console.warn('⚠  PEXELS_API_KEY not set — image_url stays null.');
  }

  const decks: string[] = [];
  for (const { deck, words } of WORDLISTS) {
    console.log(`\n▸ ${deck.name} (${words.length} words)`);
    const built: BuiltCard[] = [];
    // Serial-per-deck to keep API limits friendly; parallel within each card.
    for (const word of words) {
      built.push(await buildCard(word, geminiKey, pexelsKey));
    }
    decks.push(serializeDeck(deck, built));
  }

  // Pull in the static-shape preamble from the existing seed-data.ts so we
  // don't lose the interface declarations or DEMO_SEED_HISTORY.
  const fileHeader = `// Auto-generated by scripts/generate-demo-seed.ts at ${new Date().toISOString()}.
// Edit the script (not this file) when you want different content.

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
    sentence: string;
    blank_word: string;
    pos?: string | null;
    difficulty?: string | null;
  }>;
}

export interface DemoDeckSeed {
  name: string;
  description: string;
  color: string;
  icon: string | null;
  subtitle: string | null;
  cards: DemoCardSeed[];
}

export interface DemoPassageSeed {
  title: string;
  content: string;
  source_label: string | null;
}

export const DEMO_DECKS: DemoDeckSeed[] = [
${decks.join(',\n')}
];

export const DEMO_PASSAGES: DemoPassageSeed[] = ${PASSAGES_LITERAL};

// Same history-seeding plan as the hand-written file. Card indices refer to
// the first 2 cards in decks 0 and 1; tweak if you reshuffle word lists.
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
`;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const out = path.resolve(__dirname, '..', 'src', 'lib', 'demo', 'seed-data.ts');
  await fs.writeFile(out, fileHeader, 'utf8');
  console.log(`\n✓ wrote ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
